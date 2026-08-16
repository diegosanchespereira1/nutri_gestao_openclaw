import { describe, expect, it } from "vitest";

import {
  filterTemplateForSession,
  isItemVisibleForSession,
} from "@/lib/checklists/filter-session-template-items";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";

const SESSION_AT = "2026-08-16T20:05:53.133Z";
const BEFORE = "2026-07-24T16:00:00.000Z";
const AFTER = "2026-08-16T21:00:00.000Z";

function baseTemplate(
  overrides?: Partial<ChecklistTemplateWithSections>,
): ChecklistTemplateWithSections {
  return {
    id: "tpl-1",
    name: "Modelo teste",
    portaria_ref: "",
    uf: "*",
    applies_to: [],
    description: null,
    version: 1,
    is_active: true,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
    required_item_count: 0,
    total_item_count: 0,
    sections: [],
    ...overrides,
  };
}

describe("isItemVisibleForSession", () => {
  it("item ativo sempre entra", () => {
    expect(isItemVisibleForSession(null, SESSION_AT, false)).toBe(true);
    expect(isItemVisibleForSession(undefined, SESSION_AT, false)).toBe(true);
    expect(isItemVisibleForSession("", SESSION_AT, false)).toBe(true);
  });

  it("item arquivado antes da sessão some sem resposta", () => {
    expect(isItemVisibleForSession(BEFORE, SESSION_AT, false)).toBe(false);
  });

  it("item arquivado antes da sessão permanece se há resposta", () => {
    expect(isItemVisibleForSession(BEFORE, SESSION_AT, true)).toBe(true);
  });

  it("item arquivado depois da sessão permanece (histórico)", () => {
    expect(isItemVisibleForSession(AFTER, SESSION_AT, false)).toBe(true);
  });
});

