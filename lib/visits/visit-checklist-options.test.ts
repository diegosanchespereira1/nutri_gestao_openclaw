import { describe, expect, it } from "vitest";

import {
  assembleVisitChecklistOptions,
  EMPTY_VISIT_CHECKLIST_FILTERS,
  filterVisitChecklistOptions,
  groupVisitChecklistOptions,
  parseVisitChecklistChoice,
  resolveVisitSelectedAreaIds,
  visitChecklistChoiceValue,
  visitChecklistUfOptions,
  visitFillSessionAreaSlots,
} from "@/lib/visits/visit-checklist-options";

const WORKSPACE_GLOBAL = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_EXCLUSIVE = "22222222-2222-4222-8222-222222222222";
const CUSTOM_ID = "33333333-3333-4333-8333-333333333333";
const SYSTEM_SP = "44444444-4444-4444-8444-444444444444";
const SYSTEM_ALL = "55555555-5555-4555-8555-555555555555";
const AREA_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AREA_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const AREA_OTHER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("parseVisitChecklistChoice", () => {
  it("aceita sistema, personalizado e equipe", () => {
    expect(parseVisitChecklistChoice(`global:${SYSTEM_SP}`)).toEqual({
      kind: "global",
      id: SYSTEM_SP,
    });
    expect(parseVisitChecklistChoice(`custom:${CUSTOM_ID}`)).toEqual({
      kind: "custom",
      id: CUSTOM_ID,
    });
    expect(parseVisitChecklistChoice(`workspace:${WORKSPACE_GLOBAL}`)).toEqual({
      kind: "workspace",
      id: WORKSPACE_GLOBAL,
    });
  });

  it("rejeita valor inválido", () => {
    expect(parseVisitChecklistChoice("global:abc")).toBeNull();
    expect(parseVisitChecklistChoice("equipe:x")).toBeNull();
    expect(parseVisitChecklistChoice("")).toBeNull();
  });
});

describe("assembleVisitChecklistOptions", () => {
  it("inclui equipe, personalizado e sistema na mesma ordem do catálogo", () => {
    const options = assembleVisitChecklistOptions({
      workspace: [
        {
          id: WORKSPACE_GLOBAL,
          name: "Higienização geral",
          client_id: null,
          client_label: null,
          created_by_name: "Ana",
          total_item_count: 10,
          required_item_count: 8,
        },
        {
          id: WORKSPACE_EXCLUSIVE,
          name: "Checklist exclusivo",
          client_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          client_label: "Cliente A",
          created_by_name: "Ana",
          total_item_count: 4,
          required_item_count: 2,
        },
      ],
      custom: [
        {
          id: CUSTOM_ID,
          name: "Cópia da unidade",
          establishment_label: "Unidade Centro — Cliente A",
          created_by_name: "Ana",
        },
      ],
      official: [
        {
          id: SYSTEM_SP,
          name: "Portaria SP",
          uf: "SP",
          portaria_ref: "CVS-5",
          description: "Boas práticas",
          applies_to: ["escola"],
          total_item_count: 20,
          required_item_count: 15,
        },
        {
          id: SYSTEM_ALL,
          name: "Portaria nacional",
          uf: "*",
          portaria_ref: "RDC 216",
          description: null,
          applies_to: ["hospital", "escola"],
          total_item_count: 12,
          required_item_count: 10,
        },
      ],
    });

    expect(options.map((o) => o.source)).toEqual([
      "workspace",
      "workspace",
      "custom",
      "system",
      "system",
    ]);
    expect(options[0]?.id).toBe(WORKSPACE_EXCLUSIVE);
    const customOpt = options.find((o) => o.id === CUSTOM_ID);
    expect(customOpt?.source).toBe("custom");
    expect(customOpt?.scopeLabel).toBe("Unidade Centro — Cliente A");
    expect(options.some((o) => o.id === SYSTEM_SP && o.source === "system")).toBe(
      true,
    );
    expect(visitChecklistChoiceValue(options[0]!)).toBe(
      `workspace:${WORKSPACE_EXCLUSIVE}`,
    );
  });
});

