const fetch = require('node-fetch');
async function test() {
  const asaasKey = process.env.ASAAS_API_KEY;
  const asaasUrl = "https://sandbox.asaas.com/api/v3";
  const asaasSubscriptionId = "sub_vd1wm1p5mgxinuz0"; // ID from user's payload

  const res = await fetch(`${asaasUrl}/subscriptions/${asaasSubscriptionId}`, {
    headers: { "access_token": asaasKey }
  });
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Data:", data);
}
test();
