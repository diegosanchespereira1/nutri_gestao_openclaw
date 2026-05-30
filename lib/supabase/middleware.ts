import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { clearAppSessionCookies } from "@/lib/auth/clear-app-session-cookies";
import {
  APP_PROFILE_CTX_COOKIE,
  APP_SESSION_LAST_COOKIE,
  APP_SESSION_START_COOKIE,
  appSessionCookieOptions,
  getAppSessionAbsoluteMaxSec,
  getAppSessionIdleTimeoutSec,
  getProfileCtxTtlSec,
} from "@/lib/auth/app-session-cookies";
import {
  parseProfileContextCookie,
  type ProfileContextCookie,
} from "@/lib/auth/profile-context-cookie";
import {
  isAuthPublicPath,
  isAdminPath,
  isPathAllowedWhenLgpdBlocked,
  isProtectedPath,
} from "@/lib/auth-paths";
import { canAccessAdminArea } from "@/lib/roles";
import {
  countClientsForOwner,
  fetchProfileGuardContext,
} from "@/lib/supabase/profile";
import { logBudgetEvent } from "@/lib/observability/request-budget";
import { readSupabaseAnonKey, readSupabaseUrl } from "@/lib/supabase/runtime-env";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import {
  DEFAULT_ENABLED_MODULES,
} from "@/lib/types/modules";

const AUTH_MIDDLEWARE_TIMEOUT_MS = 4_500;

type AuthLogLevel = "info" | "warn" | "error";

function logAuthMiddleware(
  level: AuthLogLevel,
  requestId: string,
  event: string,
  metadata?: Record<string, unknown>,
) {
  const payload = {
    requestId,
    event,
    ...metadata,
  };
  if (level === "error") {
    console.error("[auth-middleware]", payload);
    return;
  }
  if (level === "warn") {
    console.warn("[auth-middleware]", payload);
    return;
  }
  console.info("[auth-middleware]", payload);
}

function timeoutError(step: string): Error {
  return new Error(`AUTH_MIDDLEWARE_TIMEOUT:${step}`);
}

async function withTimeout<T>(promise: Promise<T>, step: string): Promise<T> {
  return await Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(timeoutError(step)), AUTH_MIDDLEWARE_TIMEOUT_MS);
    }),
  ]);
}

/** Preserva path, maxAge, sameSite, etc. — sem isto a sessão pode perder-se nos redirects. */
function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

