const baseUrl = (Deno.env.get("ASAAS_BASE_URL") ?? "https://api-sandbox.asaas.com").replace(/\/$/, "");

export type BillingType = "PIX" | "CREDIT_CARD";
export type Cycle = "MONTHLY" | "YEARLY";

export async function asaas<T>(path: string, init: RequestInit): Promise<T> {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada nos secrets do Supabase.");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      access_token: apiKey,
      accept: "application/json",
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Asaas error response:", JSON.stringify({ status: response.status, body }));
    const message = body?.errors?.map((item: { description?: string }) => item.description).filter(Boolean).join("; ");
    throw new Error(message || body?.message || `Asaas retornou HTTP ${response.status}: ${JSON.stringify(body)}`);
  }
  return body as T;
}

export async function createCustomer(input: Record<string, unknown>) {
  return asaas<{ id: string }>("/v3/customers", { method: "POST", body: JSON.stringify({ ...input, notificationDisabled: true }) });
}

export async function createSubscription(input: Record<string, unknown>) {
  return asaas<{ id: string; status: string; nextDueDate: string }>("/v3/subscriptions", { method: "POST", body: JSON.stringify(input) });
}

export async function getSubscription(subscriptionId: string) {
  return asaas<Record<string, unknown>>(`/v3/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: "GET" });
}

export async function updateSubscription(subscriptionId: string, input: Record<string, unknown>) {
  return asaas<Record<string, unknown>>(`/v3/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteSubscription(subscriptionId: string) {
  return asaas<{ deleted: boolean; id: string }>(`/v3/subscriptions/${encodeURIComponent(subscriptionId)}`, { method: "DELETE" });
}

export async function listSubscriptionPayments(subscriptionId: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return asaas<{ data: Record<string, unknown>[] }>(`/v3/subscriptions/${encodeURIComponent(subscriptionId)}/payments${query}`, { method: "GET" });
}

export async function getPayment(paymentId: string) {
  return asaas<Record<string, unknown>>(`/v3/payments/${encodeURIComponent(paymentId)}`, { method: "GET" });
}

export async function getPaymentPixQrCode(paymentId: string) {
  return asaas<Record<string, unknown>>(`/v3/payments/${encodeURIComponent(paymentId)}/pixQrCode`, { method: "GET" });
}

export function asaasWebhookUrl() {
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/asaas-webhook`;
}
