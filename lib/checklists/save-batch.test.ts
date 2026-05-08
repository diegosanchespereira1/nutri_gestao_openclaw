import { describe, expect, it } from "vitest";

import {
  hasResponseChanged,
  pickBatchItemIdsForSave,
} from "@/lib/checklists/save-batch";
import type { FillResponsesMap } from "@/lib/types/checklist-fill";

function buildResponses(): FillResponsesMap {
  return {
    a: { outcome: "conforme", note: null, annotation: null, validUntil: null },
    b: { outcome: "nc", note: "x", annotation: null, validUntil: null },
    c: { outcome: null, note: null, annotation: null, validUntil: null },
  };
}

describe("pickBatchItemIdsForSave", () => {
  it("retorna somente itens sujos do escopo da seção", () => {
    const ids = pickBatchItemIdsForSave({
      scope: "section",
      sectionItemIds: ["a", "b", "c"],
      responses: buildResponses(),
      dirtyItemIds: new Set(["b"]),
      forceAll: false,
    });

    expect(ids).toEqual(["b"]);
  });

  it("retorna todos os itens preenchidos ao forçar save", () => {
    const ids = pickBatchItemIdsForSave({
      scope: "all",
      sectionItemIds: ["a", "b"],
      responses: buildResponses(),
      dirtyItemIds: new Set(),
      forceAll: true,
    });

    expect(ids).toEqual(["a", "b"]);
  });
});

describe("hasResponseChanged", () => {
  it("detecta mudança de valor", () => {
    expect(hasResponseChanged("old", "new")).toBe(true);
  });

  it("ignora quando valor é igual", () => {
    expect(hasResponseChanged("same", "same")).toBe(false);
  });
});
