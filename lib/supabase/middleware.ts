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
import { bumpAppSessionActivityCookies } from "@/lib/auth/bump-app-session-activity";
import { shouldReuseProfileContextCache } from "@/lib/auth/profile-context-cache";
import {
  encodeProfileContextForHeader,
  parseProfileContextCookie,
  PROFILE_CTX_REQUEST_HEADER,
  type ProfileContextCookie,
} from "@/lib/auth/profile-context-cookie";
import {
  isAuthPublicPath,
  isAdminPath,
  isPathAllowedWhenLgpdBlocked,
  isProtectedPath,
} from "@/lib/auth-paths";
import { buildLoginRedirectPath } from "@/lib/auth/safe-next-path";
import { isNativeClientRequest } from "@/lib/auth/native-client-cookie";
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
import { isPathAllowedForEnabledModules, buildModuleBlockedDashboardPath, getModuleGateForPath } from "@/lib/modules/module-path-access";
import { APP_DASHBOARD_PATH } from "@/lib/routes";
import { loadWorkspaceEnabledModules } from "@/lib/modules/load-workspace-enabled-modules";

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

/** Repassa o perfil ao RSC no mesmo pedido (antes do browser gravar `ng_profile_ctx`). */
function forwardProfileContextInRequest(
  request: NextRequest,
  response: NextResponse,
  profileCtx: MiddlewareProfileContext | null,
): NextResponse {
  if (!profileCtx) return response;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  requestHeaders.set(
    PROFILE_CTX_REQUEST_HEADER,
    encodeProfileContextForHeader(profileCtx),
  );

  const forwarded = NextResponse.next({
    request: { headers: requestHeaders },
  });
  copyCookies(response, forwarded);
  return forwarded;
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
  const nativeClient = isNativeClientRequest(request);
  const startRaw = request.cookies.get(APP_SESSION_START_COOKIE)?.value;
  const startParsed = startRaw ? Number.parseInt(startRaw, 10) : NaN;

  const res = nextWithPathname(request);
  const bumped = bumpAppSessionActivityCookies(res.cookies, {
    nativeClient,
    sessionStartSec: Number.isFinite(startParsed) ? startParsed : null,
  });
  return bumped ? res : null;
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
  const nativeClient = isNativeClientRequest(request);

  if (!user) {
    clearAppSessionCookies(supabaseResponse.cookies);
  } else {
    const now = Math.floor(Date.now() / 1000);
    const absSec = getAppSessionAbsoluteMaxSec({ nativeClient });
    const idleSec = getAppSessionIdleTimeoutSec({ nativeClient });

    const startRaw = request.cookies.get(APP_SESSION_START_COOKIE)?.value;
    const lastRaw = request.cookies.get(APP_SESSION_LAST_COOKIE)?.value;
    const startParsed = startRaw ? Number.parseInt(startRaw, 10) : NaN;
    const lastParsed = lastRaw ? Number.parseInt(lastRaw, 10) : NaN;

    const needSetStartCookie = !Number.isFinite(startParsed);
    const anchorStart: number = needSetStartCookie ? now : startParsed;

    let expired = false;
    if (!nativeClient) {
      expired = now - anchorStart > absSec;
      const activityRef = Number.isFinite(lastParsed) ? lastParsed : anchorStart;
      if (!expired && now - activityRef > idleSec) {
        expired = true;
      }
    }

    if (expired) {
      await supabase.auth.signOut();
      const returnTo = `${pathname}${request.nextUrl.search}`;
      const loginUrl = new URL(
        buildLoginRedirectPath(returnTo, { reason: "session_expired" }),
        request.url,
      );
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

  if (!user && isProtectedPath(pathname)) {
    const returnTo = `${pathname}${request.nextUrl.search}`;
    const loginUrl = new URL(buildLoginRedirectPath(returnTo), request.url);
    const redirectRes = NextResponse.redirect(loginUrl);
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  const isAuthEntryPath =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";

  let profileCtx: MiddlewareProfileContext | null = null;
  if (user && (isProtectedPath(pathname) || isAuthEntryPath)) {
    const nowSec = Math.floor(Date.now() / 1000);
    const profileCtxTtlSec = getProfileCtxTtlSec();
    const cachedProfileCtx = parseProfileContextCookieFromRequest(
      request.cookies.get(APP_PROFILE_CTX_COOKIE)?.value,
    );
    const sessStartRaw = request.cookies.get(APP_SESSION_START_COOKIE)?.value;
    const isNewAppSession = !Number.isFinite(
      Number.parseInt(sessStartRaw ?? "", 10),
    );
    const canReuseCache = shouldReuseProfileContextCache({
      isNewAppSession,
      cached: cachedProfileCtx,
      userId: user.id,
      nowSec,
      ttlSec: profileCtxTtlSec,
      pathname,
      bemvindoParam: request.nextUrl.searchParams.get("bemvindo"),
    });

    if (canReuseCache && cachedProfileCtx) {
      // Cache fresco: reutiliza workspaceOwnerId e modules (sem RPC).
      // Mudanças em team_members invalidam no próximo TTL / nova sessão.
      profileCtx = cachedProfileCtx;
    } else {
      try {
        const workspaceOwnerId = await withTimeout(
          getWorkspaceAccountOwnerId(supabase, user.id),
          "workspace_account_owner_id",
        );
        const [guard, clientCount, enabledModules] = await Promise.all([
          withTimeout(fetchProfileGuardContext(supabase, user.id), "fetch_profile_guard_context"),
          withTimeout(
            countClientsForOwner(supabase, workspaceOwnerId),
            "count_clients_for_owner",
          ),
          withTimeout(
            loadWorkspaceEnabledModules(supabase, workspaceOwnerId),
            "load_workspace_enabled_modules",
          ),
        ]);
        const needsOnboarding = guard.onboardingCompletedAt == null && clientCount === 0;
        profileCtx = {
          userId: user.id,
          workspaceOwnerId,
          role: guard.role,
          timeZone: guard.timeZone,
          fullName: guard.fullName,
          lgpdBlocked: guard.lgpdBlocked,
          needsOnboarding,
          cachedAt: nowSec,
          enabledModules,
        };
      } catch (error) {
        logAuthMiddleware("warn", requestId, "profile_guard_context_failed", {
          userId: user.id,
          pathname,
          error: error instanceof Error ? error.message : "unknown",
        });
        // Não forçar workspaceOwnerId = user.id: para membros de equipe isso
        // esvazia clientes/equipe até o próximo refresh. Preferir cache anterior.
        const previousOwnerId =
          cachedProfileCtx?.userId === user.id &&
          cachedProfileCtx.workspaceOwnerId.length > 0
            ? cachedProfileCtx.workspaceOwnerId
            : null;
        profileCtx = {
          userId: user.id,
          workspaceOwnerId: previousOwnerId ?? user.id,
          role: cachedProfileCtx?.userId === user.id ? cachedProfileCtx.role : null,
          timeZone:
            cachedProfileCtx?.userId === user.id
              ? cachedProfileCtx.timeZone
              : "America/Sao_Paulo",
          fullName:
            cachedProfileCtx?.userId === user.id
              ? cachedProfileCtx.fullName
              : null,
          lgpdBlocked: false,
          needsOnboarding: false,
          cachedAt: nowSec,
          enabledModules:
            cachedProfileCtx?.userId === user.id
              ? cachedProfileCtx.enabledModules
              : { ...DEFAULT_ENABLED_MODULES },
        };
      }
    }

    // maxAge do cookie deve cobrir a sessão da app: o TTL lógico (`cachedAt`) é curto
    // para refrescar role/onboarding, mas se maxAge ≈ TTL o browser apaga o cookie e o
    // layout (app) redirecciona para /login com pedido sem `ng_profile_ctx`.
    const profileCookieMaxAge = Math.max(
      profileCtxTtlSec + 5,
      getAppSessionAbsoluteMaxSec({ nativeClient }) + 300,
    );
    supabaseResponse.cookies.set(
      APP_PROFILE_CTX_COOKIE,
      JSON.stringify(profileCtx),
      appSessionCookieOptions(baseCookie, profileCookieMaxAge),
    );
  }

  if (user && isAuthEntryPath) {
    const redirectRes = NextResponse.redirect(new URL(APP_DASHBOARD_PATH, request.url));
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
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
      const redirectRes = NextResponse.redirect(new URL(APP_DASHBOARD_PATH, request.url));
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
      const redirectRes = NextResponse.redirect(new URL(APP_DASHBOARD_PATH, request.url));
      copyCookies(supabaseResponse, redirectRes);
      logAuthMiddleware("warn", requestId, "admin_access_denied_redirect", {
        userId: user.id,
        pathname,
        role,
      });
      return redirectRes;
    }
  }

  if (
    user &&
    isProtectedPath(pathname) &&
    !isAdminPath(pathname) &&
    profileCtx &&
    !isPathAllowedForEnabledModules(
      pathname,
      profileCtx.enabledModules ?? DEFAULT_ENABLED_MODULES,
    )
  ) {
    const gate = getModuleGateForPath(pathname);
    const blockedPath = gate
      ? buildModuleBlockedDashboardPath(gate)
      : APP_DASHBOARD_PATH;
    const redirectRes = NextResponse.redirect(new URL(blockedPath, request.url));
    copyCookies(supabaseResponse, redirectRes);
    logAuthMiddleware("info", requestId, "module_access_denied_redirect", {
      userId: user.id,
      pathname,
    });
    return redirectRes;
  }

  logAuthMiddleware("info", requestId, "session_ok", {
    pathname,
    hasUser: Boolean(user),
    elapsedMs: Date.now() - startedAt,
  });
  return forwardProfileContextInRequest(request, supabaseResponse, profileCtx);
}
