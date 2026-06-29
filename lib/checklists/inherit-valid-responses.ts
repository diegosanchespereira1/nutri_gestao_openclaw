import type { ChecklistFillItemResponseRow } from "@/lib/types/checklist-fill";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";

import { isStructureOnlyItem } from "@/lib/checklists/is-structure-only-item";

export type FillItemResponseColumn =
  | "template_item_id"
  | "custom_item_id"
  | "workspace_item_id";

export type InheritanceSessionCandidate = {
  id: string;
  area_id?: string | null;
};

export function normalizeInheritanceAreaId(
  areaId: string | null | undefined,
  singleEstablishmentAreaId: string | null,
): string | null {
  const trimmed = areaId?.trim();
  if (trimmed) return trimmed;
  return singleEstablishmentAreaId;
}

export function sessionAreaMatchesForInheritance(
  sessionAreaId: string | null | undefined,
  currentAreaId: string | null | undefined,
  singleEstablishmentAreaId: string | null,
): boolean {
  const left = normalizeInheritanceAreaId(sessionAreaId, singleEstablishmentAreaId);
  const right = normalizeInheritanceAreaId(currentAreaId, singleEstablishmentAreaId);
  return left === right;
}

export function pickSourceSessionForInheritance(
  candidates: InheritanceSessionCandidate[],
  currentAreaId: string | null | undefined,
  singleEstablishmentAreaId: string | null,
): InheritanceSessionCandidate | null {
  return (
    candidates.find((s) =>
      sessionAreaMatchesForInheritance(
        s.area_id,
        currentAreaId,
        singleEstablishmentAreaId,
      ),
    ) ?? null
  );
}

export function collectEvaluableTemplateItemIds(
  template: ChecklistTemplateWithSections,
): Set<string> {
  const ids = new Set<string>();
  for (const sec of template.sections) {
    for (const item of sec.items) {
      if (!isStructureOnlyItem(item)) {
        ids.add(item.id);
      }
    }
  }
  return ids;
}

/** Todos os IDs de itens do modelo (inclui subseções só indicador). */
export function collectAllTemplateItemIds(
  template: ChecklistTemplateWithSections,
): Set<string> {
  const ids = new Set<string>();
  for (const sec of template.sections) {
    for (const item of sec.items) {
      ids.add(item.id);
    }
  }
  return ids;
}

export function readFillResponseItemId(
  row: ChecklistFillItemResponseRow & { workspace_item_id?: string | null },
  itemColumn: FillItemResponseColumn,
): string | null {
  const raw =
    itemColumn === "template_item_id"
      ? row.template_item_id
      : itemColumn === "custom_item_id"
        ? row.custom_item_id
        : row.workspace_item_id;
  if (raw == null) return null;
  const id = String(raw).trim();
  return id.length > 0 ? id : null;
}

/** Lê o ID do item em qualquer coluna preenchida (respostas legadas ou migrações). */
export function readAnyFillResponseItemId(
  row: ChecklistFillItemResponseRow & { workspace_item_id?: string | null },
): string | null {
  for (const col of [
    "template_item_id",
    "custom_item_id",
    "workspace_item_id",
  ] as const) {
    const id = readFillResponseItemId(row, col);
    if (id) return id;
  }
  return null;
}

export type SessionTemplateColumn =
  | "template_id"
  | "custom_template_id"
  | "workspace_template_id";

export function resolveSessionTemplateColumn(session: {
  workspace_template_id?: string | null;
  custom_template_id?: string | null;
  template_id?: string | null;
}): SessionTemplateColumn | null {
  if (session.workspace_template_id) return "workspace_template_id";
  if (session.custom_template_id) return "custom_template_id";
  if (session.template_id) return "template_id";
  return null;
}

export function resolveFillItemResponseColumn(session: {
  workspace_template_id?: string | null;
  custom_template_id?: string | null;
  template_id?: string | null;
}): FillItemResponseColumn | null {
  const sessionCol = resolveSessionTemplateColumn(session);
  if (sessionCol === "workspace_template_id") return "workspace_item_id";
  if (sessionCol === "custom_template_id") return "custom_item_id";
  if (sessionCol === "template_id") return "template_item_id";
  return null;
}

export function filterInheritableResponseRows(
  srcRows: Array<
    ChecklistFillItemResponseRow & { workspace_item_id?: string | null }
  >,
  inheritableItemIds: Set<string>,
  todayIso: string,
): Array<
  ChecklistFillItemResponseRow & { workspace_item_id?: string | null }
> {
  return srcRows.filter((r) => {
    if (!r.outcome) return false;
    const validUntil = String(r.valid_until ?? "").slice(0, 10);
    if (!validUntil || validUntil < todayIso) return false;
    const itemId = readAnyFillResponseItemId(r);
    return Boolean(itemId && inheritableItemIds.has(itemId));
  });
}
