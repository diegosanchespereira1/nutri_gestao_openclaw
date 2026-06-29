import { describe, expect, it } from "vitest";

import {
  filterInheritableResponseRows,
  normalizeInheritanceAreaId,
  pickSourceSessionForInheritance,
  sessionAreaMatchesForInheritance,
} from "@/lib/checklists/inherit-valid-responses";
import type { ChecklistFillItemResponseRow } from "@/lib/types/checklist-fill";

describe("sessionAreaMatchesForInheritance", () => {
  const single = "area-unica";

  it("combina área explícita igual", () => {
    expect(sessionAreaMatchesForInheritance("a1", "a1", null)).toBe(true);
  });

  it("trata null como área única do estabelecimento", () => {
    expect(sessionAreaMatchesForInheritance(null, single, single)).toBe(true);
    expect(sessionAreaMatchesForInheritance(single, null, single)).toBe(true);
  });

  it("rejeita áreas diferentes quando há várias áreas", () => {
    expect(sessionAreaMatchesForInheritance("a1", "a2", null)).toBe(false);
  });
});

describe("normalizeInheritanceAreaId", () => {
  it("usa área única quando sessão não tem area_id", () => {
    expect(normalizeInheritanceAreaId(null, "area-1")).toBe("area-1");
    expect(normalizeInheritanceAreaId(undefined, "area-1")).toBe("area-1");
  });
});

describe("pickSourceSessionForInheritance", () => {
  it("escolhe a primeira sessão compatível por área", () => {
    const picked = pickSourceSessionForInheritance(
      [
        { id: "old", area_id: "a2" },
        { id: "match", area_id: "a1" },
      ],
      "a1",
      null,
    );
    expect(picked?.id).toBe("match");
  });
});

describe("filterInheritableResponseRows", () => {
  const inheritable = new Set(["item-1"]);

  it("mantém respostas com validade futura e item avaliável", () => {
    const rows = filterInheritableResponseRows(
      [
        {
          id: "r1",
          session_id: "s1",
          template_item_id: "item-1",
          custom_item_id: null,
          outcome: "conforme",
          note: "Observação",
          item_annotation: "Anotação",
          valid_until: "2026-12-31",
          created_at: "",
          updated_at: "",
        } as ChecklistFillItemResponseRow,
      ],
      inheritable,
      "2026-06-28",
    );
    expect(rows).toHaveLength(1);
  });

  it("ignora itens sem validade ou vencidos", () => {
    const rows = filterInheritableResponseRows(
      [
        {
          id: "r1",
          session_id: "s1",
          template_item_id: "item-1",
          custom_item_id: null,
          outcome: "conforme",
          note: null,
          item_annotation: null,
          valid_until: "2026-01-01",
          created_at: "",
          updated_at: "",
        } as ChecklistFillItemResponseRow,
      ],
      inheritable,
      "2026-06-28",
    );
    expect(rows).toHaveLength(0);
  });
});
