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

/**
 * Origem absoluta para links em emails e server actions (sem `window`).
 * Preferir `NEXT_PUBLIC_SITE_URL`; em Vercel usa `VERCEL_URL` como fallback.
 */
export function getServerAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}
