import { describe, expect, it } from "vitest";

import {
  lineRawMaterialCostBrl,
  sumRecipeMaterialCostBrl,
  unitDimension,
} from "./recipe-material-cost";

describe("unitDimension", () => {
  it("classifica massa, volume e unidade", () => {
    expect(unitDimension("g")).toBe("mass");
    expect(unitDimension("kg")).toBe("mass");
    expect(unitDimension("ml")).toBe("volume");
    expect(unitDimension("l")).toBe("volume");
    expect(unitDimension("un")).toBe("count");
  });
});

describe("lineRawMaterialCostBrl", () => {
  it("calcula massa (g) com preço por kg", () => {
    const m = { price_unit: "kg" as const, unit_price_brl: 10 };
    const r = lineRawMaterialCostBrl(500, "g", m);
    expect(r.brl).toBe(5);
    expect(r.skipped).toBe(false);
  });

  it("calcula volume (ml) com preço por l", () => {
    const m = { price_unit: "l" as const, unit_price_brl: 8 };
    const r = lineRawMaterialCostBrl(250, "ml", m);
    expect(r.brl).toBe(2);
    expect(r.skipped).toBe(false);
  });

  it("recusa dimensão diferente", () => {
    const m = { price_unit: "kg" as const, unit_price_brl: 10 };
    const r = lineRawMaterialCostBrl(100, "ml", m);
    expect(r.skipped).toBe(true);
    expect(r.reason).toBe("dimension_mismatch");
  });

  it("unidades", () => {
    const m = { price_unit: "un" as const, unit_price_brl: 3 };
    const r = lineRawMaterialCostBrl(4, "un", m);
    expect(r.brl).toBe(12);
    expect(r.skipped).toBe(false);
  });
});

describe("sumRecipeMaterialCostBrl", () => {
  it("soma linhas com matéria-prima", () => {
    const s = sumRecipeMaterialCostBrl([
      {
        quantity: 100,
        unit: "g",
        raw_material: { price_unit: "kg", unit_price_brl: 20 },
      },
      { quantity: 1, unit: "un", raw_material: null },
    ]);
    expect(s.totalBrl).toBe(2);
    expect(s.linesWithCost).toBe(1);
  });
});
