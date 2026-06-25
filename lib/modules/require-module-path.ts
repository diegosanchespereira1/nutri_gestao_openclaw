import { redirect } from "next/navigation";

import { loadWorkspaceEnabledModules } from "@/lib/modules/load-workspace-enabled-modules";
import {
  buildModuleBlockedInicioPath,
  getModuleGateForPath,
  isPathAllowedForEnabledModules,
} from "@/lib/modules/module-path-access";
import { getServerContext } from "@/lib/supabase/get-server-user";

/** Garante acesso à rota apenas quando o módulo do tenant está habilitado. */
export async function requireModulePathAccess(pathname: string): Promise<void> {
  const { supabase, workspaceOwnerId } = await getServerContext();
  if (!workspaceOwnerId) redirect("/login");

  const enabledModules = await loadWorkspaceEnabledModules(
    supabase,
    workspaceOwnerId,
  );

  if (isPathAllowedForEnabledModules(pathname, enabledModules)) return;

  const gate = getModuleGateForPath(pathname);
  redirect(gate ? buildModuleBlockedInicioPath(gate) : "/inicio");
}
