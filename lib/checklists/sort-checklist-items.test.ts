import { describe, expect, it } from "vitest";

import { sortChecklistItemsByPosition } from "@/lib/checklists/sort-checklist-items";

describe("sortChecklistItemsByPosition", () => {
  it("ordena por position crescente", () => {
    const items = [
      { id: "b", position: 2, description: "[3]" },
      { id: "a", position: 0, description: "[1]" },
      { id: "c", position: 1, description: "[2]" },
    ];
    expect(sortChecklistItemsByPosition(items).map((it) => it.description)).toEqual([
      "[1]",
      "[2]",
      "[3]",
    ]);
  });

  it("desempata por id quando position é igual", () => {
    const items = [
      { id: "z", position: 0 },
      { id: "a", position: 0 },
    ];
    expect(sortChecklistItemsByPosition(items).map((it) => it.id)).toEqual(["a", "z"]);
  });
});
