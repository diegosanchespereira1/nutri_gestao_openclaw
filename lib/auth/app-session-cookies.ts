import type { CookieOptionsWithName } from "@supabase/ssr";

/** Âncora da sessão na app (login): limite máximo absoluto desde este instante. */
export const APP_SESSION_START_COOKIE = "ng_sess_start";

/** Última actividade (pedido HTTP à aplicação): inactividade = fim de sessão. */
export const APP_SESSION_LAST_COOKIE = "ng_sess_last";

const ABS_FALLBACK_SEC = 8 * 60 * 60; // 8 h
const IDLE_FALLBACK_SEC = 45 * 60; // 45 min

function parsePositiveInt(raw: string | undefined, fallback: number, min: number): number {
  if (raw == null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min) return fallback;
  return n;
}

/**
 * Tempo máximo (segundos) em que o utilizador permanece autenticado na app após o início
 * da sessão local (primeiro pedido autenticado após login), independentemente de renovações JWT.
 */
export function getAppSessionAbsoluteMaxSec(): number {
  return parsePositiveInt(
    process.env.AUTH_SESSION_ABSOLUTE_MAX_SEC,
    ABS_FALLBACK_SEC,
    300, // mín. 5 min — evita valores absurdos em produção
  );
}

/**
 * Inactividade máxima (segundos): sem pedidos à app (middleware), sessão termina.
 */
export function getAppSessionIdleTimeoutSec(): number {
  return parsePositiveInt(
    process.env.AUTH_SESSION_IDLE_TIMEOUT_SEC,
    IDLE_FALLBACK_SEC,
    60, // mín. 1 min
  );
}

export function appSessionCookieOptions(
  base: CookieOptionsWithName,
  maxAge: number,
): CookieOptionsWithName & { httpOnly: true; maxAge: number } {
  return {
    ...base,
    httpOnly: true,
    maxAge,
  };
}
