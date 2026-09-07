import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL or SUPABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
