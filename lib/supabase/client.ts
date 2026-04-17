import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: getSupabaseCookieOptions() },
  );
  return browserClient;
}
