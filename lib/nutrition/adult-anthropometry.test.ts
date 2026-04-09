import { describe, expect, it } from "vitest";

import {
  calcAdultEstimatedHeightM,
  calcAdultEstimatedWeightKg,
} from "./adult-anthropometry";

describe("calcAdultEstimatedWeightKg", () => {
  it("aplica a fórmula AJ×1,01 + CB×2,81 − 60,04", () => {
    expect(calcAdultEstimatedWeightKg(50, 30)).toBeCloseTo(50 * 1.01 + 30 * 2.81 - 60.04, 5);
  });
});

describe("calcAdultEstimatedHeightM", () => {
  it("homem branco: (71,85 + 1,88×AJ) ÷ 100", () => {
    const m = calcAdultEstimatedHeightM("homem_branco", 50, null);
    expect(m).toBeCloseTo((71.85 + 1.88 * 50) / 100, 5);
  });

  it("mulher branca exige idade", () => {
    expect(calcAdultEstimatedHeightM("mulher_branca", 50, null)).toBeNull();
    const m = calcAdultEstimatedHeightM("mulher_branca", 50, 40);
    expect(m).toBeCloseTo((70.25 + 1.87 * 50 - 0.06 * 40) / 100, 5);
  });
});
