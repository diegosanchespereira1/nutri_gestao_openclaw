import "server-only";

import { redirect } from "next/navigation";

import { getServerContext } from "@/lib/supabase/get-server-user";

import { loadTenantLimits } from "./tenant-limits";

/**
 * Cadastro de equipe habilitado para o workspace atual? (T5)
 * Plano: docs/plano-limites-tenant-e-billing.md §5.3
 *
 * Sem linha de limites não bloqueia — mesma escolha do trigger no banco.
 */
export async function isTeamMembersEnabled(): Promise<boolean> {
  const { supabase, workspaceOwnerId } = await getServerContext();
  if (!workspaceOwnerId) redirect("/login");

  const limits = await loadTenantLimits(supabase, workspaceOwnerId);
  if (!limits) return true;
  return limits.team_members_enabled;
}

/**
 * Guard das rotas internas de equipe (`/equipe/nova`, `/equipe/[id]/editar`).
 *
 * Manda de volta para `/equipe`, que explica por que o recurso não está
 * disponível — em vez de jogar o utilizador no dashboard sem contexto.
 */
export async function requireTeamMembersEnabled(): Promise<void> {
  if (await isTeamMembersEnabled()) return;
  redirect("/equipe");
}
