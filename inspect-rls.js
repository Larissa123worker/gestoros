const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery(tableName) {
  console.log(`\nTesting query on "${tableName}" using Anon Key...`);
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (error) {
    console.error(`Error on "${tableName}":`, error);
  } else {
    console.log(`Success on "${tableName}"! Data:`, data);
  }
}

async function run() {
  await testQuery('company_profiles');
  await testQuery('employee_profiles');
  await testQuery('client_profiles');
  await testQuery('service_orders');
  await testQuery('customer_approvals');
}

run().catch(console.error);
