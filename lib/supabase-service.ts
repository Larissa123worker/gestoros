import { getSupabaseClient } from "@/lib/supabase";
import type { ServiceOrder, Client, Employee, ServiceEvidence, ServiceArrival, CustomerApproval } from "@/lib/app-store";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isValidCompanyId, normalizeCompanyId } from "@/lib/company-id-generator";

function sb(): any {
  return getSupabaseClient();
}

export type DbServiceOrder = ServiceOrder & {
  company_id?: string | null;
  created_at?: string;
  updated_at?: string;
  latitude?: string | null;
  longitude?: string | null;
  offline_download_token?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
};

export type DbClient = Client & {
  company_id?: string | null;
  created_at?: string;
  updated_at?: string;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  state?: string | null;
  address?: string | null;
  observation?: string | null;
  reference_point?: string | null;
  document?: string | null;
};

export type DbEmployee = Employee & {
  company_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  suggestedValue: number;
  estimatedDuration: string;
  active: boolean;
};

export type SubscriptionStatus = "trialing" | "pending" | "active" | "past_due" | "expired" | "canceled";
export type CompanySubscription = {
  id: string;
  companyId: string;
  plan: string;
  plan_id: string | null;
  status: SubscriptionStatus;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  nextBillingAt: string | null;
  amount: number;
  billing_type: string | null;
  cycle: string | null;
  asaas_subscription_id: string | null;
  payments: Array<{ id: string; description: string; amount: number; status: string; dueAt: string | null; paidAt: string | null }>;
};

function normalizeSubscription(row: any, payments: any[] = []): CompanySubscription {
  const trialEndsAt = row?.trial_ends_at ?? null;
  const status = row?.status === "trialing" && trialEndsAt && new Date(trialEndsAt).getTime() <= Date.now() ? "expired" : (row?.status ?? "trialing");
  return {
    id: row?.id ?? `sub-${row?.company_id ?? "unknown"}`,
    companyId: row?.company_id,
    plan: row?.plan ?? "Profissional",
    plan_id: row?.plan_id ?? null,
    status,
    trialStartedAt: row?.trial_started_at ?? null,
    trialEndsAt,
    nextBillingAt: row?.next_billing_at ?? null,
    amount: Number(row?.amount ?? 179),
    billing_type: row?.billing_type ?? null,
    cycle: row?.cycle ?? null,
    asaas_subscription_id: row?.asaas_subscription_id ?? null,
    payments: payments.map((payment) => ({
      id: payment.id,
      description: payment.description ?? "Assinatura Gestor OS",
      amount: Number(payment.amount ?? 0),
      status: payment.status ?? "pending",
      dueAt: payment.due_at ?? null,
      paidAt: payment.paid_at ?? null,
    })),
  };
}

export async function getCompanySubscription(companyId: string, companyCreatedAt?: string | null): Promise<CompanySubscription> {
  const { data: subscription } = await sb().from("company_subscriptions").select("*").eq("company_id", companyId).maybeSingle();
  if (!subscription) {
    if (!companyCreatedAt) {
      return normalizeSubscription({ company_id: companyId, status: "expired" });
    }
    const started = new Date(companyCreatedAt);
    const ends = new Date(started.getTime() + 30 * 24 * 60 * 60 * 1000);
    return normalizeSubscription({ company_id: companyId, status: "trialing", trial_started_at: started.toISOString(), trial_ends_at: ends.toISOString() });
  }
  const { data: payments } = await sb().from("subscription_payments").select("*").eq("subscription_id", subscription.id).order("due_at", { ascending: false });
  return normalizeSubscription(subscription, payments ?? []);
}

export type ProfileInsert = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  company_id?: string | null;
  registration?: string | null;
  phone?: string | null;
  active?: string | boolean | null;
  password_hash?: string | null;
};

export async function getCurrentUser() {
  const { data, error } = await sb().auth.getUser();
  if (error || !data.user) return null;
  return data.user as any;
}

export async function getProfile(userId: string) {
  const { data, error } = await sb()
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data as any;
}

