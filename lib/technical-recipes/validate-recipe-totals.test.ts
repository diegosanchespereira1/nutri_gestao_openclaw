import { describe, expect, it } from "vitest";

import { validateRecipeTotals } from "./validate-recipe-totals";

describe("validateRecipeTotals", () => {
  it("retorna empty quando não há linhas", () => {
    const r = validateRecipeTotals([]);
    expect(r.kind).toBe("empty");
    expect(r.label).toContain("Adicione");
  });

  it("soma massa em gramas", () => {
    const r = validateRecipeTotals([
      { quantity: 250, unit: "g" },
      { quantity: 1.5, unit: "kg" },
    ]);
    expect(r.kind).toBe("mass");
    if (r.kind !== "mass") return;
    expect(r.totalGrams).toBe(1750);
    expect(r.label).toContain("1750 g");
  });

  it("soma volume em mililitros", () => {
    const r = validateRecipeTotals([
      { quantity: 500, unit: "ml" },
      { quantity: 2, unit: "l" },
    ]);
    expect(r.kind).toBe("volume");
    if (r.kind !== "volume") return;
    expect(r.totalMl).toBe(2500);
    expect(r.label).toContain("2500 ml");
  });

  it("indica mistura quando unidades são heterogéneas", () => {
    const r = validateRecipeTotals([
      { quantity: 100, unit: "g" },
      { quantity: 200, unit: "ml" },
    ]);
    expect(r.kind).toBe("mixed");
    expect(r.label).toContain("Unidades mistas");
  });

  it("trata unidades (un) como mistura com massa", () => {
    const r = validateRecipeTotals([
      { quantity: 3, unit: "un" },
      { quantity: 100, unit: "g" },
    ]);
    expect(r.kind).toBe("mixed");
  });

  it("formata totais decimais de massa", () => {
    const r = validateRecipeTotals([{ quantity: 100.25, unit: "g" }]);
    expect(r.kind).toBe("mass");
    if (r.kind !== "mass") return;
    expect(r.label).toContain("100.25 g");
  });
});
