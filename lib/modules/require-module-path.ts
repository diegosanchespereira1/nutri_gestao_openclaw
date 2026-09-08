import { redirect } from "next/navigation";

import { APP_DASHBOARD_PATH } from "@/lib/routes";
import {
  canAccessComingSoonModules,
  isComingSoonPath,
} from "@/lib/modules/coming-soon-modules";
import { loadWorkspaceEnabledModules } from "@/lib/modules/load-workspace-enabled-modules";
import {
  buildModuleBlockedDashboardPath,
  getModuleGateForPath,
  isPathAllowedForEnabledModules,
} from "@/lib/modules/module-path-access";
import { getServerContext } from "@/lib/supabase/get-server-user";

/** Garante acesso à rota apenas quando o módulo do tenant está habilitado. */
export async function requireModulePathAccess(pathname: string): Promise<void> {
  const { supabase, workspaceOwnerId, user } = await getServerContext();
  if (!workspaceOwnerId) redirect("/login");

  if (
    isComingSoonPath(pathname) &&
    !canAccessComingSoonModules({
      userId: user?.id,
      email: user?.email,
    })
  ) {
    redirect(APP_DASHBOARD_PATH);
  }

  const enabledModules = await loadWorkspaceEnabledModules(
    supabase,
    workspaceOwnerId,
  );

  if (isPathAllowedForEnabledModules(pathname, enabledModules)) return;

  const gate = getModuleGateForPath(pathname);
  redirect(gate ? buildModuleBlockedDashboardPath(gate) : APP_DASHBOARD_PATH);
}
