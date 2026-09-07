import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
      throw new Error("Supabase URL or service role key is not configured");
    }
    _supabase = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return _supabase;
}

export function resetSupabase() {
  _supabase = null;
}
