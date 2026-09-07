import { getSupabaseClient } from "@/lib/supabase";

export async function checkIfIdExists(id: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient()
    .from("company_profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível verificar o ID da empresa: ${error.message}`);
  }

  return !!data;
}
