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
    filterSessionsForInheritance(
      candidates,
      currentAreaId,
      singleEstablishmentAreaId,
    )[0] ?? null
  );
}

/** Sessões anteriores com a mesma área lógica (inclui normalização de área única). */
export function filterSessionsForInheritance(
  candidates: InheritanceSessionCandidate[],
  currentAreaId: string | null | undefined,
  singleEstablishmentAreaId: string | null,
): InheritanceSessionCandidate[] {
  return candidates.filter((s) =>
    sessionAreaMatchesForInheritance(
      s.area_id,
      currentAreaId,
      singleEstablishmentAreaId,
    ),
  );
}

/**
 * Ordem de busca entre sessões aprovadas: por data de aprovação (mais recentes
 * primeiro) e, em seguida, por data de atualização, sem repetir IDs já listados.
 * Somente dossiês finalizados/aprovados são considerados fonte de herança.
 */
export function buildInheritanceSessionOrder(
  approvedCandidates: InheritanceSessionCandidate[],
  recentCandidates: InheritanceSessionCandidate[],
  currentAreaId: string | null | undefined,
  singleEstablishmentAreaId: string | null,
): string[] {
  const approved = filterSessionsForInheritance(
    approvedCandidates,
    currentAreaId,
    singleEstablishmentAreaId,
  );
  const approvedIds = new Set(approved.map((s) => s.id));
  const recent = filterSessionsForInheritance(
    recentCandidates,
    currentAreaId,
    singleEstablishmentAreaId,
  ).filter((s) => !approvedIds.has(s.id));
  return [...approved.map((s) => s.id), ...recent.map((s) => s.id)];
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

export function isInheritableResponseRow(
  row: ChecklistFillItemResponseRow & { workspace_item_id?: string | null },
  inheritableItemIds: Set<string>,
  todayIso: string,
): boolean {
  if (!row.outcome) return false;
  const validUntil = String(row.valid_until ?? "").slice(0, 10);
  if (!validUntil || validUntil < todayIso) return false;
  const itemId = readAnyFillResponseItemId(row);
  return Boolean(itemId && inheritableItemIds.has(itemId));
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
  return srcRows.filter((r) =>
    isInheritableResponseRow(r, inheritableItemIds, todayIso),
  );
}

/** IDs de itens que já têm resposta na sessão atual (herança idempotente). */
export function collectExistingResponseItemIds(
  rows: Array<
    ChecklistFillItemResponseRow & { workspace_item_id?: string | null }
  >,
): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    const itemId = readAnyFillResponseItemId(row);
    if (itemId) ids.add(itemId);
  }
  return ids;
}

/**
 * Para cada item avaliável, escolhe a resposta vigente da sessão mais recente
 * (na ordem dada) que ainda possua valid_until >= hoje.
 */
export function collectLatestValidResponsePerItem(
  sessionOrder: string[],
  srcRows: Array<
    ChecklistFillItemResponseRow & { workspace_item_id?: string | null }
  >,
  inheritableItemIds: Set<string>,
  todayIso: string,
): Array<
  ChecklistFillItemResponseRow & { workspace_item_id?: string | null }
> {
  if (sessionOrder.length === 0) return [];

  const rowsBySession = new Map<
    string,
    Array<ChecklistFillItemResponseRow & { workspace_item_id?: string | null }>
  >();
  for (const row of srcRows) {
    const sessionId = String(row.session_id);
    const list = rowsBySession.get(sessionId);
    if (list) {
      list.push(row);
    } else {
      rowsBySession.set(sessionId, [row]);
    }
  }

  const byItemId = new Map<
    string,
    ChecklistFillItemResponseRow & { workspace_item_id?: string | null }
  >();

  for (const sessionId of sessionOrder) {
    for (const row of rowsBySession.get(sessionId) ?? []) {
      if (!isInheritableResponseRow(row, inheritableItemIds, todayIso)) continue;
      const itemId = readAnyFillResponseItemId(row);
      if (!itemId || byItemId.has(itemId)) continue;
      byItemId.set(itemId, row);
    }
  }

  return Array.from(byItemId.values());
}
