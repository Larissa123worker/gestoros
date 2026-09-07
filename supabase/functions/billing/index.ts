import { corsHeaders, json } from "../_shared/cors.ts";
import {
  createCustomer,
  createSubscription,
  deleteSubscription,
  getPayment,
  getPaymentPixQrCode,
  getSubscription,
  listSubscriptionPayments,
  updateSubscription,
  type BillingType,
  type Cycle,
} from "../_shared/asaas.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";
import { isValidCpfCnpj } from "../_shared/validation.ts";

function isoDateAfterDays(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

function getIdempotencyKey(req: Request, body: Record<string, unknown>): string | null {
  const header = req.headers.get("idempotency-key");
  if (header && header.length <= 120) return header.trim();
  const fromBody = body.idempotencyKey;
  return typeof fromBody === "string" && fromBody.length <= 120 ? fromBody.trim() : null;
}

function planMonthlyEquivalent(plan: { monthly_amount?: unknown; annual_amount?: unknown }, cycle: "MONTHLY" | "YEARLY") {
  if (cycle === "MONTHLY") return Number(plan.monthly_amount ?? 0);
  return Number(plan.annual_amount ?? 0) / 12;
}

function pendingPayment(paymentsList: { data: Record<string, unknown>[] }) {
  const paid = new Set(["RECEIVED", "CONFIRMED", "REFUNDED"]);
  return paymentsList.data.find((payment) => !paid.has(String(payment.status))) ?? null;
}

function buildUpgradeKey(companyId: string, planId: string, cycle: Cycle, billingType: BillingType) {
  return `${companyId}:${planId}:${cycle}:${billingType}`;
}

async function getCachedResult(db: ReturnType<typeof adminClient>, key: string) {
  const { data } = await db.from("billing_idempotency").select("response, expires_at").eq("key", key).maybeSingle();
  if (!data?.response) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.response;
}

async function saveCachedResult(db: ReturnType<typeof adminClient>, key: string, response: unknown, ttlSeconds = 600) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await db.from("billing_idempotency").upsert({
    key,
    response,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
}

async function cancelLocalSubscription(db: ReturnType<typeof adminClient>, local: { id: string; asaas_subscription_id?: string | null }, reason: string) {
  if (local.asaas_subscription_id) {
    try {
      await deleteSubscription(local.asaas_subscription_id);
    } catch (error) {
      console.error("Falha ao cancelar assinatura no Asaas durante", reason, error);
    }
  }
  await db.from("company_subscriptions").update({
    status: "canceled",
    asaas_subscription_id: null,
    updatedAt: new Date().toISOString(),
  }).eq("id", local.id);
}

async function startFreshSubscription(params: {
  db: ReturnType<typeof adminClient>;
  company: Record<string, any>;
  customer: { id: string };
  plan: Record<string, any>;
  cycle: Cycle;
  value: number;
  billingType: BillingType;
  card?: Record<string, unknown>;
  remoteIp: string;
  userEmail: string;
}) {
  const { db, company, customer, plan, cycle, value, billingType, card, remoteIp, userEmail } = params;
  const subscriptionPayload: Record<string, unknown> = {
    customer: customer.id,
    billingType,
    value,
    cycle,
    nextDueDate: billingType === "CREDIT_CARD" ? isoDateAfterDays(0) : isoDateAfterDays(1),
    description: `${plan.name} - Gestor OS`,
    externalReference: String(company.id),
  };
  if (billingType === "CREDIT_CARD" && card?.number) {
    subscriptionPayload.creditCard = {
      holderName: card.holderName,
      number: card.number,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      ccv: card.ccv,
    };
    subscriptionPayload.creditCardHolderInfo = {
      name: card.holderName,
      email: card.holderEmail || userEmail,
      cpfCnpj: card.holderCpfCnpj,
      postalCode: card.holderPostalCode,
      addressNumber: card.holderAddressNumber,
      phone: card.holderPhone,
    };
    subscriptionPayload.remoteIp = remoteIp;
  }
  console.log("Billing subscribe payload:", JSON.stringify({
    planId: plan.id,
    cycle,
    billingType,
    subscriptionPayload: { ...subscriptionPayload, creditCard: undefined, creditCardHolderInfo: undefined },
  }));
  const created = await createSubscription(subscriptionPayload);

  let invoiceUrl: string | null = null;
  let paymentId: string | null = null;
  let pixQrCode: any = null;
  let initialStatus = "pending";
  try {
    const paymentsList = await listSubscriptionPayments(created.id);
    if (paymentsList?.data?.length) {
      const firstPayment = paymentsList.data[0];
      paymentId = String(firstPayment.id);
      invoiceUrl = (firstPayment as { invoiceUrl?: string }).invoiceUrl ?? null;
      if (["RECEIVED", "CONFIRMED"].includes(String(firstPayment.status))) initialStatus = "active";
      if (billingType === "PIX") {
        for (let attempt = 1; attempt <= 5; attempt += 1) {
          try {
            pixQrCode = await getPaymentPixQrCode(paymentId);
            if (pixQrCode?.encodedImage || pixQrCode?.payload) break;
          } catch (error) {
            console.error("PIX QR error attempt", attempt, error);
          }
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }
  } catch (error) {
    console.error("Erro ao obter dados do pagamento:", error);
  }

  const upsertPayload = {
    company_id: company.id,
    plan_id: plan.id,
    plan: plan.name,
    cycle,
    amount: value,
    billing_type: billingType,
    asaas_customer_id: customer.id,
    asaas_subscription_id: created.id,
    status: initialStatus,
    next_billing_at: (created as { nextDueDate?: string }).nextDueDate ?? null,
    trial_ends_at: null,
    updatedAt: new Date().toISOString(),
  };

  const { data: saved, error: saveError } = await db.from("company_subscriptions").upsert(
    { ...upsertPayload, id: `sub-${company.id}` },
    { onConflict: "company_id" },
  ).select().single();
  if (saveError) throw saveError;
  return { subscription: saved, asaas: created, invoiceUrl, paymentId, pixQrCode };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = req.method === "POST" ? await req.json() : {};
    const action = body.action ?? new URL(req.url).searchParams.get("action") ?? "plans";
    const db = adminClient();

    if (action === "plans") {
      const { data, error } = await db.from("billing_plans").select("id, slug, name, description, monthly_amount, annual_amount, max_employees").eq("active", "true").order("monthly_amount", { ascending: true });
      if (error) throw error;
      return json(data ?? []);
    }

    const user = await requireUser(req);
    const { data: company, error: companyError } = await db.from("company_profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (companyError || !company) return json({ error: "Empresa não encontrada." }, 404);

    if (action === "account") {
      const { data: subscription } = await db.from("company_subscriptions").select("*").eq("company_id", company.id).maybeSingle();
      let payments: unknown[] = [];
      if (subscription?.asaas_subscription_id) {
        const result = await listSubscriptionPayments(subscription.asaas_subscription_id);
        payments = result.data ?? [];
      }
      return json({ company, subscription, payments });
    }

    if (action === "pix-qrcode") {
      if (!body.paymentId) return json({ error: "paymentId é obrigatório." }, 400);
      const local = await localSubscriptionForCompany(db, company.id);
      if (!local?.asaas_subscription_id) return json({ error: "Assinatura não encontrada." }, 404);
      const payments = await listSubscriptionPayments(local.asaas_subscription_id);
      if (!payments.data.some((payment) => payment.id === body.paymentId)) return json({ error: "Cobrança não pertence à empresa." }, 403);
      return json(await getPaymentPixQrCode(body.paymentId));
    }

    if (["subscription", "payments", "payment", "update-subscription", "cancel-subscription"].includes(action)) {
      const local = await localSubscriptionForCompany(db, company.id);
      if (!local?.asaas_subscription_id) return json({ error: "Assinatura não encontrada." }, 404);
      if (action === "subscription") return json(await getSubscription(local.asaas_subscription_id));
      if (action === "payments") return json(await listSubscriptionPayments(local.asaas_subscription_id, body.status));
      if (action === "payment") {
        if (!body.paymentId) return json({ error: "paymentId é obrigatório." }, 400);
        const payments = await listSubscriptionPayments(local.asaas_subscription_id);
        if (!payments.data.some((payment) => payment.id === body.paymentId)) return json({ error: "Cobrança não pertence à empresa." }, 403);
        return json(await getPayment(body.paymentId));
      }
      if (action === "cancel-subscription") {
        await cancelLocalSubscription(db, { id: local.id, asaas_subscription_id: local.asaas_subscription_id }, "cancel-subscription");
        return json({ canceled: true });
      }
      const update = body.update ?? {};
      const updated = await updateSubscription(local.asaas_subscription_id, update);
      return json(updated);
    }

    if (action !== "subscribe") return json({ error: "Ação inválida." }, 400);

    const planId = String(body.planId ?? "");
    const billingCycle = body.billingCycle as "monthly" | "annual";
    const billingType = body.billingType as BillingType;
    if (!planId || !["monthly", "annual"].includes(billingCycle) || !["PIX", "CREDIT_CARD"].includes(billingType)) {
      return json({ error: "Plano, ciclo e forma de pagamento são obrigatórios." }, 400);
    }

    const { data: plan, error: planError } = await db.from("billing_plans").select("*").eq("id", planId).eq("active", "true").single();
    if (planError || !plan) return json({ error: "Plano não encontrado." }, 404);

    const { data: current } = await db.from("company_subscriptions").select("*").eq("company_id", company.id).maybeSingle();
    const cycle: Cycle = billingCycle === "annual" ? "YEARLY" : "MONTHLY";
    const value = Number(billingCycle === "annual" ? plan.annual_amount : plan.monthly_amount);

    const idempotencyKey = getIdempotencyKey(req, body);
    const cacheKey = idempotencyKey ? `idem:${idempotencyKey}` : null;
    if (cacheKey) {
      const cached = await getCachedResult(db, cacheKey);
      if (cached) return json(cached);
    }
    const upgradeKey = buildUpgradeKey(company.id, plan.id, cycle, billingType);
    const upgradeCached = await getCachedResult(db, `upgrade:${upgradeKey}`);
    if (upgradeCached) return json(upgradeCached);

    if (current?.status === "active" && current.asaas_subscription_id && current.plan_id) {
      const { data: currentPlan } = await db.from("billing_plans").select("*").eq("id", current.plan_id).maybeSingle();
      const currentCycle = (current.cycle as Cycle) ?? "MONTHLY";
      const currentMonthly = currentPlan ? planMonthlyEquivalent(currentPlan, currentCycle) : 0;
      const targetMonthly = planMonthlyEquivalent(plan, cycle);

      if (current.plan_id === plan.id && currentCycle === cycle && current.billing_type === billingType) {
        return json({ error: "A empresa já está neste plano." }, 409);
      }
      if (targetMonthly < currentMonthly - 0.01) {
        return json({ error: "Downgrade não é permitido pelo upgrade. Cancele a assinatura e crie uma nova." }, 409);
      }

      const needsRecreate =
        currentCycle !== cycle ||
        current.billing_type !== billingType ||
        (current.plan_id === plan.id && currentCycle !== cycle);

      if (needsRecreate) {
        const cleanDocument = (company.document || "").replace(/\D/g, "");
        const cleanMobile = (company.mobilePhone || company.phone || "").replace(/\D/g, "");
        if (!isValidCpfCnpj(cleanDocument)) return json({ error: "CPF/CNPJ inválido." }, 400);
        if (!cleanMobile || ![10, 11].includes(cleanMobile.length)) return json({ error: "Telefone da empresa é inválido ou não informado." }, 400);

        const customer = current.asaas_customer_id
          ? { id: current.asaas_customer_id }
          : await createCustomer(buildCustomerPayload(company, user.email));

        await cancelLocalSubscription(db, { id: current.id, asaas_subscription_id: current.asaas_subscription_id }, "upgrade-recreate");

        const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
        const result = await startFreshSubscription({
          db,
          company,
          customer,
          plan,
          cycle,
          value,
          billingType,
          card: body.card,
          remoteIp,
          userEmail: user.email,
        });
        if (cacheKey) await saveCachedResult(db, cacheKey, result);
        await saveCachedResult(db, `upgrade:${upgradeKey}`, result);
        return json(result, 201);
      }

      const updated = await updateSubscription(current.asaas_subscription_id, {
        value,
        cycle,
        description: `${plan.name} - Gestor OS`,
      });
      const paymentsList = await listSubscriptionPayments(current.asaas_subscription_id);
      const payment = pendingPayment(paymentsList);
      let invoiceUrl: string | null = null;
      let paymentId: string | null = null;
      let pixQrCode: any = null;
      if (payment?.id) {
        paymentId = String(payment.id);
        invoiceUrl = (payment as { invoiceUrl?: string }).invoiceUrl ?? null;
        if (billingType === "PIX") {
          try {
            pixQrCode = await getPaymentPixQrCode(paymentId);
          } catch (error) {
            console.error("Erro ao gerar QR PIX do upgrade:", error);
          }
        }
      }
      const { data: saved, error: saveError } = await db.from("company_subscriptions").update({
        plan_id: plan.id,
        plan: plan.name,
        cycle,
        billing_type: billingType,
        amount: value,
        next_billing_at: (updated as { nextDueDate?: string }).nextDueDate ?? current.next_billing_at ?? null,
        trial_ends_at: current.trial_ends_at ?? null,
        updatedAt: new Date().toISOString(),
      }).eq("id", current.id).select().single();
      if (saveError) throw saveError;
      const result = { subscription: saved, asaas: updated, invoiceUrl, paymentId, pixQrCode };
      if (cacheKey) await saveCachedResult(db, cacheKey, result);
      await saveCachedResult(db, `upgrade:${upgradeKey}`, result);
      return json(result);
    }

    if (current?.status === "pending" && current.asaas_subscription_id) {
      const sameSubscription = current.plan_id === plan.id && current.cycle === cycle && current.billing_type === billingType;
      if (sameSubscription) {
        const existingSubscription = await getSubscription(current.asaas_subscription_id);
        const paymentsList = await listSubscriptionPayments(current.asaas_subscription_id);
        const payment = pendingPayment(paymentsList);
        let pixQrCode: any = null;
        if (billingType === "PIX" && payment?.id) {
          try {
            pixQrCode = await getPaymentPixQrCode(String(payment.id));
          } catch (error) {
            console.error("Erro ao atualizar QR PIX existente:", error);
          }
        }
        return json({
          subscription: current,
          asaas: existingSubscription,
          invoiceUrl: (payment as { invoiceUrl?: string } | null)?.invoiceUrl ?? null,
          paymentId: payment?.id ? String(payment.id) : null,
          pixQrCode,
        });
      }
      await cancelLocalSubscription(db, { id: current.id, asaas_subscription_id: current.asaas_subscription_id }, "pending-rotate");
    }

    const cleanDocument = (company.document || "").replace(/\D/g, "");
    const cleanMobile = (company.mobilePhone || company.phone || "").replace(/\D/g, "");
    if (!isValidCpfCnpj(cleanDocument)) return json({ error: "CPF/CNPJ inválido." }, 400);
    if (!cleanMobile || ![10, 11].includes(cleanMobile.length)) return json({ error: "Telefone da empresa é inválido ou não informado." }, 400);

    const customer = current?.asaas_customer_id
      ? { id: current.asaas_customer_id }
      : await createCustomer(buildCustomerPayload(company, user.email));

    const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const result = await startFreshSubscription({
      db,
      company,
      customer,
      plan,
      cycle,
      value,
      billingType,
      card: body.card,
      remoteIp,
      userEmail: user.email,
    });
    if (cacheKey) await saveCachedResult(db, cacheKey, result);
    await saveCachedResult(db, `upgrade:${upgradeKey}`, result);
    return json(result, 201);
  } catch (error) {
    const message = errorMessage(error);
    console.error("Billing error:", message, error);
    const details = error instanceof Error && (error as any).cause ? (error as any).cause : undefined;
    return json({ error: message, details }, 400);
  }
});

function buildCustomerPayload(company: Record<string, any>, email: string) {
  const payload: Record<string, unknown> = {
    name: company.name || email,
    email,
    cpfCnpj: (company.document || "").replace(/\D/g, ""),
    phone: (company.phone || "").replace(/\D/g, ""),
    mobilePhone: (company.mobilePhone || company.phone || "").replace(/\D/g, ""),
  };
  if (company.address) payload.address = company.address;
  if (company.postal_code) payload.postalCode = company.postal_code.replace(/\D/g, "");
  if (company.city) payload.city = company.city;
  if (company.state) payload.province = company.state;
  return payload;
}

async function localSubscriptionForCompany(db: ReturnType<typeof adminClient>, companyId: string) {
  const { data } = await db.from("company_subscriptions").select("*").eq("company_id", companyId).maybeSingle();
  return data;
}