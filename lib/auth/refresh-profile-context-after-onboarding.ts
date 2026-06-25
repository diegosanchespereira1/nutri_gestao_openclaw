import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import {
  APP_PROFILE_CTX_COOKIE,
  appSessionCookieOptions,
  getAppSessionAbsoluteMaxSec,
  getProfileCtxTtlSec,
} from "@/lib/auth/app-session-cookies";
import {
  parseProfileContextCookie,
  type ProfileContextCookie,
} from "@/lib/auth/profile-context-cookie";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { fetchProfileGuardContext } from "@/lib/supabase/profile";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";

/**
 * Atualiza `ng_profile_ctx` após concluir o onboarding para o middleware não
 * reutilizar `needsOnboarding: true` em cache e redireccionar de volta ao wizard.
 */
export async function refreshProfileContextAfterOnboarding(
  supabase: SupabaseClient,
  userId: string,
  options?: { workspaceOwnerId?: string },
): Promise<void> {
  const cookieStore = await cookies();
  const existing = parseProfileContextCookie(
    cookieStore.get(APP_PROFILE_CTX_COOKIE)?.value,
  );
  const workspaceOwnerId =
    options?.workspaceOwnerId ??
    (await getWorkspaceAccountOwnerId(supabase, userId));
  const nowSec = Math.floor(Date.now() / 1000);

  let next: ProfileContextCookie;

  if (existing?.userId === userId) {
    next = {
      ...existing,
      workspaceOwnerId,
      needsOnboarding: false,
      cachedAt: nowSec,
    };
  } else {
    const guard = await fetchProfileGuardContext(supabase, userId);
    next = {
      userId,
      workspaceOwnerId,
      role: guard.role,
      timeZone: guard.timeZone,
      fullName: guard.fullName,
      lgpdBlocked: guard.lgpdBlocked,
      needsOnboarding: false,
      cachedAt: nowSec,
      enabledModules: guard.enabledModules,
    };
  }

  const profileCtxTtlSec = getProfileCtxTtlSec();
  const profileCookieMaxAge = Math.max(
    profileCtxTtlSec + 5,
    getAppSessionAbsoluteMaxSec() + 300,
  );

  cookieStore.set(
    APP_PROFILE_CTX_COOKIE,
    JSON.stringify(next),
    appSessionCookieOptions(getSupabaseCookieOptions(), profileCookieMaxAge),
  );
}
