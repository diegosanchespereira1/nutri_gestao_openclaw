import { createClient } from "@supabase/supabase-js";

/** Cliente anon (sem cookies) para RPC públicas, ex.: cancelar pedido LGPD pelo token do email. */
export function createAnonSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Variáveis Supabase em falta.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
