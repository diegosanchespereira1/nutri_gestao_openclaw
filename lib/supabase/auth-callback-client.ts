import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { readSupabaseAnonKey, readSupabaseUrl } from "@/lib/supabase/runtime-env";

/**
 * Cliente Supabase para GET /api/auth/callback: grava cookies de sessão no mesmo
 * {@link NextResponse} do redirect (necessário no App Router).
 */
export function createSupabaseAuthCallbackClient(
  request: NextRequest,
  redirectResponse: NextResponse,
) {
  const url = readSupabaseUrl();
  const anonKey = readSupabaseAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      "SUPABASE_URL/SUPABASE_ANON_KEY (ou NEXT_PUBLIC_*) em falta no servidor.",
    );
  }

  return createServerClient(url, anonKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options);
        });
      },
    },
  });
}
