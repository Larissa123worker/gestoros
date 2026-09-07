import { getSupabaseClient } from "@/lib/supabase";

export type BillingPlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthly_amount: number;
  annual_amount: number;
  max_employees: string | null;
};

export type SubscribeInput = {
  planId: string;
  billingCycle: "monthly" | "annual";
  billingType: "PIX" | "CREDIT_CARD";
  idempotencyKey?: string;
  card?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
    holderCpfCnpj: string;
    holderPostalCode: string;
    holderAddressNumber: string;
    holderPhone: string;
    holderEmail: string;
    remoteIp: string;
  };
};

async function invoke<T>(body: Record<string, unknown>, options?: { idempotencyKey?: string }): Promise<T> {
  const headers = options?.idempotencyKey ? { "idempotency-key": options.idempotencyKey } : undefined;
  const { data, error } = await getSupabaseClient().functions.invoke("billing", { body, headers });
  if (data?.error) {
    const details = data.details ? ` ${JSON.stringify(data.details)}` : "";
    throw new Error(`${data.error}${details}`);
  }
  if (error) {
    const response = (error as { context?: Response }).context;
    if (response) {
      let payload: { error?: string; details?: unknown } | null = null;
      try {
        payload = await response.clone().json() as { error?: string; details?: unknown };
      } catch {
        payload = null;
      }
      if (payload?.error) {
        const details = payload.details ? ` ${JSON.stringify(payload.details)}` : "";
        throw new Error(`${payload.error}${details}`);
      }
    }
    throw new Error(error.message || "Não foi possível concluir a operação de cobrança.");
  }
  return data as T;
}

export function listBillingPlans() {
  return invoke<BillingPlan[]>({ action: "plans" });
}

export function getBillingAccount() {
  return invoke<{ company: Record<string, unknown>; subscription: Record<string, unknown> | null; payments: unknown[] }>({ action: "account" });
}

export function subscribe(input: SubscribeInput) {
  const { idempotencyKey, ...rest } = input;
  return invoke<{ subscription: Record<string, unknown>; asaas: Record<string, unknown>; invoiceUrl: string | null; paymentId: string | null; pixQrCode: any }>(
    { action: "subscribe", ...rest },
    { idempotencyKey },
  );
}

export function getPixQrCode(paymentId: string) {
  return invoke<{ encodedImage: string; payload: string; expirationDate: string }>({ action: "pix-qrcode", paymentId });
}