import { describe, expect, it } from "vitest";

import {
  assembleClientAvailableChecklists,
  buildApplyChecklistHref,
  clientAvailableChecklistRank,
  sortClientAvailableChecklists,
} from "@/lib/checklists/client-available-templates";

const CLIENT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("clientAvailableChecklistRank", () => {
  it("prioriza equipe exclusiva, depois equipe global, personalizado e sistema", () => {
    expect(
      clientAvailableChecklistRank({
        source: "workspace",
        exclusiveToClient: true,
      }),
    ).toBe(0);
    expect(
      clientAvailableChecklistRank({
        source: "workspace",
        exclusiveToClient: false,
      }),
    ).toBe(1);
    expect(
      clientAvailableChecklistRank({ source: "custom", exclusiveToClient: false }),
    ).toBe(2);
    expect(
      clientAvailableChecklistRank({ source: "system", exclusiveToClient: false }),
    ).toBe(3);
  });
});

describe("sortClientAvailableChecklists", () => {
  it("ordena por grupo e depois por nome", () => {
    const sorted = sortClientAvailableChecklists([
      {
        id: "s",
        name: "Zebra sistema",
        source: "system",
        sourceLabel: "Sistema",
        scopeLabel: "UF SP",
        exclusiveToClient: false,
        itemCount: 1,
        requiredItemCount: 1,
      },
      {
        id: "g",
        name: "Beta equipe",
        source: "workspace",
        sourceLabel: "Equipe",
        scopeLabel: "Todos os clientes",
        exclusiveToClient: false,
        itemCount: 2,
        requiredItemCount: 1,
      },
      {
        id: "e",
        name: "Alfa exclusivo",
        source: "workspace",
        sourceLabel: "Equipe",
        scopeLabel: "Somente este cliente",
        exclusiveToClient: true,
        itemCount: 3,
        requiredItemCount: 1,
      },
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["e", "g", "s"]);
  });
});

describe("buildApplyChecklistHref", () => {
  const est = "11111111-1111-4111-8111-111111111111";

  it("foca template oficial, de equipe ou personalizado", () => {
    expect(
      buildApplyChecklistHref(est, { id: "t1", source: "system" }),
    ).toBe(`/checklists?est=${est}&template=t1`);
    expect(
      buildApplyChecklistHref(est, { id: "w1", source: "workspace" }),
    ).toBe(`/checklists?est=${est}&workspace_template=w1`);
    expect(
      buildApplyChecklistHref(est, { id: "c1", source: "custom" }),
    ).toBe(`/checklists?est=${est}&custom_template=c1`);
  });
});

describe("assembleClientAvailableChecklists", () => {
  it("monta lista unificada com escopo e exclusividade", () => {
    const items = assembleClientAvailableChecklists({
      workspace: [
        {
          id: "w-ex",
          name: "Exclusivo",
          client_id: CLIENT_A,
          total_item_count: 12,
          required_item_count: 8,
        },
        {
          id: "w-g",
          name: "Global",
          client_id: null,
          total_item_count: 4,
          required_item_count: 2,
        },
      ],
      custom: [{ id: "c1", name: "Cozinha" }],
      official: [
        {
          id: "o1",
          name: "RDC 216",
          uf: "SP",
          total_item_count: 36,
          required_item_count: 20,
        },
        {
          id: "o2",
          name: "Nacional",
          uf: "*",
          total_item_count: 10,
          required_item_count: 5,
        },
      ],
    });

    expect(items.map((i) => i.id)).toEqual(["w-ex", "w-g", "c1", "o2", "o1"]);
    expect(items[0]).toMatchObject({
      source: "workspace",
      exclusiveToClient: true,
      scopeLabel: "Somente este cliente",
    });
    expect(items.find((i) => i.id === "o2")?.scopeLabel).toBe("Todas as UFs");
    expect(items.find((i) => i.id === "o1")?.scopeLabel).toBe("UF SP");
    expect(items.find((i) => i.id === "c1")?.scopeLabel).toBe("Só esta unidade");
  });
});
