/**
 * Origin usado em redirectTo / emailRedirectTo.
 * Defina NEXT_PUBLIC_SITE_URL se o email abrir noutro host que o da barra de endereços (ex. 127.0.0.1 vs localhost).
 */
export function getBrowserAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window === "undefined") return "";
  return window.location.origin;
}