export async function getCompanyByUserId(userId: string) {
  try {
    const { data, error } = await sb()
      .from("company_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as any;
  } catch {
    return null;
  }
}

export async function getCompanyById(companyId: string) {
  const { data, error } = await sb()
    .from("company_profiles")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (error || !data) return null;
  return data as any;
}

export async function getEmployeeByUserId(userId: string) {
  try {
    const { data, error } = await sb()
      .from("employee_profiles")
      .select("id, company_id, name, email, role, registration, phone, active")
      .eq("user_id", userId)
      .maybeSingle();

    // Ignora silenciosamente erros de RLS (400/403) — acontece quando admin
    // consulta employee_profiles sem permissão de leitura
    if (error) return null;
    return data as any;
  } catch {
    return null;
  }
}

export async function getEmployeeById(employeeId: string) {
  const { data, error } = await sb()
    .from("employee_profiles")
    .select("id, company_id, name, email, role, registration, phone, active")
    .eq("id", employeeId)
    .maybeSingle();

  if (error || !data) return null;
  return data as any;
}

/** Cadastro de profissional pelo gestor (sem Supabase Auth). */
export async function createProfessionalByManager(payload: {
  companyId: string;
  name: string;
  email: string;
  password: string;
  role?: string;
  phone?: string;
}) {
  const email = payload.email.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("Informe um email válido.");
  if (payload.password.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");

  const company = await getCompanyById(payload.companyId);
  if (!company) throw new Error("Empresa não encontrada.");

  const { data: existing } = await sb()
    .from("employee_profiles")
    .select("id")
    .eq("company_id", payload.companyId)
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    throw new Error("Já existe um profissional com este email nesta empresa.");
  }

  const passwordHash = await hashPassword(payload.password);
  const employeeId = `emp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await sb()
    .from("employee_profiles")
    .insert({
      id: employeeId,
      company_id: payload.companyId,
      name: payload.name.trim(),
      email,
      password_hash: passwordHash,
      role: payload.role?.trim() || "Técnico",
      registration: payload.name.trim(),
      phone: payload.phone?.trim() || null,
      active: "true",
      user_id: null,
    })
    .select("id, company_id, name, email, role, registration, phone, active")
    .single();

  if (error) throw error;
  return data as any;
}

/** Login do profissional: ID da empresa + email + senha (sem Auth). */
export async function loginProfessionalCredentials(payload: {
  companyId: string;
  email: string;
  password: string;
}) {
  const companyId = normalizeCompanyId(payload.companyId);
  if (!isValidCompanyId(companyId)) {
    throw new Error("ID da empresa inválido. Use o formato XX-XXXXX.");
  }

  const email = payload.email.trim().toLowerCase();
  const company = await getCompanyById(companyId);
  if (!company) {
    throw new Error("ID da empresa não encontrado.");
  }
  const subscription = await getCompanySubscription(companyId, company.createdAt ?? company.created_at);
  if (!['trialing', 'active'].includes(subscription.status)) {
    throw new Error("A empresa está com o acesso bloqueado por trial expirado ou pagamento pendente.");
  }

  const { data: employee, error } = await sb()
    .from("employee_profiles")
    .select("id, company_id, name, email, role, registration, phone, active, password_hash")
    .eq("company_id", companyId)
    .eq("email", email)
    .maybeSingle();

  if (error || !employee) {
    throw new Error("Email ou senha incorretos.");
  }

  if (String(employee.active) === "false") {
    throw new Error("Profissional inativo. Fale com o gestor.");
  }

  const ok = await verifyPassword(payload.password, employee.password_hash ?? "");
  if (!ok) {
    throw new Error("Email ou senha incorretos.");
  }

  return {
    employeeId: employee.id as string,
    companyId,
    companyName: (company.name as string) ?? null,
    name: (employee.name as string) || (employee.registration as string) || "Profissional",
    email,
    jobRole: (employee.role as string) || "Técnico",
  };
}

export async function createCompany(payload: {
  id: string;
  userId: string;
  name: string;
  document?: string;
  phone?: string;
  postalCode?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  address?: string;
}) {
  // Verifica se já existe empresa para este usuário
  const existing = await getCompanyByUserId(payload.userId);
  if (existing) {
    // Atualiza em vez de inserir para evitar conflito 409
    const { data, error } = await sb()
      .from("company_profiles")
      .update({
        name: payload.name,
        document: payload.document,
        phone: payload.phone,
        postal_code: payload.postalCode,
        address_number: payload.addressNumber,
        address_complement: payload.addressComplement,
        city: payload.city,
        state: payload.state,
        address: payload.address,
        updatedAt: new Date().toISOString(),
      })
      .eq("user_id", payload.userId)
      .select()
      .single();

    if (error) throw error;
    return data as any;
  }

  const { data, error } = await sb()
    .from("company_profiles")
    .insert({
      id: payload.id,
      user_id: payload.userId,
      name: payload.name,
      document: payload.document,
      phone: payload.phone,
      postal_code: payload.postalCode,
      address_number: payload.addressNumber,
      address_complement: payload.addressComplement,
      city: payload.city,
      state: payload.state,
      address: payload.address,
    })
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function ensureProfile(userId: string, email: string | null, role = "user") {
  const { data, error } = await sb()
    .from("users")
    .upsert(
      {
        id: userId,
        email,
        role,
        updatedAt: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  return data as any;
}

export async function listClients(companyId: string) {
  const { data, error } = await sb()
    .from("client_profiles")
    .select("*")
    .eq("company_id", companyId)
    .order("createdAt", { ascending: false });

  if (error) return [];
  return (data ?? []).map((item: any) => ({
    id: item.id,
    name: item.name ?? "Sem nome",
    contact: item.contact ?? "",
    city: item.city ?? "",
    street: item.street ?? "",
    number: item.number ?? "",
    neighborhood: item.neighborhood ?? "",
    state: item.state ?? "",
    address: item.address ?? "",
    observation: item.observation ?? "",
    referencePoint: item.reference_point ?? "",
    document: item.document ?? "",
  })) as DbClient[];
}

export async function createClient(companyId: string, client: { name: string; contact: string; city: string; street?: string; number?: string; neighborhood?: string; state?: string; address?: string; observation?: string; referencePoint?: string; document?: string }) {
  const clientId = `cli-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await sb()
    .from("client_profiles")
    .insert({
      id: clientId,
      company_id: companyId,
      name: client.name,
      contact: client.contact,
      city: client.city,
      street: client.street,
      number: client.number,
      neighborhood: client.neighborhood,
      state: client.state,
      address: client.address,
      observation: client.observation,
      reference_point: client.referencePoint,
      document: client.document,
    })
    .select()
    .single();

  if (error) throw error;
  const row = data as any;
  return {
    id: row.id,
    name: row.name ?? "Sem nome",
    contact: row.contact ?? "",
    city: row.city ?? "",
    street: row.street ?? "",
    number: row.number ?? "",
    neighborhood: row.neighborhood ?? "",
    state: row.state ?? "",
    address: row.address ?? "",
    observation: row.observation ?? "",
    referencePoint: row.reference_point ?? "",
    document: row.document ?? "",
  } as DbClient;
}

export async function updateClient(clientId: string, client: Partial<Client>) {
  const { data, error } = await sb()
    .from("client_profiles")
    .update({
      name: client.name,
      contact: client.contact,
      city: client.city,
      street: client.street,
      number: client.number,
      neighborhood: client.neighborhood,
      state: client.state,
      address: client.address,
      observation: client.observation,
      reference_point: client.referencePoint,
      document: client.document,
    })
    .eq("id", clientId)
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name ?? "Sem nome",
    contact: data.contact ?? "",
    city: data.city ?? "",
    street: data.street ?? "",
    number: data.number ?? "",
    neighborhood: data.neighborhood ?? "",
    state: data.state ?? "",
    address: data.address ?? "",
    observation: data.observation ?? "",
    referencePoint: data.reference_point ?? "",
    document: data.document ?? "",
  } as DbClient;
}

