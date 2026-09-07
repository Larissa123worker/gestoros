require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { error } = await supabase.from('company_subscriptions').upsert({
    id: "test-123",
    company_id: "VC-80502",
    plan_id: "plan-solo",
    plan: "Solo",
    cycle: "MONTHLY",
    amount: 79,
    billing_type: "PIX",
    asaas_customer_id: "cus_123",
    asaas_subscription_id: "sub_123",
    status: "pending",
    next_billing_at: new Date().toISOString(),
    trial_ends_at: null,
    updated_at: new Date().toISOString()
  });
  console.log("Upsert error:", error);
}
run();
