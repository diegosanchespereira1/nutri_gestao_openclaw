import { createClient } from "@/lib/supabase/client";

/** Renova cookies de auth no browser; devolve false se não há sessão recuperável. */
export async function tryRefreshSupabaseSession(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) return true;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    return Boolean(session);
  } catch {
    return false;
  }
}
