import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import {
  APP_SESSION_LAST_COOKIE,
  APP_SESSION_START_COOKIE,
  appSessionCookieOptions,
  getAppSessionAbsoluteMaxSec,
  getAppSessionIdleTimeoutSec,
} from "@/lib/auth/app-session-cookies";
import {
  isAdminPath,
  isPathAllowedWhenLgpdBlocked,
  isProtectedPath,
} from "@/lib/auth-paths";
import { canAccessAdminArea } from "@/lib/roles";
import {
  fetchProfileRole,
  profileLgpdBlocked,
  profileNeedsOnboarding,
} from "@/lib/supabase/profile";
import { readSupabaseAnonKey, readSupabaseUrl } from "@/lib/supabase/runtime-env";

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

export async function updateSession(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const url = readSupabaseUrl();
  const anonKey = readSupabaseAnonKey();
  const pathname = request.nextUrl.pathname;

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
    supabaseResponse.cookies.delete(APP_SESSION_START_COOKIE);
    supabaseResponse.cookies.delete(APP_SESSION_LAST_COOKIE);
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
      redirectRes.cookies.delete(APP_SESSION_START_COOKIE);
      redirectRes.cookies.delete(APP_SESSION_LAST_COOKIE);
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

  if (
    user &&
    isProtectedPath(pathname) &&
    !isPathAllowedWhenLgpdBlocked(pathname)
  ) {
    let blocked = false;
    try {
      blocked = await withTimeout(
        profileLgpdBlocked(supabase, user.id),
        "profile_lgpd_blocked",
      );
    } catch (error) {
      logAuthMiddleware("warn", requestId, "profile_lgpd_check_failed", {
        userId: user.id,
        pathname,
        error: error instanceof Error ? error.message : "unknown",
      });
      blocked = false;
    }
    if (blocked) {
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
    let needsOnboarding = false;
    try {
      needsOnboarding = await withTimeout(
        profileNeedsOnboarding(supabase, user.id),
        "profile_needs_onboarding",
      );
    } catch (error) {
      logAuthMiddleware("warn", requestId, "profile_needs_onboarding_failed", {
        userId: user.id,
        pathname,
        error: error instanceof Error ? error.message : "unknown",
      });
      needsOnboarding = false;
    }
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
    let role = null;
    try {
      role = await withTimeout(fetchProfileRole(supabase, user.id), "fetch_profile_role");
    } catch (error) {
      logAuthMiddleware("warn", requestId, "fetch_profile_role_failed", {
        userId: user.id,
        pathname,
        error: error instanceof Error ? error.message : "unknown",
      });
      role = null;
    }
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
