import { describe, expect, it } from "vitest";

import { scaleIngredientQuantitiesForPortionYield } from "./recipe-yield-scale";

describe("scaleIngredientQuantitiesForPortionYield", () => {
  it("escala proporcionalmente (10 → 20 porções = factor 2)", () => {
    const r = scaleIngredientQuantitiesForPortionYield({
      currentPortions: 10,
      targetPortions: 20,
      lineQuantities: ["100", "50"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.factor).toBe(2);
    expect(r.quantities).toEqual(["200", "100"]);
  });

  it("rejeita rendimento atual inválido", () => {
    const r = scaleIngredientQuantitiesForPortionYield({
      currentPortions: 0,
      targetPortions: 10,
      lineQuantities: ["1"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("invalid_current");
  });

  it("rejeita novo rendimento inválido", () => {
    const r = scaleIngredientQuantitiesForPortionYield({
      currentPortions: 4,
      targetPortions: 0,
      lineQuantities: ["1"],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("invalid_target");
  });

  it("mantém string original em quantidade não numérica (edge)", () => {
    const r = scaleIngredientQuantitiesForPortionYield({
      currentPortions: 2,
      targetPortions: 4,
      lineQuantities: ["abc", "10"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.quantities[0]).toBe("abc");
    expect(r.quantities[1]).toBe("20");
  });
});
