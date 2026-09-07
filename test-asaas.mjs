const baseUrl = (process.env.ASAAS_BASE_URL || "https://api.asaas.com").replace(/\/$/, "");

async function asaas(path, init) {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    console.error("ASAAS_API_KEY não definida.");
    process.exit(1);
  }
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      access_token: apiKey,
      accept: "application/json",
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("HTTP:", response.status);
    console.error("Body:", JSON.stringify(body, null, 2));
    throw new Error(body?.errors?.map((item) => item.description).filter(Boolean).join("; ") || `HTTP ${response.status}`);
  }
  return body;
}

async function main() {
  const payload = {
    name: "Teste",
    email: "teste@example.com",
    cpfCnpj: "12345678901",
    phone: "11999999999",
    address: "Rua Teste",
  };

  try {
    const customer = await asaas("/v3/customers", {
      method: "POST",
      body: JSON.stringify({ ...payload, notificationDisabled: true }),
    });
    console.log("Customer:", customer);

    const subscription = await asaas("/v3/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        customer: customer.id,
        billingType: "PIX",
        value: 1,
        cycle: "MONTHLY",
        nextDueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        description: "Teste - Gestor OS",
        externalReference: "test-123",
      }),
    });
    console.log("Subscription:", subscription);
  } catch (error) {
    console.error("Erro:", error.message);
    process.exit(1);
  }
}

main();
