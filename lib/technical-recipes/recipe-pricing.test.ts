import { describe, expect, it } from "vitest";

import { computeRecipePricingBreakdown } from "./recipe-pricing";

describe("computeRecipePricingBreakdown", () => {
  it("divide custo pelo rendimento e aplica margem e imposto", () => {
    const r = computeRecipePricingBreakdown({
      totalMaterialCostBrl: 100,
      portionsYield: 10,
      marginPercent: 50,
      taxPercent: 10,
    });
    expect(r.costPerPortionBrl).toBe(10);
    expect(r.suggestedBasePricePerPortionBrl).toBe(15);
    expect(r.suggestedPriceWithTaxPerPortionBrl).toBe(16.5);
  });

  it("usa rendimento mínimo 1 quando inválido", () => {
    const r = computeRecipePricingBreakdown({
      totalMaterialCostBrl: 20,
      portionsYield: 0,
      marginPercent: 0,
      taxPercent: 0,
    });
    expect(r.costPerPortionBrl).toBe(20);
  });
});
