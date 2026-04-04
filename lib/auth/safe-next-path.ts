/** Destino interno após login/callback — bloqueia open redirect (URLs absolutas, //, javascript:, etc.). */
const DEFAULT_SAFE_NEXT = "/inicio";

/**
 * Devolve um path seguro para `router.push`, `location.assign` ou `new URL(path, origin)`.
 * Aceita query string no mesmo origin (ex. `/visitas?x=1`) desde que o path principal seja relativo e seguro.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (raw == null) return DEFAULT_SAFE_NEXT;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_SAFE_NEXT;

  const pathOnly = trimmed.split(/[?#]/, 1)[0] ?? "";
  if (!pathOnly.startsWith("/") || pathOnly.startsWith("//")) {
    return DEFAULT_SAFE_NEXT;
  }
  if (pathOnly.includes(":") || pathOnly.includes("\\")) {
    return DEFAULT_SAFE_NEXT;
  }

  return trimmed;
}
