import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import type { RawMaterialRow } from "@/lib/types/raw-materials";

export type IngredientDimension = "mass" | "volume" | "count";

export function unitDimension(unit: RecipeLineUnit): IngredientDimension {
  if (unit === "g" || unit === "kg") return "mass";
  if (unit === "ml" || unit === "l") return "volume";
  return "count";
}

/** Quantidade da linha em gramas, mililitros ou unidades (uma dimensão preenchida). */
export function lineAmountInBase(
  quantity: number,
  unit: RecipeLineUnit,
): { grams: number | null; ml: number | null; units: number | null } {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { grams: null, ml: null, units: null };
  }
  switch (unit) {
    case "g":
      return { grams: quantity, ml: null, units: null };
    case "kg":
      return { grams: quantity * 1000, ml: null, units: null };
    case "ml":
      return { grams: null, ml: quantity, units: null };
    case "l":
      return { grams: null, ml: quantity * 1000, units: null };
    case "un":
      return { grams: null, ml: null, units: quantity };
    default:
      return { grams: null, ml: null, units: null };
  }
}

/** Quantidade que corresponde a «1 unidade de preço» da matéria-prima (g, ml ou un). */
export function materialPriceUnitBaseAmount(
  priceUnit: RecipeLineUnit,
): { grams: number | null; ml: number | null; units: number | null } {
  return lineAmountInBase(1, priceUnit);
}

export type LineMaterialCostResult = {
  brl: number;
  skipped: boolean;
  reason?: "dimension_mismatch" | "invalid_amount";
};

/**
 * Custo da linha em BRL quando há matéria-prima ligada e dimensões compatíveis.
 */
export function lineRawMaterialCostBrl(
  lineQuantity: number,
  lineUnit: RecipeLineUnit,
  material: Pick<RawMaterialRow, "price_unit" | "unit_price_brl">,
): LineMaterialCostResult {
  const lineDim = unitDimension(lineUnit);
  const matDim = unitDimension(material.price_unit);
  if (lineDim !== matDim) {
    return { brl: 0, skipped: true, reason: "dimension_mismatch" };
  }

  const lineBase = lineAmountInBase(lineQuantity, lineUnit);
  const matBase = materialPriceUnitBaseAmount(material.price_unit);

  if (lineDim === "mass") {
    const lg = lineBase.grams;
    const mg = matBase.grams;
    if (lg == null || mg == null || mg <= 0) {
      return { brl: 0, skipped: true, reason: "invalid_amount" };
    }
    const factor = lg / mg;
    return { brl: roundMoney(factor * Number(material.unit_price_brl)), skipped: false };
  }

  if (lineDim === "volume") {
    const lv = lineBase.ml;
    const mv = matBase.ml;
    if (lv == null || mv == null || mv <= 0) {
      return { brl: 0, skipped: true, reason: "invalid_amount" };
    }
    const factor = lv / mv;
    return { brl: roundMoney(factor * Number(material.unit_price_brl)), skipped: false };
  }

  const lu = lineBase.units;
  const mu = matBase.units;
  if (lu == null || mu == null || mu <= 0) {
    return { brl: 0, skipped: true, reason: "invalid_amount" };
  }
  const factor = lu / mu;
  return { brl: roundMoney(factor * Number(material.unit_price_brl)), skipped: false };
}

function roundMoney(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function sumRecipeMaterialCostBrl(
  lines: Array<{
    quantity: number;
    unit: RecipeLineUnit;
    raw_material: Pick<RawMaterialRow, "price_unit" | "unit_price_brl"> | null;
    /** Padrão 1. Multiplica quantidade para matéria-prima a comprar (perdas). */
    correction_factor?: number;
  }>,
): { totalBrl: number; linesWithCost: number; skippedDimension: number } {
  let totalBrl = 0;
  let linesWithCost = 0;
  let skippedDimension = 0;

  for (const line of lines) {
    if (!line.raw_material) continue;
    const corr = line.correction_factor ?? 1;
    const r = lineRawMaterialCostBrl(
      line.quantity * corr,
      line.unit,
      line.raw_material,
    );
    if (r.skipped) {
      if (r.reason === "dimension_mismatch") skippedDimension += 1;
      continue;
    }
    totalBrl += r.brl;
    linesWithCost += 1;
  }

  return {
    totalBrl: roundMoney(totalBrl),
    linesWithCost,
    skippedDimension,
  };
}
