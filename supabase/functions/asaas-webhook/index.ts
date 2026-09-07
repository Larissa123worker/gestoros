import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

const paidEvents = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const canceledEvents = new Set(["SUBSCRIPTION_INACTIVATED", "SUBSCRIPTION_DELETED"]);
const updatedEvents = new Set(["SUBSCRIPTION_UPDATED", "SUBSCRIPTION_CREATED"]);

function mapStatus(event: string) {
  if (paidEvents.has(event)) return "active";
  if (event === "PAYMENT_OVERDUE") return "past_due";
  if (canceledEvents.has(event)) return "canceled";
  return null;
}

async function fetchAsaasSubscription(id: string) {
  const asaasKey = Deno.env.get("ASAAS_API_KEY");
  const asaasUrl = Deno.env.get("ASAAS_API_URL") || "https://sandbox.asaas.com/api/v3";
  if (!asaasKey) return null;
  const res = await fetch(`${asaasUrl}/subscriptions/${encodeURIComponent(id)}`, {
    headers: { access_token: asaasKey },
  });
  if (!res.ok) return null;
  return res.json() as Promise<Record<string, unknown>>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const token = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!token || req.headers.get("asaas-access-token") !== token) return json({ error: "Webhook não autorizado." }, 401);

  const payload = await req.json().catch(() => null) as any;
  if (!payload?.id || !payload?.event) return json({ error: "Evento inválido." }, 400);

  const db = adminClient();
  const eventId = String(payload.id);
  const { data: existingEvent, error: existingEventError } = await db
    .from("asaas_webhook_events")
    .select("processed_at")
    .eq("id", eventId)
    .maybeSingle();
  if (existingEventError) return json({ error: "Falha ao consultar evento." }, 500);
  if (existingEvent?.processed_at) return json({ received: true, duplicate: true });
  if (!existingEvent) {
    const { error: eventError } = await db.from("asaas_webhook_events").insert({
      id: eventId,
      event: String(payload.event),
      payload,
      processed_at: null,
    });
    if (eventError && String(eventError.code) !== "23505") return json({ error: "Falha ao persistir evento." }, 500);
  }

  const payment = payload.payment;
  const asaasSubscriptionId = payment?.subscription || payload.subscription?.id;
  if (!asaasSubscriptionId) return json({ received: true, ignored: true });

  const { data: subscription } = await db.from("company_subscriptions").select("*").eq("asaas_subscription_id", asaasSubscriptionId).maybeSingle();
  if (!subscription) return json({ received: true, ignored: true });

  const event = String(payload.event);
  const mappedStatus = mapStatus(event);
  let asaasSub: Record<string, unknown> | null = null;
  if (updatedEvents.has(event) || (!payload.subscription && (mappedStatus === "active" || event === "PAYMENT_OVERDUE"))) {
    asaasSub = await fetchAsaasSubscription(asaasSubscriptionId).catch(() => null);
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (mappedStatus) updatePayload.status = mappedStatus;
  if (payload.subscription?.nextDueDate) updatePayload.next_billing_at = payload.subscription.nextDueDate;
  else if (asaasSub?.nextDueDate) updatePayload.next_billing_at = asaasSub.nextDueDate;

  if (updatedEvents.has(event)) {
    const value = Number(asaasSub?.value ?? payload.subscription?.value ?? 0);
    const cycle = (asaasSub?.cycle ?? payload.subscription?.cycle) as string | undefined;
    const billingType = (asaasSub?.billingType ?? payload.subscription?.billingType) as string | undefined;
    const description = (asaasSub?.description ?? payload.subscription?.description) as string | undefined;
    if (value > 0) updatePayload.amount = value;
    if (cycle === "MONTHLY" || cycle === "YEARLY") updatePayload.cycle = cycle;
    if (billingType === "PIX" || billingType === "CREDIT_CARD") updatePayload.billing_type = billingType;
    if (description) {
        const planName = String(description).split(" - ")[0]?.trim();
        if (planName) updatePayload.plan = planName;
      }
    if (mappedStatus === "active") updatePayload.trial_ends_at = null;
  } else if (mappedStatus === "active") {
    updatePayload.trial_ends_at = null;
  }

  const { error: subscriptionError } = await db
    .from("company_subscriptions")
    .update({ ...updatePayload, "updatedAt": new Date().toISOString() })
    .eq("id", subscription.id);
  if (subscriptionError) {
    console.error("Falha ao atualizar assinatura local:", subscriptionError);
    return json({ error: "Falha ao atualizar assinatura local." }, 500);
  }

  if (payment?.id) {
    const { error: paymentError } = await db.from("subscription_payments").upsert({
      id: `asaas-${payment.id}`,
      subscription_id: subscription.id,
      asaas_payment_id: payment.id,
      billing_type: payment.billingType,
      description: payment.description || "Assinatura Gestor OS",
      amount: payment.value,
      status: paidEvents.has(event) ? "paid" : event === "PAYMENT_OVERDUE" ? "overdue" : "pending",
      due_at: payment.dueDate || null,
      paid_at: payment.paymentDate || null,
    }, { onConflict: "asaas_payment_id" });
    if (paymentError) {
      console.error("Falha ao atualizar pagamento local:", paymentError);
      return json({ error: "Falha ao atualizar pagamento local." }, 500);
    }
  }

  const { error: processedEventError } = await db
    .from("asaas_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", eventId);
  if (processedEventError) return json({ error: "Falha ao finalizar evento." }, 500);

  return json({ received: true });
});