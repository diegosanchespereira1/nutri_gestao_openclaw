import { isStructureOnlyItem } from "@/lib/checklists/is-structure-only-item";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";

/**
 * Decide se um item do modelo deve aparecer no dossiê/PDF de uma sessão.
 *
 * - Ativo (`archived_at` nulo) → entra
 * - Arquivado na ou após a criação da sessão → entra (histórico se o modelo
 *   foi editado depois do preenchimento)
 * - Arquivado antes da sessão → só entra se houver resposta nesta sessão
 *   (rede de segurança)
 */
export function isItemVisibleForSession(
  archivedAt: string | null | undefined,
  sessionCreatedAt: string,
  hasResponse: boolean,
): boolean {
  if (archivedAt == null || String(archivedAt).trim() === "") {
    return true;
  }
  const archivedMs = Date.parse(archivedAt);
  const sessionMs = Date.parse(sessionCreatedAt);
  if (
    Number.isFinite(archivedMs) &&
    Number.isFinite(sessionMs) &&
    archivedMs >= sessionMs
  ) {
    return true;
  }
  return hasResponse;
}

export type SessionVisibilityItem = {
  archived_at?: string | null;
  is_structure_only?: boolean;
};

/**
 * Conta itens avaliáveis visíveis para uma sessão (histórico / pending_count).
 * Exclui `is_structure_only` e itens arquivados antes de `sessionCreatedAt`.
 */
export function countVisibleTemplateItemsForSession(
  items: readonly SessionVisibilityItem[],
  sessionCreatedAt: string,
): number {
  let total = 0;
  for (const it of items) {
    if (Boolean(it.is_structure_only)) continue;
    if (!isItemVisibleForSession(it.archived_at, sessionCreatedAt, false)) {
      continue;
    }
    total += 1;
  }
  return total;
}

/**
 * Filtra o template para dossiê/PDF/score visual de uma sessão:
 * remove itens excluídos antes do preenchimento e seções que ficarem vazias.
 * Recalcula `total_item_count` e `required_item_count`.
 */
export function filterTemplateForSession(
  template: ChecklistTemplateWithSections,
  sessionCreatedAt: string,
  respondedItemIds: ReadonlySet<string>,
): ChecklistTemplateWithSections {
  const sections = template.sections
    .map((sec) => {
      const items = sec.items.filter((it) =>
        isItemVisibleForSession(
          it.archived_at,
          sessionCreatedAt,
          respondedItemIds.has(it.id),
        ),
      );
      return { ...sec, items };
    })
    .filter((sec) => sec.items.length > 0);

  let required_item_count = 0;
  let total_item_count = 0;
  for (const sec of sections) {
    for (const it of sec.items) {
      if (isStructureOnlyItem(it)) continue;
      total_item_count += 1;
      if (it.is_required) required_item_count += 1;
    }
  }

  return {
    ...template,
    sections,
    required_item_count,
    total_item_count,
  };
}
