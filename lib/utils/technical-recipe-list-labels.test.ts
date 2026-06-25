import { describe, expect, it } from "vitest";

import {
  recipeClientIdForListRow,
  recipeContextLabel,
} from "@/lib/utils/technical-recipe-list-labels";

describe("technical-recipe-list-labels", () => {
  it("recipeClientIdForListRow usa client_id directo", () => {
    expect(
      recipeClientIdForListRow({ client_id: "c-1" } as never),
    ).toBe("c-1");
  });

  it("recipeContextLabel repositório", () => {
    const label = recipeContextLabel({
      contexto: "REPOSITORIO",
      establishment_id: null,
      recipe_scope_client: { legal_name: "Empresa", trade_name: "Marca" },
    } as never);
    expect(label).toContain("Repositório");
    expect(label).toContain("Marca");
  });

  it("recipeContextLabel estabelecimento", () => {
    const label = recipeContextLabel({
      establishment_id: "e1",
      establishments: {
        name: "Unidade A",
        clients: { legal_name: "Cliente", trade_name: null },
      },
    } as never);
    expect(label).toBe("Cliente — Unidade A");
  });
});