describe("groupVisitChecklistOptions", () => {
  it("separa os três blocos da página de checklists", () => {
    const grouped = groupVisitChecklistOptions(
      assembleVisitChecklistOptions({
        workspace: [
          {
            id: WORKSPACE_GLOBAL,
            name: "Equipe",
            client_id: null,
            client_label: null,
            created_by_name: null,
            total_item_count: 1,
            required_item_count: 1,
          },
        ],
        custom: [
          {
            id: CUSTOM_ID,
            name: "Custom",
            establishment_label: "Unidade B",
            created_by_name: null,
          },
        ],
        official: [
          {
            id: SYSTEM_ALL,
            name: "Sistema",
            uf: "*",
            portaria_ref: "RDC 216",
            description: null,
            applies_to: ["hospital"],
            total_item_count: 1,
            required_item_count: 1,
          },
        ],
      }),
    );
    expect(grouped.workspace).toHaveLength(1);
    expect(grouped.custom).toHaveLength(1);
    expect(grouped.system).toHaveLength(1);
  });
});

describe("resolveVisitSelectedAreaIds", () => {
  it("exige ao menos uma área quando o estabelecimento tem áreas", () => {
    expect(
      resolveVisitSelectedAreaIds({
        availableAreaIds: [AREA_A, AREA_B],
        selectedAreaIds: [],
      }),
    ).toEqual({ ok: false, error: "area_required" });
  });

  it("recusa área de outro estabelecimento", () => {
    expect(
      resolveVisitSelectedAreaIds({
        availableAreaIds: [AREA_A, AREA_B],
        selectedAreaIds: [AREA_OTHER],
      }),
    ).toEqual({ ok: false, error: "area_invalid" });
  });

  it("aceita uma ou mais áreas válidas", () => {
    expect(
      resolveVisitSelectedAreaIds({
        availableAreaIds: [AREA_A, AREA_B],
        selectedAreaIds: [AREA_B, AREA_A, AREA_A],
      }),
    ).toEqual({ ok: true, areaIds: [AREA_B, AREA_A] });
  });

  it("permite sessão sem área quando não há áreas cadastradas", () => {
    expect(
      resolveVisitSelectedAreaIds({
        availableAreaIds: [],
        selectedAreaIds: [],
      }),
    ).toEqual({ ok: true, areaIds: [] });
  });
});

describe("visitFillSessionAreaSlots", () => {
  it("gera uma sessão por área e uma sessão sem área quando a lista está vazia", () => {
    expect(visitFillSessionAreaSlots([AREA_A, AREA_B])).toEqual([AREA_A, AREA_B]);
    expect(visitFillSessionAreaSlots([])).toEqual([null]);
  });
});

describe("filterVisitChecklistOptions", () => {
  const options = assembleVisitChecklistOptions({
    workspace: [
      {
        id: WORKSPACE_GLOBAL,
        name: "Higienização geral",
        client_id: null,
        client_label: null,
        created_by_name: "Ana",
        total_item_count: 1,
        required_item_count: 1,
      },
    ],
    custom: [
      {
        id: CUSTOM_ID,
        name: "Cópia da unidade",
        establishment_label: "Unidade Centro",
        created_by_name: "Ana",
      },
    ],
    official: [
      {
        id: SYSTEM_SP,
        name: "Portaria SP",
        uf: "SP",
        portaria_ref: "CVS-5",
        description: "Boas práticas",
        applies_to: ["escola"],
        total_item_count: 1,
        required_item_count: 1,
      },
      {
        id: SYSTEM_ALL,
        name: "Portaria nacional",
        uf: "*",
        portaria_ref: "RDC 216",
        description: null,
        applies_to: ["hospital"],
        total_item_count: 1,
        required_item_count: 1,
      },
    ],
  });

  it("filtra por origem, busca, tipo e UF como no catálogo", () => {
    expect(
      filterVisitChecklistOptions(options, {
        ...EMPTY_VISIT_CHECKLIST_FILTERS,
        source: "custom",
      }).map((o) => o.id),
    ).toEqual([CUSTOM_ID]);

    expect(
      filterVisitChecklistOptions(options, {
        ...EMPTY_VISIT_CHECKLIST_FILTERS,
        search: "cvs-5",
      }).map((o) => o.id),
    ).toEqual([SYSTEM_SP]);

    expect(
      filterVisitChecklistOptions(options, {
        ...EMPTY_VISIT_CHECKLIST_FILTERS,
        types: ["escola"],
      }).map((o) => o.id),
    ).toEqual([WORKSPACE_GLOBAL, CUSTOM_ID, SYSTEM_SP]);

    expect(
      filterVisitChecklistOptions(options, {
        ...EMPTY_VISIT_CHECKLIST_FILTERS,
        ufs: ["SP"],
      }).map((o) => o.id),
    ).toEqual([WORKSPACE_GLOBAL, CUSTOM_ID, SYSTEM_ALL, SYSTEM_SP]);
  });

  it("lista UFs dos modelos do sistema, sem o curinga nacional", () => {
    expect(visitChecklistUfOptions(options)).toEqual(["SP"]);
  });
});
