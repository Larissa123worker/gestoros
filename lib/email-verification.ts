import { getSupabaseClient } from "@/lib/supabase";

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await getSupabaseClient().functions.invoke("email-verification", { body });
  if (data?.error) throw new Error(data.error);
  if (error) throw new Error(error.message || "Não foi possível confirmar o email.");
  return data as { sent?: boolean; verified?: boolean; email: string };
}

export function sendEmailVerification(email: string) {
  return invoke({ action: "send", email });
}

export function verifyEmailCode(email: string, code: string) {
  return invoke({ action: "verify", email, code });
}