export async function listEmployees(companyId: string) {
  const { data, error } = await sb()
    .from("employee_profiles")
    .select("id, company_id, name, email, role, registration, phone, active, createdAt")
    .eq("company_id", companyId)
    .order("createdAt", { ascending: false });

  if (error) return [];
  return (data ?? []).map((item: any) => {
    const displayName = item.name ?? item.registration ?? "Sem nome";
    return {
      id: item.id,
      name: displayName,
      email: item.email ?? "",
      role: item.role ?? "",
      initials: displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      activeOrders: 0,
    };
  }) as DbEmployee[];
}

export async function createEmployee(payload: ProfileInsert & { password_hash?: string }) {
  const employeeId = payload.id ?? `emp-${Date.now()}`;
  const { data, error } = await sb()
    .from("employee_profiles")
    .insert({
      id: employeeId,
      user_id: payload.id ?? null,
      company_id: payload.company_id,
      name: payload.name ?? null,
      email: payload.email?.toLowerCase() ?? null,
      password_hash: payload.password_hash ?? null,
      role: payload.role ?? "Técnico",
      registration: payload.registration ?? payload.name ?? null,
      phone: payload.phone,
      active: String(payload.active ?? true),
    })
    .select("id, company_id, name, email, role, registration, phone, active")
    .single();

  if (error) throw error;
  return data as any;
}

