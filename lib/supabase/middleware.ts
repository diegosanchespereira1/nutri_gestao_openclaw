import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { isAdminPath, isProtectedPath } from "@/lib/auth-paths";
import { canAccessAdminArea } from "@/lib/roles";
import {
  fetchProfileRole,
  profileNeedsOnboarding,
} from "@/lib/supabase/profile";

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;

  if (!url || !anonKey) {
    return nextWithPathname(request);
  }

  let supabaseResponse = nextWithPathname(request);

  const supabase = createServerClient(url, anonKey, {
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
