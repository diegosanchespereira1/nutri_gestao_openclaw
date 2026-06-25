import { cookies, headers } from "next/headers";

import { APP_PROFILE_CTX_COOKIE } from "@/lib/auth/app-session-cookies";
import {
  decodeProfileContextFromRequestHeader,
  parseProfileShellContextCookie,
  PROFILE_CTX_REQUEST_HEADER,
  type ProfileShellContextCookie,
} from "@/lib/auth/profile-context-cookie";
import { loadWorkspaceEnabledModules } from "@/lib/modules/load-workspace-enabled-modules";
import { isProfileRole } from "@/lib/roles";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { DEFAULT_PROFILE_TIME_ZONE, normalizeAppTimeZone } from "@/lib/timezones";

/**
 * Contexto do shell autenticado: cookie `ng_profile_ctx`, header do middleware
 * (mesmo pedido pós-login) ou fallback à sessão Supabase + perfil do workspace.
 */
export async function resolveAppShellContext(): Promise<ProfileShellContextCookie | null> {
  const [cookieStore, headersList] = await Promise.all([cookies(), headers()]);

  const fromCookie = parseProfileShellContextCookie(
    cookieStore.get(APP_PROFILE_CTX_COOKIE)?.value,
  );
  if (fromCookie?.userId) return fromCookie;

  const fromHeader = decodeProfileContextFromRequestHeader(
    headersList.get(PROFILE_CTX_REQUEST_HEADER),
  );
  if (fromHeader?.userId) return fromHeader;

  const { user, workspaceOwnerId, supabase } = await getServerContext();
  const userId = user?.id;
  if (!userId) return null;

  const ownerId = workspaceOwnerId ?? userId;
  const [enabledModules, profileResult] = await Promise.all([
    loadWorkspaceEnabledModules(supabase, ownerId),
    supabase
      .from("profiles")
      .select("role, timezone, full_name")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const row = profileResult.data;
  const role = row?.role && isProfileRole(row.role) ? row.role : null;
  const timeZone = row?.timezone
    ? normalizeAppTimeZone(row.timezone)
    : DEFAULT_PROFILE_TIME_ZONE;
  const fullName =
    typeof row?.full_name === "string" && row.full_name.trim().length > 0
      ? row.full_name
      : null;

  return {
    userId,
    role,
    timeZone,
    fullName,
    enabledModules,
  };
}
