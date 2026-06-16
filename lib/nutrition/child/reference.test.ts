import { describe, expect, it } from "vitest";

import { getReference, hasCoverage, isMethodAvailable } from "./reference";

describe("isMethodAvailable", () => {
  it("percentil e escore-Z disponíveis", () => {
    expect(isMethodAvailable("percentile")).toBe(true);
    expect(isMethodAvailable("zscore")).toBe(true);
  });
});

describe("getReference (percentil)", () => {
  it("IMC meninas 61 meses bate com o documento", () => {
    expect(getReference("bmi_for_age", "female", 61, "percentile")).toEqual([
      12.4, 12.9, 13.1, 13.8, 14.3, 15.2, 16.3, 16.9, 18.1, 18.6, 19.6,
    ]);
  });

  it("peso meninos 0 mês bate com o documento", () => {
    expect(getReference("weight_for_age", "male", 0, "percentile")).toEqual([
      2.3, 2.5, 2.6, 2.9, 3, 3.3, 3.7, 3.9, 4.2, 4.3, 4.6,
    ]);
  });

  it("peso/idade acima de 120 meses → sem cobertura (null)", () => {
    expect(getReference("weight_for_age", "male", 121, "percentile")).toBeNull();
    expect(hasCoverage("weight_for_age", "male", 121, "percentile")).toBe(false);
  });

  it("IMC tem cobertura até 228 meses", () => {
    expect(hasCoverage("bmi_for_age", "female", 228, "percentile")).toBe(true);
  });

  it("escore-Z com cobertura nos novos indicadores (CB, mês 3)", () => {
    expect(
      getReference("arm_circumference_for_age", "female", 3, "zscore"),
    ).not.toBeNull();
    expect(getReference("bmi_for_age", "female", 61, "zscore")).toBeNull();
  });

  it("idade inválida → null", () => {
    expect(getReference("bmi_for_age", "female", -1, "percentile")).toBeNull();
  });
});
