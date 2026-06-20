import {
  APP_SESSION_LAST_COOKIE,
  APP_SESSION_START_COOKIE,
  appSessionCookieOptions,
  getAppSessionAbsoluteMaxSec,
  getAppSessionIdleTimeoutSec,
} from "@/lib/auth/app-session-cookies";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

type CookieWriter = {
  set: (name: string, value: string, options?: object) => void;
};

/**
 * Renova cookies de atividade da app (`ng_sess_*`) para evitar falso idle timeout
 * quando o utilizador interage sobretudo via Server Actions (sem GET ao middleware).
 */
export function bumpAppSessionActivityCookies(
  cookies: CookieWriter,
  options?: {
    nativeClient?: boolean;
    sessionStartSec?: number | null;
  },
): boolean {
  const nativeClient = options?.nativeClient ?? false;
  const now = Math.floor(Date.now() / 1000);
  const absSec = getAppSessionAbsoluteMaxSec({ nativeClient });
  const idleSec = getAppSessionIdleTimeoutSec({ nativeClient });
  const baseCookie = getSupabaseCookieOptions();

  const startParsed = options?.sessionStartSec ?? null;
  const hasStart = startParsed != null && Number.isFinite(startParsed);

  if (hasStart && !nativeClient && now - startParsed > absSec) {
    return false;
  }

  if (!hasStart) {
    cookies.set(
      APP_SESSION_START_COOKIE,
      String(now),
      appSessionCookieOptions(baseCookie, absSec + 300),
    );
  }

  cookies.set(
    APP_SESSION_LAST_COOKIE,
    String(now),
    appSessionCookieOptions(baseCookie, idleSec + 300),
  );
  return true;
}
