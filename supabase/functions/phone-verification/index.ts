import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

function digits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function validPhone(value: string) {
  return /^55\d{10,11}$/.test(value);
}

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function expiresAt() {
  return new Date(Date.now() + 10 * 60 * 1000).toISOString();
}

async function sendWhatsAppCode(phone: string, code: string) {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const templateName = Deno.env.get("WHATSAPP_VERIFY_TEMPLATE_NAME");
  const templateLanguage = Deno.env.get("WHATSAPP_VERIFY_TEMPLATE_LANGUAGE") ?? "pt_BR";
  if (!token || !phoneNumberId || !templateName) throw new Error("WhatsApp Cloud API não configurada nos secrets do Supabase.");

  const response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: { name: templateName, language: { code: templateLanguage }, components: [{ type: "body", parameters: [{ type: "text", text: code }] }] },
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message ?? "Falha ao enviar código pelo WhatsApp.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const action = body.action;
    const db = adminClient();
    const { data: company } = await db.from("company_profiles").select("id, phone, mobile_phone").eq("user_id", user.id).maybeSingle();
    if (!company) return json({ error: "Empresa não encontrada." }, 404);

    if (action === "send") {
      const phone = digits(body.phone || company.mobile_phone || company.phone);
      const normalized = phone.startsWith("55") ? phone : `55${phone}`;
      if (!validPhone(normalized)) return json({ error: "Celular inválido. Informe DDD e número, por exemplo 11988889999." }, 400);
      const code = randomCode();
      await sendWhatsAppCode(normalized, code);
      await db.from("phone_verifications").delete().eq("company_id", company.id).eq("verified_at", null);
      const { error } = await db.from("phone_verifications").insert({ company_id: company.id, phone: normalized, code, expires_at: expiresAt(), attempts: 0 });
      if (error) throw error;
      return json({ sent: true, phone: normalized });
    }

    if (action === "verify") {
      const code = digits(body.code);
      const { data: verification } = await db.from("phone_verifications").select("*").eq("company_id", company.id).is("verified_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!verification || new Date(verification.expires_at).getTime() < Date.now()) return json({ error: "Código expirado. Solicite um novo código." }, 400);
      if (verification.attempts >= 5) return json({ error: "Limite de tentativas excedido. Solicite um novo código." }, 429);
      if (verification.code !== code) {
        await db.from("phone_verifications").update({ attempts: verification.attempts + 1 }).eq("id", verification.id);
        return json({ error: "Código inválido." }, 400);
      }
      await db.from("phone_verifications").update({ verified_at: new Date().toISOString() }).eq("id", verification.id);
      await db.from("company_profiles").update({ phone: verification.phone, phone_verified_at: new Date().toISOString() }).eq("id", company.id);
      return json({ verified: true, phone: verification.phone });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Não foi possível verificar o telefone." }, 400);
  }
});
