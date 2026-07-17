import { describe, expect, it } from "vitest";

import {
  collectDivergentFillBatchEntries,
  fillResponsesEqual,
  hasResponseChanged,
  pickBatchItemIdsForSave,
} from "@/lib/checklists/save-batch";
import type { FillResponsesMap } from "@/lib/types/checklist-fill";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";

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

describe("fillResponsesEqual", () => {
  it("ignora trim em textos", () => {
    expect(
      fillResponsesEqual(
        { outcome: "nc", note: " x ", annotation: null, validUntil: null },
        { outcome: "nc", note: "x", annotation: null, validUntil: null },
      ),
    ).toBe(true);
  });
});

describe("collectDivergentFillBatchEntries", () => {
  const template = {
    sections: [
      {
        items: [
          { id: "a", is_structure_only: false },
          { id: "b", is_structure_only: false },
          { id: "h", is_structure_only: true },
        ],
      },
    ],
  } as unknown as ChecklistTemplateWithSections;

  it("só devolve itens diferentes do servidor", () => {
    const client: FillResponsesMap = {
      a: { outcome: "conforme", note: null, annotation: null, validUntil: null },
      b: { outcome: "nc", note: "novo", annotation: null, validUntil: null },
    };
    const server: FillResponsesMap = {
      a: { outcome: "conforme", note: null, annotation: null, validUntil: null },
      b: { outcome: "nc", note: "antigo", annotation: null, validUntil: null },
    };

    expect(collectDivergentFillBatchEntries(client, server, template)).toEqual([
      {
        itemId: "b",
        outcome: "nc",
        note: "novo",
        annotation: null,
        validUntil: null,
      },
    ]);
  });

  it("devolve lista vazia quando já está sincronizado", () => {
    const map: FillResponsesMap = {
      a: { outcome: "conforme", note: null, annotation: null, validUntil: null },
      b: { outcome: "na", note: null, annotation: null, validUntil: null },
    };
    expect(collectDivergentFillBatchEntries(map, map, template)).toEqual([]);
  });
});
