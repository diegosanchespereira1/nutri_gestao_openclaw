import { describe, expect, it } from "vitest";

import { assessChild } from "./assess";
import type { ChildIndicator, ChildIndicatorResult } from "./types";

function pick(
  result: { indicators: ChildIndicatorResult[] },
  indicator: ChildIndicator,
): ChildIndicatorResult {
  const r = result.indicators.find((i) => i.indicator === indicator);
  if (!r) throw new Error(`indicador ausente: ${indicator}`);
  return r;
}

describe("assessChild (percentil)", () => {
  // Menina, 61 meses (5a1m), 22 kg, 120 cm → IMC ≈ 15.3
  const base = {
    sex: "female" as const,
    ageMonths: 61,
    weightKg: 22,
    heightCm: 120,
    method: "percentile" as const,
    armCircumferenceCm: null,
    tricepsSkinfoldMm: null,
    subscapularSkinfoldMm: null,
    headCircumferenceCm: null,
  };

  it("calcula o IMC", () => {
    expect(assessChild(base).bmi).toBe(15.3);
  });

  it("classifica IMC como adequado/eutrófico", () => {
    const r = pick(assessChild(base), "bmi_for_age");
    expect(r.classification).toBe("IMC adequado ou eutrófico");
    expect(r.color).toBe("green");
    expect(r.percentile).not.toBeNull();
    expect(r.z).toBeNull();
    expect(r.outOfRange).toBe(false);
  });

  it("classifica peso e estatura como adequados", () => {
    const result = assessChild(base);
    expect(pick(result, "weight_for_age").classification).toBe(
      "Peso adequado ou eutrófico",
    );
    expect(pick(result, "height_for_age").classification).toBe(
      "Estatura adequada para a idade",
    );
  });

  it("expõe valor medido e faixa adequada (referência) por indicador", () => {
    const r = assessChild(base);
    const bmi = pick(r, "bmi_for_age");
    expect(bmi.value).toBe(15.3);
    expect(bmi.adequateLow).toBe(12.9); // P3
    expect(bmi.adequateHigh).toBe(16.9); // P85 (eutrofia)

    const weight = pick(r, "weight_for_age");
    expect(weight.value).toBe(22);
    expect(weight.adequateLow).toBe(14.2); // P3
    expect(weight.adequateHigh).toBe(24.3); // P97

    const height = pick(r, "height_for_age");
    expect(height.adequateLow).toBe(100.6); // P3
    expect(height.adequateHigh).toBeNull(); // estatura: só limite inferior
  });

  it("retorna indicadores base + novos (CB, PCT, SE, PC) sem P/E quando tabela P/E ausente", () => {
    const result = assessChild(base);
    expect(result.indicators).toHaveLength(7);
    expect(
      result.indicators.some((i) => i.indicator === "weight_for_height"),
    ).toBe(false);
    expect(
      result.indicators.map((i) => i.indicator),
    ).toEqual(
      expect.arrayContaining([
        "weight_for_age",
        "height_for_age",
        "bmi_for_age",
        "arm_circumference_for_age",
        "triceps_skinfold_for_age",
        "subscapular_skinfold_for_age",
        "head_circumference_for_age",
      ]),
    );
  });
});

describe("assessChild — casos de borda", () => {
  it("escore-Z fora da faixa dos novos indicadores (idade > 60m) → CB/PCT/SE/PC fora de faixa", () => {
    const r = assessChild({
      sex: "female",
      ageMonths: 61,
      weightKg: 22,
      heightCm: 120,
      method: "zscore",
      armCircumferenceCm: 15,
      tricepsSkinfoldMm: 10,
      subscapularSkinfoldMm: 8,
      headCircumferenceCm: 48,
    });
    const newOnes = r.indicators.filter((i) =>
      [
        "arm_circumference_for_age",
        "triceps_skinfold_for_age",
        "subscapular_skinfold_for_age",
        "head_circumference_for_age",
      ].includes(i.indicator),
    );
    expect(newOnes.every((i) => i.outOfRange)).toBe(true);
    expect(pick(r, "bmi_for_age").outOfRange).toBe(true);
  });

  it("idade fora da tabela de peso (>120m) → só peso fica fora de faixa", () => {
    const r = assessChild({
      sex: "female",
      ageMonths: 130,
      weightKg: 30,
      heightCm: 135,
      method: "percentile",
      armCircumferenceCm: null,
      tricepsSkinfoldMm: null,
      subscapularSkinfoldMm: null,
      headCircumferenceCm: null,
    });
    expect(pick(r, "weight_for_age").outOfRange).toBe(true);
    expect(pick(r, "bmi_for_age").outOfRange).toBe(false);
    expect(pick(r, "height_for_age").outOfRange).toBe(false);
  });

  it("sem peso/altura → IMC null e indicadores sem dados (não fora de faixa)", () => {
    const r = assessChild({
      sex: "male",
      ageMonths: 24,
      weightKg: null,
      heightCm: null,
      method: "percentile",
      armCircumferenceCm: null,
      tricepsSkinfoldMm: null,
      subscapularSkinfoldMm: null,
      headCircumferenceCm: null,
    });
    expect(r.bmi).toBeNull();
    const wfa = pick(r, "weight_for_age");
    expect(wfa.classification).toBeNull();
    expect(wfa.outOfRange).toBe(false);
  });

  it("peso inválido (<=0) não lança e não classifica", () => {
    const r = assessChild({
      sex: "male",
      ageMonths: 24,
      weightKg: 0,
      heightCm: 86,
      method: "percentile",
      armCircumferenceCm: null,
      tricepsSkinfoldMm: null,
      subscapularSkinfoldMm: null,
      headCircumferenceCm: null,
    });
    expect(pick(r, "weight_for_age").classification).toBeNull();
    expect(pick(r, "height_for_age").classification).not.toBeNull();
  });
});
