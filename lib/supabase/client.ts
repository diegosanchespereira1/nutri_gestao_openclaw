import { createBrowserClient } from "@supabase/ssr";

import { assertSupabasePublicRuntimeEnv } from "@/lib/env/public-runtime";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;
let browserClientSupabaseUrl: string | null = null;
let browserClientAnonKey: string | null = null;

export function createClient() {
  const env = assertSupabasePublicRuntimeEnv();
  if (
    browserClient &&
    browserClientSupabaseUrl === env.supabaseUrl &&
    browserClientAnonKey === env.supabaseAnonKey
  ) {
    return browserClient;
  }

  browserClient = createBrowserClient(
    env.supabaseUrl,
    env.supabaseAnonKey,
    { cookieOptions: getSupabaseCookieOptions() },
  );
  browserClientSupabaseUrl = env.supabaseUrl;
  browserClientAnonKey = env.supabaseAnonKey;
  return browserClient;
}
