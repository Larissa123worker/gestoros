const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("Querying RLS policies...");
  
  const { data, error } = await supabase
    .rpc('get_policies'); // Wait, if get_policies rpc doesn't exist, we can use a direct sql query or select from pg_policies if allowed.
    
  if (error) {
    // Let's try to query pg_policies using an ad-hoc sql execution if possible, or query some tables.
    console.log("RPC get_policies failed, trying pg_policies view...");
  }
  
  // Since we cannot run raw sql via standard supabase-js client directly without an RPC function,
  // let's try to do an insert to 'users' table using the service role key and then using anon key to see if it's an RLS issue.
  console.log("Testing user insertion with service role...");
  const testUserId = 'test-' + Date.now();
  const { data: insData, error: insError } = await supabase
    .from('users')
    .insert({
      id: testUserId,
      email: 'test@example.com',
      role: 'user'
    })
    .select();
    
  console.log("Service role insert result:", { insData, insError });
  
  if (insData) {
    // Delete it
    await supabase.from('users').delete().eq('id', testUserId);
  }
}

run().catch(console.error);
