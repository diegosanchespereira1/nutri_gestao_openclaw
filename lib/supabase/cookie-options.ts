import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Opções de cookie partilhadas entre createBrowserClient e createServerClient.
 * Em produção com HTTPS, `secure: true` evita inconsistência com o browser e falhas
 * de refresh / GET /user com session_not_found.
 */
export function getSupabaseCookieOptions(): CookieOptionsWithName {
  const siteHttps =
    typeof process.env.NEXT_PUBLIC_SITE_URL === "string" &&
    process.env.NEXT_PUBLIC_SITE_URL.startsWith("https://");

  return {
    path: "/",
    sameSite: "lax",
    secure: siteHttps || process.env.NODE_ENV === "production",
  };
}
