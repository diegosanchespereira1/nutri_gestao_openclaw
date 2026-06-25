import type { SupabaseClient } from "@supabase/supabase-js";

import { parseEnabledModules, type EnabledModules } from "@/lib/types/modules";

export async function loadWorkspaceEnabledModules(
  supabase: SupabaseClient,
  workspaceOwnerId: string,
): Promise<EnabledModules> {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "workspace_enabled_modules",
  );

  if (!rpcError && rpcData != null) {
    return parseEnabledModules(rpcData);
  }

  const { data } = await supabase
    .from("profiles")
    .select("enabled_modules")
    .eq("user_id", workspaceOwnerId)
    .maybeSingle();

  return parseEnabledModules(
    data && typeof data === "object" && "enabled_modules" in data
      ? (data as { enabled_modules: unknown }).enabled_modules
      : null,
  );
}
