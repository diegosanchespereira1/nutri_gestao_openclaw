import { createClient } from "@supabase/supabase-js";
import { readSupabaseAnonKey, readSupabaseUrl } from "@/lib/supabase/runtime-env";

/** Cliente anon (sem cookies) para RPC públicas, ex.: cancelar pedido LGPD pelo token do email. */
export function createAnonSupabaseClient() {
  const url = readSupabaseUrl();
  const key = readSupabaseAnonKey();
  if (!url || !key) {
    throw new Error("Variáveis Supabase em falta.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
