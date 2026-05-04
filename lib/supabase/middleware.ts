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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    const blocked = await profileLgpdBlocked(supabase, user.id);
    if (blocked) {
      const redirectRes = NextResponse.redirect(
        new URL("/conta-bloqueada", request.url),
      );
      copyCookies(supabaseResponse, redirectRes);
      return redirectRes;
    }
  }

  if (user && isProtectedPath(pathname)) {
    const onOnboardingRoute =
      pathname === "/onboarding" || pathname.startsWith("/onboarding/");
    const needsOnboarding = await profileNeedsOnboarding(supabase, user.id);
    if (needsOnboarding && !onOnboardingRoute) {
      const redirectRes = NextResponse.redirect(
        new URL("/onboarding", request.url),
      );
      copyCookies(supabaseResponse, redirectRes);
      return redirectRes;
    }
    if (!needsOnboarding && onOnboardingRoute) {
      const redirectRes = NextResponse.redirect(new URL("/inicio", request.url));
      copyCookies(supabaseResponse, redirectRes);
      return redirectRes;
    }
  }

  if (user && isAdminPath(pathname)) {
    const role = await fetchProfileRole(supabase, user.id);
    if (!canAccessAdminArea(role)) {
      const redirectRes = NextResponse.redirect(new URL("/inicio", request.url));
      copyCookies(supabaseResponse, redirectRes);
      return redirectRes;
    }
  }

  return supabaseResponse;
}
