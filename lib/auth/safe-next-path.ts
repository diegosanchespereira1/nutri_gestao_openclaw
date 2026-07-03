import { APP_DASHBOARD_PATH, LEGACY_INICIO_PATH } from "@/lib/routes";

/** Destino interno após login/callback — bloqueia open redirect (URLs absolutas, //, javascript:, etc.). */
const DEFAULT_SAFE_NEXT = APP_DASHBOARD_PATH;

/** Reescreve `/inicio` (e query/hash) para a rota actual do dashboard. */
function normalizeLegacyDashboardPath(trimmed: string, pathOnly: string): string {
  if (pathOnly !== LEGACY_INICIO_PATH) return trimmed;
  return `${APP_DASHBOARD_PATH}${trimmed.slice(pathOnly.length)}`;
}

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

  return normalizeLegacyDashboardPath(trimmed, pathOnly);
}

export type LoginRedirectReason = "session_expired";

/** URL de login que devolve o utilizador à página actual após autenticação. */
export function buildLoginRedirectPath(
  returnPath: string,
  options?: { reason?: LoginRedirectReason },
): string {
  const params = new URLSearchParams();
  params.set("next", safeNextPath(returnPath));
  if (options?.reason) {
    params.set("reason", options.reason);
  }
  return `/login?${params.toString()}`;
}
