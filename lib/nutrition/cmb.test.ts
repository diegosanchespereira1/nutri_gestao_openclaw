import { describe, expect, it } from "vitest";

import { calcCMB } from "./cmb";

// CMB = CB − (DCT × 0,314)   [Gurney & Jelliffe, 1973]

describe("calcCMB", () => {
  it("CB=25, DCT=8 → CMB ≈ 22,49 cm", () => {
    expect(calcCMB(25, 8)).toBeCloseTo(25 - 8 * 0.314, 5);
  });

  it("CB=30, DCT=10 → CMB ≈ 26,86 cm", () => {
    expect(calcCMB(30, 10)).toBeCloseTo(30 - 10 * 0.314, 5);
  });

  it("DCT=0 → CMB é igual a CB", () => {
    expect(calcCMB(25, 0)).toBe(25);
  });

  it("valores típicos ficam entre 10 e 40 cm", () => {
    const cmb = calcCMB(28, 12) as number;
    expect(cmb).toBeGreaterThan(10);
    expect(cmb).toBeLessThan(40);
  });

  it("cb null → retorna null", () => {
    expect(calcCMB(null, 8)).toBeNull();
  });

  it("dct null → retorna null", () => {
    expect(calcCMB(25, null)).toBeNull();
  });

  it("ambos null → retorna null", () => {
    expect(calcCMB(null, null)).toBeNull();
  });

  it("DCT muito alto pode resultar em CMB negativo (não bloqueia)", () => {
    // Entrada absurda mas não deve lançar
    const cmb = calcCMB(5, 20);
    expect(typeof cmb).toBe("number");
    expect((cmb as number)).toBeLessThan(0);
  });
});
