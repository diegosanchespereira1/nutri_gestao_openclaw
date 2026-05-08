import type { FillResponsesMap } from "@/lib/types/checklist-fill";

type BatchScope = "section" | "all";

type PickBatchItemsInput = {
  scope: BatchScope;
  sectionItemIds: string[];
  responses: FillResponsesMap;
  dirtyItemIds: ReadonlySet<string>;
  forceAll: boolean;
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