export async function updateEmployee(employeeId: string, employee: { name: string; email: string; role: string; phone?: string; password?: string }) {
  const values: Record<string, unknown> = {
    name: employee.name,
    email: employee.email.toLowerCase(),
    role: employee.role,
    registration: employee.name,
    phone: employee.phone,
  };
  if (employee.password) values.password_hash = await hashPassword(employee.password);
  const { data, error } = await sb().from("employee_profiles").update(values).eq("id", employeeId).select("id, name, email, role, phone").single();
  if (error) throw error;
  return data as { id: string; name: string; email: string; role: string; phone?: string };
}

export async function listOrders(companyId: string, opts?: { employeeId?: string }) {
  let query = sb()
    .from("service_orders")
    .select("*")
    .eq("company_id", companyId)
    .order("createdAt", { ascending: false });

  if (opts?.employeeId) {
    query = query.eq("employee_id", opts.employeeId);
  }

  const { data, error } = await query;

  if (error || !data?.length) return [];

  const orderIds = data.map((order: any) => order.id);
  const { data: evidences } = await sb()
    .from("service_evidences")
    .select("*")
    .in("order_id", orderIds);

  const { data: arrivals } = await sb()
    .from("service_arrivals")
    .select("*")
    .in("order_id", orderIds);

  const { data: approvals } = await sb()
    .from("customer_approvals")
    .select("*")
    .in("order_id", orderIds);

  const evidenceMap = new Map((evidences ?? []).map((e: any) => [e.order_id, e]));
  const arrivalMap = new Map((arrivals ?? []).map((a: any) => [a.order_id, a]));
  const approvalMap = new Map((approvals ?? []).map((a: any) => [a.order_id, a]));

  return data.map((order: any) => {
    const evidence = evidenceMap.get(order.id) as any;
    const arrival = arrivalMap.get(order.id) as any;
    const approval = approvalMap.get(order.id) as any;

    return {
      id: order.id,
      createdAt: order.createdAt ?? order.created_at ?? undefined,
      title: order.title ?? "",
      clientId: order.client_id ?? "",
      employeeId: order.employee_id ?? "",
      status: order.status ?? "Pendente",
      priority: order.priority ?? "Média",
      date: order.date ?? "",
      time: order.time ?? "",
      value: Number(order.value ?? 0),
      description: order.description ?? "",
      address: order.address ?? "",
      notes: order.notes ?? "",
      startedAt: order.started_at ?? undefined,
      completedAt: order.completed_at ?? undefined,
      evidences: evidence
        ? [
            {
              id: evidence.id,
              uri: evidence.uri,
              createdAt: evidence.createdAt ?? new Date().toISOString(),
            } as ServiceEvidence,
          ]
        : [],
      arrival: arrival
        ? {
            latitude: Number(arrival.latitude ?? 0),
            longitude: Number(arrival.longitude ?? 0),
            registeredAt: arrival.registeredAt ?? new Date().toISOString(),
          } as ServiceArrival
        : undefined,
      approval: approval
        ? {
            name: approval.name ?? "",
            signaturePath: approval.signaturePath ?? "",
            acceptedAt: approval.acceptedAt ?? new Date().toISOString(),
          } as CustomerApproval
        : undefined,
    } as ServiceOrder;
  });
}