function nextWithPathname(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

function isPrefetchRequest(request: NextRequest): boolean {
  const purpose = request.headers.get("purpose");
  const nextRouterPrefetch = request.headers.get("next-router-prefetch");
  const middlewarePrefetch = request.headers.get("x-middleware-prefetch");
  return (
    purpose === "prefetch" ||
    nextRouterPrefetch === "1" ||
    middlewarePrefetch === "1"
  );
}

function isServerActionRequest(request: NextRequest): boolean {
  return request.headers.has("next-action");
}

type MiddlewareProfileContext = ProfileContextCookie;

/**
 * Server Actions não passam por getUser() (evita /auth/v1/user a cada autosave).
 * Actualiza só `ng_sess_last` quando a âncora `ng_sess_start` ainda está dentro do
 * limite absoluto — evita falso “idle timeout” durante preenchimento de checklists.
 */
function bumpAppSessionLastForServerActionIfEligible(
  request: NextRequest,
): NextResponse | null {
  const startRaw = request.cookies.get(APP_SESSION_START_COOKIE)?.value;
  const startParsed = startRaw ? Number.parseInt(startRaw, 10) : NaN;
  if (!Number.isFinite(startParsed)) return null;

  const now = Math.floor(Date.now() / 1000);
  const absSec = getAppSessionAbsoluteMaxSec();
  if (now - startParsed > absSec) return null;

  const baseCookie = getSupabaseCookieOptions();
  const idleSec = getAppSessionIdleTimeoutSec();
  const res = nextWithPathname(request);
  res.cookies.set(
    APP_SESSION_LAST_COOKIE,
    String(now),
    appSessionCookieOptions(baseCookie, idleSec + 300),
  );
  return res;
}

function parseProfileContextCookieFromRequest(
  raw: string | undefined,
): MiddlewareProfileContext | null {
  return parseProfileContextCookie(raw);
}

export async function updateSession(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const url = readSupabaseUrl();
  const anonKey = readSupabaseAnonKey();
  const pathname = request.nextUrl.pathname;
  const pathNeedsAuthGuard =
    isProtectedPath(pathname) ||
    isAuthPublicPath(pathname) ||
    pathname === "/conta-bloqueada";

  if (!pathNeedsAuthGuard) {
    return nextWithPathname(request);
  }

  if (isPrefetchRequest(request)) {
    return nextWithPathname(request);
  }

  // Server Actions já validam auth/autorização no próprio handler.
  // Evita duplicar /auth/v1/user + queries de profile em cada autosave.
  if (isServerActionRequest(request)) {
    const bumped = bumpAppSessionLastForServerActionIfEligible(request);
    return bumped ?? nextWithPathname(request);
  }

  if (!url || !anonKey) {
    return nextWithPathname(request);
  }

  let supabaseResponse = nextWithPathname(request);

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = nextWithPathname(request);
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const { data } = await withTimeout(supabase.auth.getUser(), "get_user");
    user = data.user;
    logBudgetEvent({
      service: "auth",
      endpoint: "/auth/v1/user",
      source: "middleware",
      userId: user?.id ?? null,
    });
  } catch (error) {
    logAuthMiddleware("error", requestId, "get_user_failed", {
      pathname,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "unknown",
    });
    return nextWithPathname(request);
  }

  logAuthMiddleware("info", requestId, "session_resolved", {
    pathname,
    hasUser: Boolean(user),
    elapsedMs: Date.now() - startedAt,
  });

  const baseCookie = getSupabaseCookieOptions();

  if (!user) {
    clearAppSessionCookies(supabaseResponse.cookies);
  } else {
    const now = Math.floor(Date.now() / 1000);
    const absSec = getAppSessionAbsoluteMaxSec();
    const idleSec = getAppSessionIdleTimeoutSec();

    const startRaw = request.cookies.get(APP_SESSION_START_COOKIE)?.value;
    const lastRaw = request.cookies.get(APP_SESSION_LAST_COOKIE)?.value;
    const startParsed = startRaw ? Number.parseInt(startRaw, 10) : NaN;
    const lastParsed = lastRaw ? Number.parseInt(lastRaw, 10) : NaN;

    const needSetStartCookie = !Number.isFinite(startParsed);
    const anchorStart: number = needSetStartCookie ? now : startParsed;

    let expired = now - anchorStart > absSec;

    const activityRef = Number.isFinite(lastParsed) ? lastParsed : anchorStart;
    if (!expired && now - activityRef > idleSec) {
      expired = true;
    }

    if (expired) {
      await supabase.auth.signOut();
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("reason", "session_expired");
      const redirectRes = NextResponse.redirect(loginUrl);
      copyCookies(supabaseResponse, redirectRes);
      clearAppSessionCookies(redirectRes.cookies);
      logAuthMiddleware("warn", requestId, "session_expired_redirect", {
        pathname,
        elapsedMs: Date.now() - startedAt,
      });
      return redirectRes;
    }

    if (needSetStartCookie) {
      supabaseResponse.cookies.set(
        APP_SESSION_START_COOKIE,
        String(now),
        appSessionCookieOptions(baseCookie, absSec + 300),
      );
    }

    supabaseResponse.cookies.set(
      APP_SESSION_LAST_COOKIE,
      String(now),
      appSessionCookieOptions(baseCookie, idleSec + 300),
    );
  }

  if (
    user &&
    (pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/forgot-password")
  ) {
    const redirectRes = NextResponse.redirect(new URL("/inicio", request.url));
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`,
    );
    const redirectRes = NextResponse.redirect(loginUrl);
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  let profileCtx: MiddlewareProfileContext | null = null;
  if (user && isProtectedPath(pathname)) {
    const nowSec = Math.floor(Date.now() / 1000);
    const profileCtxTtlSec = getProfileCtxTtlSec();
    const cachedProfileCtx = parseProfileContextCookieFromRequest(
      request.cookies.get(APP_PROFILE_CTX_COOKIE)?.value,
    );
    const sessStartRaw = request.cookies.get(APP_SESSION_START_COOKIE)?.value;
    const isNewAppSession = !Number.isFinite(
      Number.parseInt(sessStartRaw ?? "", 10),
    );
    const canReuseCache =
      !isNewAppSession &&
      cachedProfileCtx?.userId === user.id &&
      nowSec - cachedProfileCtx.cachedAt <= profileCtxTtlSec;

    if (canReuseCache) {
      profileCtx = cachedProfileCtx;
    } else {
      try {
        const guard = await withTimeout(
          fetchProfileGuardContext(supabase, user.id),
          "fetch_profile_guard_context",
        );
        const needsOnboarding =
          guard.onboardingCompletedAt == null &&
          (await withTimeout(
            countClientsForOwner(supabase, user.id),
            "count_clients_for_owner",
          )) === 0;
        const workspaceOwnerId = await withTimeout(
          getWorkspaceAccountOwnerId(supabase, user.id),
          "workspace_account_owner_id",
        );
        profileCtx = {
          userId: user.id,
          workspaceOwnerId,
          role: guard.role,
          timeZone: guard.timeZone,
          fullName: guard.fullName,
          lgpdBlocked: guard.lgpdBlocked,
          needsOnboarding,
          cachedAt: nowSec,
          enabledModules: guard.enabledModules,
        };
      } catch (error) {
        logAuthMiddleware("warn", requestId, "profile_guard_context_failed", {
          userId: user.id,
          pathname,
          error: error instanceof Error ? error.message : "unknown",
        });
        profileCtx = {
          userId: user.id,
          workspaceOwnerId: user.id,
          role: null,
          timeZone: "America/Sao_Paulo",
          fullName: null,
          lgpdBlocked: false,
          needsOnboarding: false,
          cachedAt: nowSec,
          enabledModules: { ...DEFAULT_ENABLED_MODULES },
        };
      }
    }

    // maxAge do cookie deve cobrir a sessão da app: o TTL lógico (`cachedAt`) é curto
    // para refrescar role/onboarding, mas se maxAge ≈ TTL o browser apaga o cookie e o
    // layout (app) redirecciona para /login com pedido sem `ng_profile_ctx`.
    const profileCookieMaxAge = Math.max(
      profileCtxTtlSec + 5,
      getAppSessionAbsoluteMaxSec() + 300,
    );
    supabaseResponse.cookies.set(
      APP_PROFILE_CTX_COOKIE,
      JSON.stringify(profileCtx),
      appSessionCookieOptions(baseCookie, profileCookieMaxAge),
    );
  }

  if (
    user &&
    isProtectedPath(pathname) &&
    !isPathAllowedWhenLgpdBlocked(pathname)
  ) {
    if (profileCtx?.lgpdBlocked) {
      const redirectRes = NextResponse.redirect(
        new URL("/conta-bloqueada", request.url),
      );
      copyCookies(supabaseResponse, redirectRes);
      logAuthMiddleware("info", requestId, "lgpd_blocked_redirect", {
        userId: user.id,
        pathname,
      });
      return redirectRes;
    }
  }

  if (user && isProtectedPath(pathname)) {
    const onOnboardingRoute =
      pathname === "/onboarding" || pathname.startsWith("/onboarding/");
    const needsOnboarding = profileCtx?.needsOnboarding ?? false;
    if (needsOnboarding && !onOnboardingRoute) {
      const redirectRes = NextResponse.redirect(
        new URL("/onboarding", request.url),
      );
      copyCookies(supabaseResponse, redirectRes);
      logAuthMiddleware("info", requestId, "onboarding_redirect", {
        userId: user.id,
        pathname,
      });
      return redirectRes;
    }
    if (!needsOnboarding && onOnboardingRoute) {
      const redirectRes = NextResponse.redirect(new URL("/inicio", request.url));
      copyCookies(supabaseResponse, redirectRes);
      logAuthMiddleware("info", requestId, "onboarding_skip_redirect", {
        userId: user.id,
        pathname,
      });
      return redirectRes;
    }
  }

  if (user && isAdminPath(pathname)) {
    const role = profileCtx?.role ?? null;
    if (!canAccessAdminArea(role)) {
      const redirectRes = NextResponse.redirect(new URL("/inicio", request.url));
      copyCookies(supabaseResponse, redirectRes);
      logAuthMiddleware("warn", requestId, "admin_access_denied_redirect", {
        userId: user.id,
        pathname,
        role,
      });
      return redirectRes;
    }
  }

  logAuthMiddleware("info", requestId, "session_ok", {
    pathname,
    hasUser: Boolean(user),
    elapsedMs: Date.now() - startedAt,
  });
  return supabaseResponse;
}
