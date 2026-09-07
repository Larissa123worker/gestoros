require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { error } = await supabase.from('billing_idempotency').select('key').limit(1);
  console.log('billing_idempotency error:', error?.code, error?.message);
}
run();
