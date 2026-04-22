import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
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
