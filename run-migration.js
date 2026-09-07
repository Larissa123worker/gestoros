import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL, SUPABASE_URL, or EXPO_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const sql = postgres(connectionString);

async function run() {
  try {
    await sql`
      alter table public.company_profiles
        add column if not exists postal_code varchar(8);
    `;
    await sql`
      alter table public.company_profiles
        add column if not exists address_number varchar(16);
    `;
    await sql`
      alter table public.company_profiles
        add column if not exists address_complement varchar(120);
    `;
    console.log("Migration applied successfully");
  } catch (error) {
    console.error("Error running migration:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
