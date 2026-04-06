import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { RECIPE_LINE_UNIT_LABELS } from "@/lib/constants/recipe-line-units";
import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import { lineRawMaterialCostBrl } from "@/lib/technical-recipes/recipe-material-cost";
import {
  computeRecipeNutritionTotals,
  divideRecipeNutritionByPortions,
} from "@/lib/technical-recipes/recipe-nutrition";
import { computeRecipePricingBreakdown } from "@/lib/technical-recipes/recipe-pricing";
import type { TechnicalRecipeWithLines } from "@/lib/types/technical-recipes";

import { foldTextForPdf } from "./dossier-pdf";

function formatBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function wrapToWidth(text: string, maxChars: number): string[] {
  const t = foldTextForPdf(text);
  if (t.length === 0) return [""];
  const words = t.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur.length === 0 ? w : `${cur} ${w}`;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur.length > 0) lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars) : w;
    }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

export type TechnicalSheetPdfMeta = {
  establishmentLabel: string;
  professionalName: string;
  professionalCrn: string;
};

export async function buildTechnicalRecipePdfBytes(
  recipe: TechnicalRecipeWithLines,
  meta: TechnicalSheetPdfMeta,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  const maxChars = 88;
  let page = pdf.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  let y = height - margin;
  const lineH = 12;
  const titleSize = 14;
  const bodySize = 10;

  const ensureSpace = (linesNeeded: number) => {
    const need = linesNeeded * lineH + margin;
    if (y < need) {
      page = pdf.addPage([595.28, 841.89]);
      y = height - margin;
    }
  };

  const draw = (text: string, size: number, bold = false) => {
    const f = bold ? fontBold : font;
    for (const ln of wrapToWidth(text, maxChars)) {
      ensureSpace(1);
      page.drawText(ln, {
        x: margin,
        y: y - size,
        size,
        font: f,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= lineH;
    }
  };

  draw("Ficha técnica — NutriGestão", titleSize, true);
  draw(foldTextForPdf(recipe.name), bodySize + 1, true);
  draw(`Contexto: ${foldTextForPdf(meta.establishmentLabel)}`, bodySize);
  draw(
    `Profissional: ${foldTextForPdf(meta.professionalName)} — CRN: ${foldTextForPdf(meta.professionalCrn || "—")}`,
    bodySize,
  );
  draw(
    `Rendimento: ${recipe.portions_yield} porção(ões) | Margem: ${recipe.margin_percent}% | Imposto: ${recipe.tax_percent}%`,
    bodySize,
  );
  y -= lineH;

  const costAgg = recipe.lines.reduce(
    (acc, l) => {
      if (!l.raw_material) return acc;
      const r = lineRawMaterialCostBrl(
        l.quantity * l.correction_factor,
        l.unit as RecipeLineUnit,
        l.raw_material,
      );
      if (!r.skipped) acc.total += r.brl;
      return acc;
    },
    { total: 0 },
  );

  const nutritionLines = recipe.lines.map((l) => ({
    quantity: l.quantity,
    unit: l.unit as RecipeLineUnit,
    taco: l.taco_food,
    cooking_factor: l.cooking_factor,
  }));
  const nutrition = computeRecipeNutritionTotals(nutritionLines);
  const perPortion = divideRecipeNutritionByPortions(
    nutrition,
    recipe.portions_yield,
  );
  const pricing = computeRecipePricingBreakdown({
    totalMaterialCostBrl: costAgg.total,
    portionsYield: recipe.portions_yield,
    marginPercent: recipe.margin_percent,
    taxPercent: recipe.tax_percent,
  });

  draw("Ingredientes", bodySize + 1, true);
  for (const l of recipe.lines) {
    const unit = RECIPE_LINE_UNIT_LABELS[l.unit as RecipeLineUnit];
    const taco = l.taco_food
      ? `${l.taco_food.taco_code} ${l.taco_food.name}`
      : "—";
    const row = `${l.ingredient_name} | ${l.quantity} ${unit} | corr. ${l.correction_factor} cocção ${l.cooking_factor} | TACO: ${taco}`;
    draw(row, bodySize - 0.5);
  }
  y -= lineH / 2;

  draw(`Custo total de matéria-prima: ${formatBrl(costAgg.total)}`, bodySize, true);
  draw(
    `Preço sugerido por porção (c/ impostos): ${formatBrl(pricing.suggestedPriceWithTaxPerPortionBrl)}`,
    bodySize,
  );
  draw(
    `Nutrição total (estim. TACO): ${nutrition.kcal} kcal; P ${nutrition.proteinG} g; CHO ${nutrition.carbG} g; L ${nutrition.lipidG} g; Fib ${nutrition.fiberG} g`,
    bodySize,
  );
  draw(
    `Por porção: ${perPortion.kcal} kcal; P ${perPortion.proteinG} g; CHO ${perPortion.carbG} g; L ${perPortion.lipidG} g; Fib ${perPortion.fiberG} g`,
    bodySize,
  );

  draw(
    "Valores nutricionais indicativos com base na tabela TACO de referência e quantidades da receita.",
    bodySize - 1,
  );

  return pdf.save();
}
