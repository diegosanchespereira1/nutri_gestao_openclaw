import { describe, expect, it } from "vitest";

import { classifyByPercentile } from "./classify";

// IMC meninas 5–19 anos (61 meses): p3=12.9, p85=16.9, p97=18.6
const bmi = [12.4, 12.9, 13.1, 13.8, 14.3, 15.2, 16.3, 16.9, 18.1, 18.6, 19.6] as const;
// Peso meninas 61 meses: p3=14.2, p97=24.3
const wfa = [13.4, 14.2, 14.6, 15.8, 16.6, 18.3, 20.2, 21.3, 23.4, 24.3, 26.2] as const;
// Estatura meninas 24 meses: p3=79.6
const hfa = [78.2, 79.6, 80.4, 82.4, 83.5, 85.7, 87.9, 89.1, 91, 91.8, 93.2] as const;
// Linha genérica para P/E: p3=11, p97=15.5
const pe = [10, 11, 11.5, 12, 12.5, 13, 14, 14.5, 15, 15.5, 16] as const;

describe("classifyByPercentile — IMC/idade (rótulos do procedimento)", () => {
  it.each([
    [12.5, "Baixo IMC para idade", "yellow"],
    [12.9, "IMC adequado ou eutrófico", "green"], // == P3 sobe para adequado
    [15.2, "IMC adequado ou eutrófico", "green"],
    [16.9, "Sobrepeso", "yellow"], // == P85 já é Sobrepeso
    [17.5, "Sobrepeso", "yellow"],
    [18.6, "Obesidade", "red"], // == P97 já é Obesidade
    [19.0, "Obesidade", "red"],
  ])("IMC %s → %s", (value, classification, color) => {
    const r = classifyByPercentile("bmi_for_age", 61, value as number, bmi);
    expect(r.classification).toBe(classification);
    expect(r.color).toBe(color);
  });
});

describe("classifyByPercentile — peso/idade", () => {
  it.each([
    [13.0, "Peso baixo para a idade", "yellow"],
    [18.3, "Peso adequado ou eutrófico", "green"],
    [24.3, "Peso elevado para a idade", "yellow"], // == P97 já é elevado
    [25.0, "Peso elevado para a idade", "yellow"],
  ])("peso %s → %s", (value, classification, color) => {
    const r = classifyByPercentile("weight_for_age", 61, value as number, wfa);
    expect(r.classification).toBe(classification);
    expect(r.color).toBe(color);
  });
});

describe("classifyByPercentile — peso/estatura (P/E)", () => {
  it.each([
    [10.5, "Peso baixo para a estatura"],
    [13.0, "Peso adequado ou eutrófico"],
    [16.0, "Peso elevado para a estatura"],
  ])("P/E %s → %s", (value, classification) => {
    expect(
      classifyByPercentile("weight_for_height", 24, value as number, pe).classification,
    ).toBe(classification);
  });
});

describe("classifyByPercentile — estatura/idade", () => {
  it("abaixo de P3 → baixa estatura", () => {
    expect(
      classifyByPercentile("height_for_age", 24, 78.0, hfa).classification,
    ).toBe("Baixa estatura para a idade");
  });
  it(">= P3 → estatura adequada", () => {
    expect(
      classifyByPercentile("height_for_age", 24, 90.0, hfa).classification,
    ).toBe("Estatura adequada para a idade");
  });
});
