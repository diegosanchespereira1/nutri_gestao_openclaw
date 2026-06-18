import { describe, expect, it } from "vitest";

import {
  RECIPE_FORM_DRAFT_VERSION,
  parseRecipeFormDraft,
  recipeFormDraftStorageKey,
} from "./recipe-form-draft";

describe("recipeFormDraftStorageKey", () => {
  it("gera chave de edição com id da receita", () => {
    expect(
      recipeFormDraftStorageKey("edit", "abc-123", {
        kind: "establishment",
        establishmentId: "est-1",
      }),
    ).toBe("nutrigestao:recipe-draft:edit:abc-123");
  });

  it("gera chave de nova receita por estabelecimento", () => {
    expect(
      recipeFormDraftStorageKey("new", undefined, {
        kind: "establishment",
        establishmentId: "est-42",
      }),
    ).toBe("nutrigestao:recipe-draft:new:est:est-42");
  });

  it("gera chave de nova receita no repositório org", () => {
    expect(
      recipeFormDraftStorageKey("new", undefined, {
        kind: "org",
        clientId: "client-7",
      }),
    ).toBe("nutrigestao:recipe-draft:new:org:client-7");
  });
});

describe("parseRecipeFormDraft", () => {
  const validDraft = {
    v: RECIPE_FORM_DRAFT_VERSION,
    savedAt: "2026-06-18T12:00:00.000Z",
    establishmentId: "est-1",
    name: "Sopa teste",
    classification: "entrada",
    sector: "Cozinha quente",
    portionsYieldInput: "4",
    marginPercentInput: "10",
    taxPercentInput: "5",
    cmvPercentInput: "25",
    scaleTargetInput: "",
    lines: [
      {
        ingredient_name: "Cenoura",
        quantity: "200",
        unit: "g",
        notes: "",
        taco_food_id: null,
        taco_food: null,
        raw_material_id: null,
        correction_factor: "1",
        cooking_factor: "1",
      },
    ],
  };

  it("aceita payload válido", () => {
    const parsed = parseRecipeFormDraft(JSON.stringify(validDraft));
    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe("Sopa teste");
    expect(parsed?.lines).toHaveLength(1);
    expect(parsed?.lines[0]?.ingredient_name).toBe("Cenoura");
  });

  it("rejeita versão desconhecida", () => {
    expect(
      parseRecipeFormDraft(
        JSON.stringify({ ...validDraft, v: 99 }),
      ),
    ).toBeNull();
  });

  it("rejeita JSON inválido ou incompleto", () => {
    expect(parseRecipeFormDraft("{")).toBeNull();
    expect(parseRecipeFormDraft(JSON.stringify({ v: 1 }))).toBeNull();
    expect(
      parseRecipeFormDraft(
        JSON.stringify({ ...validDraft, lines: "não é array" }),
      ),
    ).toBeNull();
  });
});
