import { describe, expect, it } from "vitest";

import {
  computeRecipeNutritionTotals,
  divideRecipeNutritionByPortions,
  quantityToNutritionGrams,
} from "./recipe-nutrition";

describe("quantityToNutritionGrams", () => {
  it("converte massa e volume", () => {
    expect(quantityToNutritionGrams(100, "g")).toBe(100);
    expect(quantityToNutritionGrams(1, "kg")).toBe(1000);
    expect(quantityToNutritionGrams(250, "ml")).toBe(250);
    expect(quantityToNutritionGrams(1, "l")).toBe(1000);
    expect(quantityToNutritionGrams(2, "un")).toBeNull();
  });
});

describe("computeRecipeNutritionTotals", () => {
  const taco = {
    id: "x",
    taco_code: "T1",
    name: "Teste",
    kcal_per_100g: 100,
    protein_g_per_100g: 10,
    carb_g_per_100g: 20,
    lipid_g_per_100g: 5,
    fiber_g_per_100g: 2,
  };

  it("aplica fator de cocção na quantidade", () => {
    const t = computeRecipeNutritionTotals([
      { quantity: 100, unit: "g", taco, cooking_factor: 2 },
    ]);
    expect(t.kcal).toBe(200);
  });

  it("soma 100 g como 1× referência", () => {
    const t = computeRecipeNutritionTotals([
      { quantity: 100, unit: "g", taco },
    ]);
    expect(t.kcal).toBe(100);
    expect(t.proteinG).toBe(10);
    expect(t.carbG).toBe(20);
    expect(t.lipidG).toBe(5);
    expect(t.fiberG).toBe(2);
    expect(t.unlinkedCount).toBe(0);
    expect(t.skippedUnitCount).toBe(0);
  });

  it("ignora sem TACO e un", () => {
    const t = computeRecipeNutritionTotals([
      { quantity: 100, unit: "g", taco: null },
      { quantity: 1, unit: "un", taco },
    ]);
    expect(t.kcal).toBe(0);
    expect(t.unlinkedCount).toBe(1);
    expect(t.skippedUnitCount).toBe(1);
  });
});

describe("divideRecipeNutritionByPortions", () => {
  it("divide macros pelo rendimento", () => {
    const per = divideRecipeNutritionByPortions(
      {
        kcal: 200,
        proteinG: 20,
        carbG: 30,
        lipidG: 10,
        fiberG: 5,
        skippedUnitCount: 0,
        unlinkedCount: 0,
      },
      4,
    );
    expect(per.kcal).toBe(50);
    expect(per.proteinG).toBe(5);
    expect(per.carbG).toBe(7.5);
  });
});
