import type {
  FillItemResponseState,
  FillResponsesMap,
} from "@/lib/types/checklist-fill";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";
import { isStructureOnlyItem } from "@/lib/checklists/is-structure-only-item";

type BatchScope = "section" | "all";

type PickBatchItemsInput = {
  scope: BatchScope;
  sectionItemIds: string[];
  responses: FillResponsesMap;
  dirtyItemIds: ReadonlySet<string>;
  forceAll: boolean;
};

export type FillBatchEntryPayload = {
  itemId: string;
  outcome: FillItemResponseState["outcome"];
  note: string | null;
  annotation: string | null;
  validUntil: string | null;
};

/**
 * Define quais itens devem ser persistidos em um ciclo de save.
 * - `forceAll=true`: salva todos os itens preenchidos no escopo.
 * - `forceAll=false`: salva apenas itens sujos (dirty) no escopo.
 */
export function pickBatchItemIdsForSave({
  scope,
  sectionItemIds,
  responses,
  dirtyItemIds,
  forceAll,
}: PickBatchItemsInput): string[] {
  const itemIds = scope === "section" ? sectionItemIds : Object.keys(responses);
  const out: string[] = [];

  for (const itemId of itemIds) {
    const response = responses[itemId];
    if (!response?.outcome) continue;
    if (!forceAll && !dirtyItemIds.has(itemId)) continue;
    out.push(itemId);
  }

  return out;
}

export function hasResponseChanged<T>(prevValue: T, nextValue: T): boolean {
  return prevValue !== nextValue;
}

function normalizeFillText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** Compara respostas de preenchimento ignorando espaços laterais em textos. */
export function fillResponsesEqual(
  a: FillItemResponseState | undefined,
  b: FillItemResponseState | undefined,
): boolean {
  const aOutcome = a?.outcome ?? null;
  const bOutcome = b?.outcome ?? null;
  if (aOutcome !== bOutcome) return false;
  if (!aOutcome && !bOutcome) return true;
  return (
    normalizeFillText(a?.note) === normalizeFillText(b?.note) &&
    normalizeFillText(a?.annotation) === normalizeFillText(b?.annotation) &&
    normalizeFillText(a?.validUntil) === normalizeFillText(b?.validUntil)
  );
}

/**
 * Entradas a persistir antes de finalizar/aprovar: só o que diverge do servidor
 * (evita regravar o checklist inteiro e estourar o timeout do cliente).
 */
export function collectDivergentFillBatchEntries(
  client: FillResponsesMap,
  server: FillResponsesMap,
  template: ChecklistTemplateWithSections,
): FillBatchEntryPayload[] {
  const out: FillBatchEntryPayload[] = [];
  for (const sec of template.sections) {
    for (const item of sec.items) {
      if (isStructureOnlyItem(item)) continue;
      const c = client[item.id];
      const s = server[item.id];
      if (fillResponsesEqual(c, s)) continue;
      if (!c?.outcome) continue;
      out.push({
        itemId: item.id,
        outcome: c.outcome,
        note: c.note ?? null,
        annotation: c.annotation ?? null,
        validUntil: c.validUntil ?? null,
      });
    }
  }
  return out;
}
