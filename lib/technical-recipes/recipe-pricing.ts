/**
 * Formação de preço sugerido (MVP):
 * - Custo por porção = custo total de matéria-prima ÷ rendimento (porções).
 * - Preço base = custo por porção × (1 + margem%/100) — margem sobre o custo.
 * - Preço com impostos = preço base × (1 + imposto%/100) — imposto incidente sobre o preço de venda.
 */

export type RecipePricingBreakdown = {
  costPerPortionBrl: number;
  suggestedBasePricePerPortionBrl: number;
  suggestedPriceWithTaxPerPortionBrl: number;
};

/**
 * Formação de preço baseado em CMV%:
 * - Preço Venda Receita = Custo Total / CMV%
 * - Preço Venda Porção = Preço Venda Receita / Porções
 * - Custo Porção = Custo Total / Porções
 */
export type CMVPricingBreakdown = {
  costPerPortionBrl: number;
  salesPricePerPortionBrl: number;
  totalSalesPriceBrl: number;
};

export function computeRecipePricingBreakdown(input: {
  totalMaterialCostBrl: number;
  portionsYield: number;
  marginPercent: number;
  taxPercent: number;
}): RecipePricingBreakdown {
  const portions = input.portionsYield;
  const safePortions =
    Number.isFinite(portions) && portions >= 1 ? portions : 1;
  const margin = clampPercent(input.marginPercent, 0, 1000);
  const tax = clampPercent(input.taxPercent, 0, 100);
  const total = Number.isFinite(input.totalMaterialCostBrl)
    ? Math.max(0, input.totalMaterialCostBrl)
    : 0;

  const costPerPortionBrl = total / safePortions;
  const suggestedBasePricePerPortionBrl =
    costPerPortionBrl * (1 + margin / 100);
  const suggestedPriceWithTaxPerPortionBrl =
    suggestedBasePricePerPortionBrl * (1 + tax / 100);

  return {
    costPerPortionBrl: roundMoney(costPerPortionBrl),
    suggestedBasePricePerPortionBrl: roundMoney(suggestedBasePricePerPortionBrl),
    suggestedPriceWithTaxPerPortionBrl: roundMoney(
      suggestedPriceWithTaxPerPortionBrl,
    ),
  };
}

export function computeCMVPricingBreakdown(input: {
  totalMaterialCostBrl: number;
  portionsYield: number;
  cmvPercent: number;
}): CMVPricingBreakdown {
  const portions = input.portionsYield;
  const safePortions =
    Number.isFinite(portions) && portions >= 1 ? portions : 1;
  const cmv = clampPercent(input.cmvPercent, 0.1, 100);
  const total = Number.isFinite(input.totalMaterialCostBrl)
    ? Math.max(0, input.totalMaterialCostBrl)
    : 0;

  const costPerPortionBrl = total / safePortions;
  const totalSalesPriceBrl = cmv > 0 ? total / (cmv / 100) : total;
  const salesPricePerPortionBrl = totalSalesPriceBrl / safePortions;

  return {
    costPerPortionBrl: roundMoney(costPerPortionBrl),
    salesPricePerPortionBrl: roundMoney(salesPricePerPortionBrl),
    totalSalesPriceBrl: roundMoney(totalSalesPriceBrl),
  };
}

function clampPercent(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(min, n));
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
