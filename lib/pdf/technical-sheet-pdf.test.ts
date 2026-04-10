import { describe, expect, it } from "vitest";

import { buildTechnicalRecipePdfBytes } from "./technical-sheet-pdf";
import type { TechnicalRecipeWithLines } from "@/lib/types/technical-recipes";

const minimalRecipe: TechnicalRecipeWithLines = {
  id: "00000000-0000-4000-8000-000000000001",
  establishment_id: "00000000-0000-4000-8000-000000000002",
  name: "Sopa teste",
  status: "draft",
  portions_yield: 4,
  margin_percent: 10,
  tax_percent: 5,
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

describe("buildTechnicalRecipePdfBytes", () => {
  it("gera PDF não vazio", async () => {
    const bytes = await buildTechnicalRecipePdfBytes(minimalRecipe, {
      establishmentLabel: "Cliente X — Cozinha A",
      professionalName: "Nutricionista",
      professionalCrn: "12345",
    });
    expect(bytes.length).toBeGreaterThan(500);
    expect(String.fromCharCode(bytes[0])).toBe("%");
    expect(String.fromCharCode(bytes[1])).toBe("P");
    expect(String.fromCharCode(bytes[2])).toBe("D");
    expect(String.fromCharCode(bytes[3])).toBe("F");
  });
});