describe("filterTemplateForSession", () => {
  it("remove item arquivado antes da sessão e seção só com arquivados", () => {
    const template = baseTemplate({
      sections: [
        {
          id: "sec-empty",
          template_id: "tpl-1",
          title: "Documentação",
          position: 0,
          created_at: BEFORE,
          items: [
            {
              id: "arch-1",
              section_id: "sec-empty",
              description: "POP antigo",
              is_required: true,
              position: 0,
              peso: 1,
              archived_at: BEFORE,
              created_at: BEFORE,
            },
          ],
        },
        {
          id: "sec-keep",
          template_id: "tpl-1",
          title: "Asseio pessoal",
          position: 1,
          created_at: BEFORE,
          items: [
            {
              id: "active-1",
              section_id: "sec-keep",
              description: "Uniforme limpo",
              is_required: true,
              position: 0,
              peso: 1,
              archived_at: null,
              created_at: BEFORE,
            },
            {
              id: "arch-2",
              section_id: "sec-keep",
              description: "Item removido",
              is_required: true,
              position: 1,
              peso: 1,
              archived_at: BEFORE,
              created_at: BEFORE,
            },
            {
              id: "hist-1",
              section_id: "sec-keep",
              description: "Removido depois",
              is_required: false,
              position: 2,
              peso: 1,
              archived_at: AFTER,
              created_at: BEFORE,
            },
          ],
        },
      ],
    });

    const filtered = filterTemplateForSession(
      template,
      SESSION_AT,
      new Set(),
    );

    expect(filtered.sections).toHaveLength(1);
    expect(filtered.sections[0].title).toBe("Asseio pessoal");
    expect(filtered.sections[0].items.map((i) => i.id)).toEqual([
      "active-1",
      "hist-1",
    ]);
    expect(filtered.total_item_count).toBe(2);
    expect(filtered.required_item_count).toBe(1);
  });

  it("mantém item arquivado antes se houver resposta (rede de segurança)", () => {
    const template = baseTemplate({
      sections: [
        {
          id: "sec-1",
          template_id: "tpl-1",
          title: "Geral",
          position: 0,
          created_at: BEFORE,
          items: [
            {
              id: "orphan",
              section_id: "sec-1",
              description: "Órfão com resposta",
              is_required: true,
              position: 0,
              peso: 1,
              archived_at: BEFORE,
              created_at: BEFORE,
            },
          ],
        },
      ],
    });

    const filtered = filterTemplateForSession(
      template,
      SESSION_AT,
      new Set(["orphan"]),
    );

    expect(filtered.sections).toHaveLength(1);
    expect(filtered.sections[0].items).toHaveLength(1);
    expect(filtered.total_item_count).toBe(1);
  });

  it("fixture estilo CINPAL: 10 seções / 74 itens → 2 seções / 23 itens", () => {
    const mkArchived = (
      sectionId: string,
      count: number,
      prefix: string,
    ) =>
      Array.from({ length: count }, (_, i) => ({
        id: `${prefix}-${i}`,
        section_id: sectionId,
        description: `${prefix} ${i}`,
        is_required: true,
        position: i,
        peso: 1,
        archived_at: BEFORE,
        created_at: BEFORE,
      }));

    const activeA = Array.from({ length: 18 }, (_, i) => ({
      id: `a-${i}`,
      section_id: "sec-manip",
      description: `Item manip ${i}`,
      is_required: true,
      position: i,
      peso: 1,
      archived_at: null as string | null,
      created_at: BEFORE,
    }));
    const activeB = Array.from({ length: 5 }, (_, i) => ({
      id: `b-${i}`,
      section_id: "sec-asseio",
      description: `Item asseio ${i}`,
      is_required: true,
      position: i,
      peso: 1,
      archived_at: null as string | null,
      created_at: BEFORE,
    }));

    // Contagens reais CINPAL: 1+7+6+7+2+5+5+17 + 1 (manip) = 51 arquivados
    const template = baseTemplate({
      sections: [
        {
          id: "sec-geral",
          template_id: "tpl-1",
          title: "Geral",
          position: 0,
          created_at: BEFORE,
          items: mkArchived("sec-geral", 1, "geral"),
        },
        {
          id: "sec-estrutura",
          template_id: "tpl-1",
          title: "Estrutura e edificação",
          position: 1,
          created_at: BEFORE,
          items: mkArchived("sec-estrutura", 7, "estrutura"),
        },
        {
          id: "sec-equip",
          template_id: "tpl-1",
          title: "Equipamentos, móveis e utensílios",
          position: 2,
          created_at: BEFORE,
          items: mkArchived("sec-equip", 6, "equip"),
        },
        {
          id: "sec-receb",
          template_id: "tpl-1",
          title: "Recebimento e armazenamento",
          position: 3,
          created_at: BEFORE,
          items: mkArchived("sec-receb", 7, "receb"),
        },
        {
          id: "sec-lixeira",
          template_id: "tpl-1",
          title: "Área de Armazenamento de Resíduos (Lixeira)",
          position: 4,
          created_at: BEFORE,
          items: mkArchived("sec-lixeira", 2, "lixeira"),
        },
        {
          id: "sec-dml",
          template_id: "tpl-1",
          title: "Depósito de Material de Limpeza (DML)",
          position: 5,
          created_at: BEFORE,
          items: mkArchived("sec-dml", 5, "dml"),
        },
        {
          id: "sec-vest",
          template_id: "tpl-1",
          title: "Vestiários e Instalações Sanitárias",
          position: 6,
          created_at: BEFORE,
          items: mkArchived("sec-vest", 5, "vest"),
        },
        {
          id: "sec-doc",
          template_id: "tpl-1",
          title: "Documentação",
          position: 7,
          created_at: BEFORE,
          items: mkArchived("sec-doc", 17, "doc"),
        },
        {
          id: "sec-manip",
          template_id: "tpl-1",
          title: "Manipulação e Boas Práticas",
          position: 8,
          created_at: BEFORE,
          items: [
            ...activeA,
            ...mkArchived("sec-manip", 1, "arch-manip"),
          ],
        },
        {
          id: "sec-asseio",
          template_id: "tpl-1",
          title: "Asseio pessoal",
          position: 9,
          created_at: BEFORE,
          items: activeB,
        },
      ],
    });

    const allItems = template.sections.flatMap((s) => s.items);
    expect(allItems).toHaveLength(74);
    expect(allItems.filter((i) => i.archived_at)).toHaveLength(51);
    expect(allItems.filter((i) => !i.archived_at)).toHaveLength(23);

    const responded = new Set(activeA.concat(activeB).map((i) => i.id));
    const filtered = filterTemplateForSession(
      template,
      SESSION_AT,
      responded,
    );

    expect(filtered.sections).toHaveLength(2);
    expect(filtered.sections.map((s) => s.title)).toEqual([
      "Manipulação e Boas Práticas",
      "Asseio pessoal",
    ]);
    expect(filtered.total_item_count).toBe(23);
    expect(filtered.required_item_count).toBe(23);

    // Score visual: 4 conforme + 18 NC + 1 N/A → 4/22 = 18%
    let earned = 0;
    let total = 0;
    const outcomes = new Map<string, "conforme" | "nc" | "na">();
    for (let i = 0; i < 18; i++) {
      outcomes.set(`a-${i}`, i < 4 ? "conforme" : "nc");
    }
    outcomes.set("b-0", "na");
    for (let i = 1; i < 5; i++) outcomes.set(`b-${i}`, "nc");
    for (const sec of filtered.sections) {
      for (const it of sec.items) {
        const o = outcomes.get(it.id);
        if (!o || o === "na") continue;
        total += it.peso;
        if (o === "conforme") earned += it.peso;
      }
    }
    expect(earned).toBe(4);
    expect(total).toBe(22);
    expect(Math.round((earned / total) * 100)).toBe(18);
  });
});
