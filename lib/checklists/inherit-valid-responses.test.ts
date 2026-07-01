import { describe, expect, it } from "vitest";

import {
  buildInheritanceSessionOrder,
  collectExistingResponseItemIds,
  collectLatestValidResponsePerItem,
  filterInheritableResponseRows,
  filterSessionsForInheritance,
  normalizeInheritanceAreaId,
  pickSourceSessionForInheritance,
  sessionAreaMatchesForInheritance,
} from "@/lib/checklists/inherit-valid-responses";
import type { ChecklistFillItemResponseRow } from "@/lib/types/checklist-fill";

function row(
  partial: Partial<ChecklistFillItemResponseRow> &
    Pick<ChecklistFillItemResponseRow, "template_item_id"> & {
      session_id?: string;
    },
): ChecklistFillItemResponseRow {
  return {
    id: partial.id ?? "r1",
    session_id: partial.session_id ?? "s1",
    custom_item_id: null,
    outcome: "conforme",
    note: null,
    item_annotation: null,
    valid_until: null,
    created_at: "",
    updated_at: "",
    ...partial,
  } as ChecklistFillItemResponseRow;
}

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

describe("filterSessionsForInheritance", () => {
  it("devolve todas as sessões compatíveis por área", () => {
    const out = filterSessionsForInheritance(
      [
        { id: "s1", area_id: "a1" },
        { id: "s2", area_id: "a2" },
        { id: "s3", area_id: "a1" },
      ],
      "a1",
      null,
    );
    expect(out.map((s) => s.id)).toEqual(["s1", "s3"]);
  });
});

describe("buildInheritanceSessionOrder", () => {
  it("prioriza aprovadas e depois recentes sem duplicar", () => {
    const order = buildInheritanceSessionOrder(
      [
        { id: "ap1", area_id: "a1" },
        { id: "ap2", area_id: "a1" },
      ],
      [
        { id: "ap1", area_id: "a1" },
        { id: "dr1", area_id: "a1" },
      ],
      "a1",
      null,
    );
    expect(order).toEqual(["ap1", "ap2", "dr1"]);
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
        row({
          template_item_id: "item-1",
          valid_until: "2026-12-31",
          note: "Observação",
          item_annotation: "Anotação",
        }),
      ],
      inheritable,
      "2026-06-28",
    );
    expect(rows).toHaveLength(1);
  });

  it("ignora itens sem validade ou vencidos", () => {
    const rows = filterInheritableResponseRows(
      [row({ template_item_id: "item-1", valid_until: "2026-01-01" })],
      inheritable,
      "2026-06-28",
    );
    expect(rows).toHaveLength(0);
  });

  it("inclui validade no dia do vencimento", () => {
    const rows = filterInheritableResponseRows(
      [row({ template_item_id: "item-1", valid_until: "2026-08-02" })],
      inheritable,
      "2026-08-02",
    );
    expect(rows).toHaveLength(1);
  });
});

describe("collectLatestValidResponsePerItem", () => {
  const inheritable = new Set(["item-a", "item-b"]);
  const today = "2026-06-28";

  it("busca validade em sessão mais antiga quando a recente não tem data", () => {
    const rows = collectLatestValidResponsePerItem(
      ["sess-new", "sess-old"],
      [
        row({
          session_id: "sess-new",
          template_item_id: "item-a",
          valid_until: null,
          outcome: "conforme",
        }),
        row({
          session_id: "sess-old",
          template_item_id: "item-a",
          valid_until: "2026-12-31",
        }),
      ],
      inheritable,
      today,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.session_id).toBe("sess-old");
    expect(rows[0]?.valid_until).toBe("2026-12-31");
  });

  it("prefere sessão mais recente quando ambas têm validade vigente", () => {
    const rows = collectLatestValidResponsePerItem(
      ["sess-new", "sess-old"],
      [
        row({
          session_id: "sess-new",
          template_item_id: "item-a",
          valid_until: "2026-12-31",
          note: "recente",
        }),
        row({
          session_id: "sess-old",
          template_item_id: "item-a",
          valid_until: "2026-11-30",
          note: "antigo",
        }),
      ],
      inheritable,
      today,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.note).toBe("recente");
  });

  it("agrega itens distintos de sessões diferentes", () => {
    const rows = collectLatestValidResponsePerItem(
      ["sess-new", "sess-old"],
      [
        row({
          session_id: "sess-new",
          template_item_id: "item-a",
          valid_until: "2026-12-31",
        }),
        row({
          session_id: "sess-old",
          template_item_id: "item-b",
          valid_until: "2026-10-01",
        }),
      ],
      inheritable,
      today,
    );
    expect(rows).toHaveLength(2);
  });
});

describe("collectExistingResponseItemIds", () => {
  it("lê IDs em qualquer coluna de item", () => {
    const ids = collectExistingResponseItemIds([
      row({ session_id: "s1", template_item_id: "item-1" }),
      {
        ...row({ session_id: "s1", template_item_id: null }),
        custom_item_id: "custom-1",
      } as ChecklistFillItemResponseRow,
    ]);
    expect(ids).toEqual(new Set(["item-1", "custom-1"]));
  });
});
