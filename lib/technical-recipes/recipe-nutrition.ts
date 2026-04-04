import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import type { TacoReferenceFoodRow } from "@/lib/types/taco-reference-foods";

/**
 * Massa equivalente em gramas para cálculo nutricional (MVP).
 * ml/l: aproximação água (1 ml ≈ 1 g). `un`: desconhecido — excluído.
 */
export function quantityToNutritionGrams(
  quantity: number,
  unit: RecipeLineUnit,
): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  switch (unit) {
    case "g":
      return quantity;
    case "kg":
      return quantity * 1000;
    case "ml":
      return quantity;
    case "l":
      return quantity * 1000;
    case "un":
      return null;
    default:
      return null;
  }
}

export type RecipeNutritionTotals = {
  kcal: number;
  proteinG: number;
  carbG: number;
  lipidG: number;
  fiberG: number;
  /** Linhas com TACO mas unidade `un` (não somadas). */
  skippedUnitCount: number;
  /** Linhas sem item TACO ligado. */
  unlinkedCount: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeRecipeNutritionTotals(
  lines: Array<{
    quantity: number;
    unit: RecipeLineUnit;
    taco: TacoReferenceFoodRow | null;
  }>,
): RecipeNutritionTotals {
  let kcal = 0;
  let proteinG = 0;
  let carbG = 0;
  let lipidG = 0;
  let fiberG = 0;
  let skippedUnitCount = 0;
  let unlinkedCount = 0;

  for (const line of lines) {
    if (!line.taco) {
      unlinkedCount += 1;
      continue;
    }
    const g = quantityToNutritionGrams(line.quantity, line.unit);
    if (g === null) {
      skippedUnitCount += 1;
      continue;
    }
    const f = g / 100;
    kcal += f * Number(line.taco.kcal_per_100g);
    proteinG += f * Number(line.taco.protein_g_per_100g);
    carbG += f * Number(line.taco.carb_g_per_100g);
    lipidG += f * Number(line.taco.lipid_g_per_100g);
    fiberG += f * Number(line.taco.fiber_g_per_100g);
  }

  return {
    kcal: round1(kcal),
    proteinG: round1(proteinG),
    carbG: round1(carbG),
    lipidG: round1(lipidG),
    fiberG: round1(fiberG),
    skippedUnitCount,
    unlinkedCount,
  };
}
