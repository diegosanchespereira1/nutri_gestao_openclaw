import { describe, expect, it } from "vitest";

import { getDefaultTechnicalRecipeImageBuffer } from "./default-technical-recipe-image";
import { buildTechnicalRecipePdfBytes } from "./technical-sheet-pdf";
import type { TechnicalRecipeWithLines } from "@/lib/types/technical-recipes";

const minimalRecipe: TechnicalRecipeWithLines = {
  id: "00000000-0000-4000-8000-000000000001",
  contexto: "ESTABELECIMENTO",
  establishment_id: "00000000-0000-4000-8000-000000000002",
  client_id: "00000000-0000-4000-8000-000000000099",
  repository_origin_id: null,
  name: "Sopa teste",
  status: "draft",
  portions_yield: 4,
  margin_percent: 10,
  tax_percent: 5,
  classification: null,
  sector: null,
  cmv_percent: 25,
  is_template: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  lines: [
    {
      id: "00000000-0000-4000-8000-000000000003",
      recipe_id: "00000000-0000-4000-8000-000000000001",
      sort_order: 0,
      ingredient_name: "Agua",
      quantity: 500,
      unit: "ml",
      notes: null,
      taco_food_id: null,
      taco_food: null,
      raw_material_id: null,
      raw_material: null,
      correction_factor: 1,
      cooking_factor: 1,
    },
  ],
};

const fullRecipe: TechnicalRecipeWithLines = {
  ...minimalRecipe,
  name: "Frango grelhado com legumes E2E",
  classification: "prato-principal",
  sector: "Cozinha quente",
  portions_yield: 6,
  margin_percent: 35,
  tax_percent: 12,
  cmv_percent: 28,
  lines: [
    {
      id: "00000000-0000-4000-8000-000000000010",
      recipe_id: minimalRecipe.id,
      sort_order: 0,
      ingredient_name: "Peito de frango",
      quantity: 800,
      unit: "g",
      notes: "Sem pele",
      taco_food_id: null,
      taco_food: null,
      raw_material_id: null,
      raw_material: null,
      correction_factor: 1.05,
      cooking_factor: 0.85,
    },
    {
      id: "00000000-0000-4000-8000-000000000011",
      recipe_id: minimalRecipe.id,
      sort_order: 1,
      ingredient_name: "Azeite",
      quantity: 30,
      unit: "ml",
      notes: null,
      taco_food_id: null,
      taco_food: null,
      raw_material_id: null,
      raw_material: null,
      correction_factor: 1,
      cooking_factor: 1,
    },
  ],
};

describe("buildTechnicalRecipePdfBytes", () => {
  it("gera PDF não vazio", async () => {
    const bytes = await buildTechnicalRecipePdfBytes(minimalRecipe, {
      tenantName: "Clínica Nutri Exemplo",
      tenantLogoBuffer: null,
      clientName: "Cliente X",
      establishmentName: "Cozinha A",
      recipeImageBuffer: null,
      professionalName: "Nutricionista",
      professionalCrn: "12345",
    });
    expect(bytes.length).toBeGreaterThan(500);
    expect(String.fromCharCode(bytes[0])).toBe("%");
    expect(String.fromCharCode(bytes[1])).toBe("P");
    expect(String.fromCharCode(bytes[2])).toBe("D");
    expect(String.fromCharCode(bytes[3])).toBe("F");
  });

  it("usa imagem padrão do sistema quando a receita não tem foto", async () => {
    const withoutPhoto = await buildTechnicalRecipePdfBytes(minimalRecipe, {
      tenantName: "Clínica Nutri Exemplo",
      tenantLogoBuffer: null,
      clientName: "Cliente X",
      establishmentName: "Cozinha A",
      recipeImageBuffer: null,
      professionalName: "Nutricionista",
      professionalCrn: "12345",
    });
    const withPhoto = await buildTechnicalRecipePdfBytes(minimalRecipe, {
      tenantName: "Clínica Nutri Exemplo",
      tenantLogoBuffer: null,
      clientName: "Cliente X",
      establishmentName: "Cozinha A",
      recipeImageBuffer: getDefaultTechnicalRecipeImageBuffer(),
      professionalName: "Nutricionista",
      professionalCrn: "12345",
    });

    expect(withoutPhoto.length).toBeGreaterThan(500);
    expect(Math.abs(withoutPhoto.length - withPhoto.length)).toBeLessThan(500);
  });

  it("gera PDF com receita completa (classificação, setor e múltiplas linhas)", async () => {
    const bytes = await buildTechnicalRecipePdfBytes(fullRecipe, {
      tenantName: "Hospital TESTE",
      tenantLogoBuffer: null,
      clientName: "Hospital TESTE",
      establishmentName: "Cozinha central",
      recipeImageBuffer: null,
      professionalName: "Nutricionista E2E",
      professionalCrn: "CRN-0000",
    });
    expect(bytes.length).toBeGreaterThan(800);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });
});
