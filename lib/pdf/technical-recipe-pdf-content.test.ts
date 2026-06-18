import { describe, expect, it } from "vitest";

import { validateTechnicalRecipePdfContent } from "./validate-technical-recipe-pdf-content";
import { buildTechnicalRecipePdfBytes } from "./technical-sheet-pdf";
import type { TechnicalRecipeWithLines } from "@/lib/types/technical-recipes";

const publishedRecipe: TechnicalRecipeWithLines = {
  id: "00000000-0000-4000-8000-000000000001",
  contexto: "ESTABELECIMENTO",
  establishment_id: "00000000-0000-4000-8000-000000000002",
  client_id: "00000000-0000-4000-8000-000000000099",
  repository_origin_id: null,
  name: "Receita E2E validacao PDF",
  status: "published",
  portions_yield: 12,
  margin_percent: 20,
  tax_percent: 8,
  classification: "prato-principal",
  sector: "Cozinha quente 3",
  cmv_percent: 28,
  is_template: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  lines: [
    {
      id: "00000000-0000-4000-8000-000000000010",
      recipe_id: "00000000-0000-4000-8000-000000000001",
      sort_order: 0,
      ingredient_name: "Farinha de trigo A",
      quantity: 320,
      unit: "g",
      notes: "Notas linha 1 - teste",
      taco_food_id: null,
      taco_food: null,
      raw_material_id: null,
      raw_material: null,
      correction_factor: 1.05,
      cooking_factor: 1,
    },
    {
      id: "00000000-0000-4000-8000-000000000011",
      recipe_id: "00000000-0000-4000-8000-000000000001",
      sort_order: 1,
      ingredient_name: "Ovos B",
      quantity: 180,
      unit: "g",
      notes: "Notas linha 2 - teste",
      taco_food_id: null,
      taco_food: null,
      raw_material_id: null,
      raw_material: null,
      correction_factor: 1,
      cooking_factor: 0.92,
    },
  ],
};

describe("validateTechnicalRecipePdfContent", () => {
  it("valida nome, setor, ingredientes e notas no PDF da ficha técnica", async () => {
    const bytes = await buildTechnicalRecipePdfBytes(publishedRecipe, {
      tenantName: "Hospital TESTE",
      tenantLogoBuffer: null,
      clientName: "Hospital TESTE",
      establishmentName: "Cozinha central",
      recipeImageBuffer: null,
      professionalName: "Nutricionista E2E",
      professionalCrn: "CRN-0000",
    });

    await expect(
      validateTechnicalRecipePdfContent(Buffer.from(bytes), {
        name: publishedRecipe.name,
        classification: "prato-principal",
        sector: publishedRecipe.sector ?? "",
        portionsYield: String(publishedRecipe.portions_yield),
        cmvPercent: String(publishedRecipe.cmv_percent),
        lines: publishedRecipe.lines.map((line) => ({
          ingredient: line.ingredient_name,
          quantity: String(line.quantity),
          notes: line.notes ?? "",
        })),
      }),
    ).resolves.toBeUndefined();
  });

  it("inclui tabelas de custos com total e por porção", async () => {
    const bytes = await buildTechnicalRecipePdfBytes(publishedRecipe, {
      tenantName: "Hospital TESTE",
      tenantLogoBuffer: null,
      clientName: "Hospital TESTE",
      establishmentName: "Cozinha central",
      recipeImageBuffer: null,
      professionalName: "Nutricionista E2E",
      professionalCrn: "CRN-0000",
    });

    const { extractPdfText } = await import("./pdf-literal-text");
    const text = await extractPdfText(Buffer.from(bytes));
    expect(text).toContain("Resumo técnico");
    expect(text).toContain("Custo total da preparação");
    expect(text).toContain("Custo por porção");
    expect(text).toContain("Preço sugerido (c/ imposto)");
    expect(text).not.toContain("Preço sugerido (s/ imposto)");
    expect(text).not.toContain("Margem / Imposto");
    expect(text).not.toContain("FICHA TÉCNICA");
    expect(text).toContain("Última modificação");
    expect(text).toContain("Cozinha central");
    expect(text).toContain("Nutrição total");
    expect(text).toContain("Profissional");
  });

  it("receita típica cabe numa única página A4", async () => {
    const { PDFDocument } = await import("pdf-lib");
    const bytes = await buildTechnicalRecipePdfBytes(publishedRecipe, {
      tenantName: "Hospital TESTE",
      tenantLogoBuffer: null,
      clientName: "Hospital TESTE",
      establishmentName: "Cozinha central",
      recipeImageBuffer: null,
      professionalName: "Nutricionista E2E",
      professionalCrn: "CRN-0000",
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });
});