export async function listCatalog(companyId: string) {
  const { data, error } = await sb().from("service_catalog").select("*").eq("company_id", companyId).order("createdAt", { ascending: false });
  if (error) return [] as CatalogItem[];
  return (data ?? []).map((item: any) => ({
    id: item.id,
    name: item.name ?? "",
    description: item.description ?? "",
    suggestedValue: Number(item.suggested_value ?? 0),
    estimatedDuration: item.estimated_duration ?? "",
    active: String(item.active) !== "false",
  })) as CatalogItem[];
}

export async function createCatalogItem(companyId: string, item: Omit<CatalogItem, "id" | "active">) {
  const id = `svc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await sb().from("service_catalog").insert({
    id, company_id: companyId, name: item.name, description: item.description,
    suggested_value: String(item.suggestedValue), estimated_duration: item.estimatedDuration, active: "true",
  }).select().single();
  if (error) throw error;
  return { id: data.id, name: data.name, description: data.description ?? "", suggestedValue: Number(data.suggested_value ?? 0), estimatedDuration: data.estimated_duration ?? "", active: true } as CatalogItem;
}

export async function updateCatalogItem(companyId: string, item: CatalogItem) {
  const { data, error } = await sb().from("service_catalog").update({
    name: item.name, description: item.description, suggested_value: String(item.suggestedValue),
    estimated_duration: item.estimatedDuration, active: String(item.active), updatedAt: new Date().toISOString(),
  }).eq("company_id", companyId).eq("id", item.id).select().single();
  if (error) throw error;
  return item;
}

export async function createOrder(order: DbServiceOrder) {
  const { data, error } = await sb()
    .from("service_orders")
    .insert({
      id: order.id,
      company_id: order.company_id,
      client_id: order.clientId,
      employee_id: order.employeeId,
      status: order.status,
      priority: order.priority,
      title: order.title,
      description: order.description,
      address: order.address,
      notes: order.notes,
      date: order.date,
      time: order.time,
      value: String(order.value ?? 0),
      latitude: order.latitude,
      longitude: order.longitude,
      offline_download_token: order.offline_download_token,
      started_at: order.startedAt,
      completed_at: order.completedAt,
    })
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function updateOrderStatus(orderId: string, status: string, eventAt = new Date().toISOString(), startedAt?: string, completedAt?: string) {
  const changes: Record<string, string> = { status, updatedAt: eventAt };
  if (startedAt) changes.started_at = startedAt;
  if (completedAt) changes.completed_at = completedAt;
  const { data, error } = await sb()
    .from("service_orders")
    .update(changes)
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function updateOrderNotes(orderId: string, notes: string) {
  const { error } = await sb()
    .from("service_orders")
    .update({ notes, updatedAt: new Date().toISOString() })
    .eq("id", orderId);

  if (error) throw error;
}


export async function addEvidence(orderId: string, uri: string) {
  const evidenceId = `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await sb()
    .from("service_evidences")
    .insert({ id: evidenceId, order_id: orderId, uri, type: "image" })
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function registerArrival(orderId: string, latitude: number, longitude: number) {
  const arrivalId = `arr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await sb()
    .from("service_arrivals")
    .insert({ id: arrivalId, order_id: orderId, latitude: String(latitude), longitude: String(longitude), registeredAt: new Date().toISOString() })
    .select()
    .single();

  if (error) throw error;
  return data as any;
}

export async function submitApproval(orderId: string, name: string, signaturePath: string, completedAt = new Date().toISOString()) {
  const approvalId = `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await sb()
    .from("customer_approvals")
    .insert({
      id: approvalId,
      order_id: orderId,
      name,
      signaturePath: signaturePath,
      acceptedAt: new Date().toISOString(),
      status: "Confirmado",
    })
    .select()
    .single();

  if (error) throw error;

  await sb()
    .from("service_orders")
    .update({ status: "Concluída", completed_at: completedAt, updatedAt: completedAt })
    .eq("id", orderId);

  return data as any;
}

export async function uploadEvidence(fileUri: string, orderId: string) {
  const ext = fileUri.split(".").pop() ?? "jpg";
  const path = `evidences/${orderId}/${Date.now()}.${ext}`;

  const { error } = await sb().storage.from("evidences").upload(path, fileUri, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = sb().storage.from("evidences").getPublicUrl(path);
  return data.publicUrl;
}
