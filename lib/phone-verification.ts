import { getSupabaseClient } from "@/lib/supabase";

export async function sendPhoneVerification(phone: string) {
  const { data, error } = await getSupabaseClient().functions.invoke("phone-verification", { body: { action: "send", phone } });
  if (data?.error) throw new Error(data.error);
  if (error) throw new Error(error.message || "Não foi possível enviar o código pelo WhatsApp.");
  return data as { sent: boolean; phone: string };
}

export async function verifyPhoneCode(code: string) {
  const { data, error } = await getSupabaseClient().functions.invoke("phone-verification", { body: { action: "verify", code } });
  if (data?.error) throw new Error(data.error);
  if (error) throw new Error(error.message || "Não foi possível validar o código.");
  return data as { verified: boolean; phone: string };
}
