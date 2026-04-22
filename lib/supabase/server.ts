import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { readSupabaseAnonKey, readSupabaseUrl } from "@/lib/supabase/runtime-env";

export async function createClient() {
  const cookieStore = await cookies();
  const url = readSupabaseUrl();
  const anonKey = readSupabaseAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      "Supabase env ausente no servidor: configure SUPABASE_URL/SUPABASE_ANON_KEY (ou NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  return createServerClient(
    url,
    anonKey,
    {
      cookieOptions: getSupabaseCookieOptions(),
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, {
            ...init,
            cache: "no-store",
          }),
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component sem mutação de cookies — sessão renovada no middleware.
          }
        },
      },
    },
  );
}
