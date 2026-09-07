const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function code() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function verificationId() {
  return crypto.randomUUID();
}

function expiresAt() {
  return new Date(Date.now() + 10 * 60 * 1000).toISOString();
}

function secret(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) return undefined;
  return value.replace(/^("|')|("|')$/g, "").trim();
}

async function databaseRequest(path: string, init: RequestInit = {}) {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = secret("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) throw new Error("Secrets do Supabase não configurados.");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message ?? result?.hint ?? `Supabase retornou HTTP ${response.status}.`);
  return result;
}

async function sendEmail(to: string, value: string) {
  const apiKey = secret("RESEND_API_KEY");
  const from = secret("RESEND_FROM_EMAIL") ?? secret("RESEND_FROM");
  if (!apiKey || !from) throw new Error("RESEND_API_KEY e RESEND_FROM_EMAIL não configurados.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Confirme seu email no Gestor OS",
      html: `<p>Seu código de confirmação é:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${value}</p><p>Este código expira em 10 minutos.</p>`,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Resend (${response.status}): ${result?.message ?? "Não foi possível enviar o email de confirmação."}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Informe um email válido." }, 400);
    if (body.action === "send") {
      const verificationCode = code();
      await sendEmail(email, verificationCode);
      await databaseRequest(`email_verifications?email=eq.${encodeURIComponent(email)}&verified_at=is.null`, { method: "DELETE" });
      await databaseRequest("email_verifications", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ id: verificationId(), email, code: verificationCode, expires_at: expiresAt(), attempts: 0 }),
      });
      return json({ sent: true, email });
    }

    if (body.action === "verify") {
      const verifications = await databaseRequest(`email_verifications?email=eq.${encodeURIComponent(email)}&verified_at=is.null&order=created_at.desc&limit=1`);
      const verification = Array.isArray(verifications) ? verifications[0] : null;
      if (!verification || new Date(verification.expires_at).getTime() < Date.now()) return json({ error: "Código expirado. Solicite um novo código." }, 400);
      if (verification.attempts >= 5) return json({ error: "Limite de tentativas excedido. Solicite um novo código." }, 429);
      if (verification.code !== String(body.code ?? "").replace(/\D/g, "")) {
        await databaseRequest(`email_verifications?id=eq.${encodeURIComponent(verification.id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ attempts: verification.attempts + 1 }),
        });
        return json({ error: "Código de email inválido." }, 400);
      }
      await databaseRequest(`email_verifications?id=eq.${encodeURIComponent(verification.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ verified_at: new Date().toISOString() }),
      });
      return json({ verified: true, email: verification.email });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Não foi possível confirmar o email." }, 400);
  }
});
