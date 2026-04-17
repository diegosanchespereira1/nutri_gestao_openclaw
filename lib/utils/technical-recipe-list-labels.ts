import type { TechnicalRecipeListItem } from "@/lib/types/technical-recipes";

import { clientIdFromRecipeEstablishmentJoin } from "@/lib/utils/establishment-client-label";

/** `client_id` na receita ou derivado do estabelecimento (lista / favoritos). */
export function recipeClientIdForListRow(
  row: TechnicalRecipeListItem,
): string | null {
  if (typeof row.client_id === "string" && row.client_id.length > 0) {
    return row.client_id;
  }
  return clientIdFromRecipeEstablishmentJoin(row.establishments);
}

export function recipeContextLabel(row: TechnicalRecipeListItem): string {
  // FR-REC-001: usar o campo `contexto` quando disponível; fallback para establishment_id
  const isRepositorio =
    row.contexto === "REPOSITORIO" || row.establishment_id == null;

  if (isRepositorio) {
    const rc = row.recipe_scope_client;
    const clientName =
      rc?.trade_name?.trim() || rc?.legal_name?.trim() || "Cliente PJ";
    return `${clientName} — Repositório de Receitas`;
  }

  const est = row.establishments;
  if (!est?.name) return "—";
  const client = est.clients ?? undefined;
  const clientName =
    client?.trade_name?.trim() || client?.legal_name?.trim() || "Cliente";
  return `${clientName} — ${est.name}`;
}
