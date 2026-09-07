import { corsHeaders, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const user = await requireUser(req);
    const { to, subject, html } = await req.json();
    if (!to || !subject || !html) return json({ error: "to, subject e html são obrigatórios." }, 400);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM");
    if (!resendKey || !from) return json({ error: "RESEND_API_KEY e RESEND_FROM não configurados." }, 503);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, tags: [{ name: "user_id", value: user.id }] }),
    });
    const result = await response.json();
    if (!response.ok) return json({ error: result?.message || "Falha ao enviar email." }, 502);
    return json({ id: result.id });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Não autenticado." }, 401);
  }
});
