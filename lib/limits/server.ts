import "server-only";

import { getServerContext } from "@/lib/supabase/get-server-user";

import {
  buildLimitUiState,
  countTenantUsage,
  loadTenantLimits,
  type LimitKind,
  type LimitUiState,
} from "./tenant-limits";

/**
 * Estado do limite para a UI do tenant (T5).
 * Plano: docs/plano-limites-tenant-e-billing.md §5.3
 *
 * Sem workspace resolvido, devolve estado "sem limite" — a UI não deve quebrar
 * por causa de um estado de sessão transitório.
 */
export async function loadLimitUiState(kind: LimitKind): Promise<LimitUiState> {
  const { supabase, workspaceOwnerId } = await getServerContext();
  if (!workspaceOwnerId) {
    return {
      used: 0,
      limit: null,
      remaining: null,
      blocked: false,
      message: null,
    };
  }

  const [limits, used] = await Promise.all([
    loadTenantLimits(supabase, workspaceOwnerId),
    countTenantUsage(supabase, workspaceOwnerId, kind),
  ]);

  return buildLimitUiState(kind, limits, used);
}
