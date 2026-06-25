import { describe, expect, it } from "vitest";

import { isStructureOnlyItem } from "@/lib/checklists/is-structure-only-item";

describe("isStructureOnlyItem", () => {
  it("true quando is_structure_only", () => {
    expect(isStructureOnlyItem({ is_structure_only: true })).toBe(true);
  });

  it("false para item obrigatório", () => {
    expect(
      isStructureOnlyItem({
        is_required: true,
        description: "1 — Secção",
      }),
    ).toBe(false);
  });

  it("fallback legado: opcional com padrão numérico", () => {
    expect(
      isStructureOnlyItem({
        is_required: false,
        description: "1.2 — Subsecção",
      }),
    ).toBe(true);
  });

  it("false se descrição começa com [", () => {
    expect(
      isStructureOnlyItem({
        is_required: false,
        description: "[1.1] Item",
      }),
    ).toBe(false);
  });
});
