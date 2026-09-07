const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

// Use anon client just like the app
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = `test-${Date.now()}@example.com`;
  const password = `password123`;
  
  console.log(`1. Signing up user: ${email}...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: 'Test User' }
    }
  });
  
  if (signUpError) {
    console.error("Sign up failed:", signUpError);
    return;
  }
  
  const user = signUpData.user;
  console.log("Sign up successful. User ID:", user.id);
  
  // Set auth context (supabase-js client handles this automatically after signUp)
  
  console.log("2. Attempting ensureProfile (inserting into users table)...");
  const { data: profData, error: profError } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      email: user.email,
      role: 'company',
      updatedAt: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single();
    
  console.log("ensureProfile result:", { profData, profError });
  
  if (profError) {
    console.error("Failed to ensureProfile! This is why it failed.");
    return;
  }
  
  console.log("3. Attempting createCompany (inserting into company_profiles)...");
  const companyId = 'TS-' + Math.floor(10000 + Math.random() * 90000);
  const { data: compData, error: compError } = await supabase
    .from('company_profiles')
    .insert({
      id: companyId,
      user_id: user.id,
      name: 'Test Company LLC',
      city: 'São Paulo',
      state: 'SP'
    })
    .select()
    .single();
    
  console.log("createCompany result:", { compData, compError });
}

run().catch(console.error);
