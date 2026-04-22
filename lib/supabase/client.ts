import { createBrowserClient } from "@supabase/ssr";

import { assertSupabasePublicRuntimeEnv } from "@/lib/env/public-runtime";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) return browserClient;
  const env = assertSupabasePublicRuntimeEnv();

  browserClient = createBrowserClient(
    env.supabaseUrl,
    env.supabaseAnonKey,
    { cookieOptions: getSupabaseCookieOptions() },
  );
  return browserClient;
}
