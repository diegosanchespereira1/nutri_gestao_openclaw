import { describe, expect, it } from "vitest";

import {
  adultAnthroNote,
  adultAnthroReference,
  formatAdultAnthroMeasure,
  sexFromPatientGroup,
} from "./anthropometric-percentiles";

describe("sexFromPatientGroup", () => {
  it("deriva sexo do grupo", () => {
    expect(sexFromPatientGroup("homem_branco")).toBe("male");
    expect(sexFromPatientGroup("homem_negro")).toBe("male");
    expect(sexFromPatientGroup("mulher_branca")).toBe("female");
    expect(sexFromPatientGroup("mulher_negra")).toBe("female");
  });
});

describe("adultAnthroReference — CB adulto (Frisancho)", () => {
  it("valor igual à coluna P50 → percentil 50 e referência P50", () => {
    // Homem 30 anos, CB 32,5 = P50 da faixa 30.0–34.9.
    const r = adultAnthroReference("cb", "adult", "male", 30, 32.5);
    expect(r).not.toBeNull();
    expect(r!.percentile).toBe(50);
    expect(r!.nearestPercentile).toBe(50);
    expect(r!.nearestValue).toBe(32.5);
    expect(r!.classification).toBe("Eutrofia");
    expect(r!.source).toBe("Frisancho, 1999");
  });

  it("interpola entre colunas e devolve a coluna mais próxima", () => {
    // Homem 20 anos: P50=30,7 · P75=33,0. Valor 32,5 → ~P69,6 → coluna P75.
    const r = adultAnthroReference("cb", "adult", "male", 20, 32.5);
    expect(r!.percentile).toBeCloseTo(69.6, 0);
    expect(r!.nearestPercentile).toBe(75);
    expect(r!.nearestValue).toBe(33.0);
    expect(r!.classification).toBe("Eutrofia");
  });

  it("empate exato entre colunas resolve para a menor (P62,5 → P50)", () => {
    const r = adultAnthroReference("cb", "adult", "male", 20, 31.85);
    expect(r!.percentile).toBeCloseTo(62.5, 0);
    expect(r!.nearestPercentile).toBe(50);
  });

  it("abaixo da menor coluna (P5) → desnutrição com referência P5", () => {
    // Mulher 22 anos: P5 = 22,4.
    const r = adultAnthroReference("cb", "adult", "female", 22, 20.0);
    expect(r!.percentile).toBeNull();
    expect(r!.boundary).toBe("below_min");
    expect(r!.nearestPercentile).toBe(5);
    expect(r!.nearestValue).toBe(22.4);
    expect(r!.classification).toBe("Desnutrição");
  });

  it("acima da maior coluna (P95) → obesidade com referência P95", () => {
    // Mulher 22 anos: P95 = 35,2.
    const r = adultAnthroReference("cb", "adult", "female", 22, 36.0);
    expect(r!.boundary).toBe("above_max");
    expect(r!.nearestPercentile).toBe(95);
    expect(r!.nearestValue).toBe(35.2);
    expect(r!.classification).toBe("Obesidade");
  });

  it("idade sem faixa na tabela adulta (ex.: 70 anos) → null", () => {
    expect(adultAnthroReference("cb", "adult", "male", 70, 30)).toBeNull();
  });
});

describe("adultAnthroReference — idosos (NHANES III)", () => {
  it("CB idoso usa colunas 10–90", () => {
    // Homem 65 anos: P50 = 32,7 (faixa 60–69).
    const r = adultAnthroReference("cb", "geriatric", "male", 65, 32.7);
    expect(r!.percentile).toBe(50);
    expect(r!.minPercentile).toBe(10);
    expect(r!.maxPercentile).toBe(90);
    expect(r!.source).toBe("NHANES III");
  });

  it("≥80 anos cai na última faixa (sem teto)", () => {
    // Mulher 92 anos: P50 = 28,4.
    const r = adultAnthroReference("cb", "geriatric", "female", 92, 28.4);
    expect(r!.percentile).toBe(50);
    expect(r!.nearestValue).toBe(28.4);
  });

  it("abaixo de P10 no idoso → classificação ambígua sinalizada", () => {
    // Homem 65: menor coluna P10 = 28,4.
    const r = adultAnthroReference("cb", "geriatric", "male", 65, 25.0);
    expect(r!.boundary).toBe("below_min");
    expect(r!.classification).toBe("Desnutrição ou risco (< P10)");
  });

  it("idoso < 60 anos → null (fora da tabela NHANES)", () => {
    expect(adultAnthroReference("cb", "geriatric", "male", 55, 30)).toBeNull();
  });
});

describe("adultAnthroReference — DCT e CMB", () => {
  it("DCT homem 40 anos no P50 (12,0 mm)", () => {
    const r = adultAnthroReference("dct", "adult", "male", 40, 12.0);
    expect(r!.percentile).toBe(50);
    expect(r!.nearestValue).toBe(12.0);
    expect(r!.classification).toBe("Eutrofia");
  });

  it("DCT mulher idosa 75 anos entre P50 e P75", () => {
    // 70–79: P50=21,8 · P75=27,7. Valor 24,75 → ~P62,5.
    const r = adultAnthroReference("dct", "geriatric", "female", 75, 24.75);
    expect(r!.percentile).toBeCloseTo(62.5, 0);
    expect(r!.classification).toBe("Eutrofia");
  });

  it("CMB usa colunas próprias (5,10,25,50,75,90,95) e rótulo de alta muscularidade", () => {
    // Homem 30 anos: P90 = 31,4; acima de P95 (32,6) → alta muscularidade.
    const r = adultAnthroReference("cmb", "adult", "male", 30, 33.0);
    expect(r!.boundary).toBe("above_max");
    expect(r!.maxPercentile).toBe(95);
    expect(r!.classification).toBe("Alta muscularidade");
  });

  it("CMB homem 30 anos no P50 (27,9 cm)", () => {
    const r = adultAnthroReference("cmb", "adult", "male", 30, 27.9);
    expect(r!.percentile).toBe(50);
    expect(r!.classification).toBe("Eutrofia");
  });

  it("percentil < 15 → risco de desnutrição", () => {
    // Homem 30 anos CMB: P5=24,3 · P10=25,0. Valor 24,65 → ~P7,5.
    const r = adultAnthroReference("cmb", "adult", "male", 30, 24.65);
    expect(r!.percentile).toBeCloseTo(7.5, 0);
    expect(r!.classification).toBe("Risco de desnutrição");
  });
});

describe("adultAnthroReference — entradas inválidas", () => {
  it("valor/idade nulos ou inválidos → null", () => {
    expect(adultAnthroReference("cb", "adult", "male", null, 30)).toBeNull();
    expect(adultAnthroReference("cb", "adult", "male", 30, null)).toBeNull();
    expect(adultAnthroReference("cb", "adult", "male", 30, 0)).toBeNull();
    expect(adultAnthroReference("cb", "adult", "male", NaN, 30)).toBeNull();
    expect(adultAnthroReference("cb", "adult", "male", 30, NaN)).toBeNull();
  });

  it("idade abaixo de 18 na tabela adulta → null", () => {
    expect(adultAnthroReference("cb", "adult", "male", 17, 30)).toBeNull();
  });
});

describe("adultAnthroNote — textos de UI", () => {
  it("card inclui classificação, valor tabelado e fonte", () => {
    const note = adultAnthroNote("cb", "adult", "male", 30, 32.5, "card");
    expect(note).toBe("≈ P50 · Eutrofia\nRef. P50: 32,5 cm · Frisancho, 1999");
  });

  it("idade fora da tabela não some — explica cobertura", () => {
    const note = adultAnthroNote("cb", "adult", "male", 70, 30, "card");
    expect(note).toBe("Fora da faixa de referência (Frisancho, 1999 · 18–64 anos)");
  });

  it("paciente Adulto masc (homem ~43 anos) — CB/DCT/CMB da série DEV", () => {
    // Último ponto do seed: CB 29,2 · DCT 13,5 · CMB = CB − DCT×0,314
    const cb = adultAnthroNote("cb", "adult", "male", 43, 29.2, "short");
    const dct = adultAnthroNote("dct", "adult", "male", 43, 13.5, "short");
    const cmb = adultAnthroNote(
      "cmb",
      "adult",
      "male",
      43,
      29.2 - 13.5 * 0.314,
      "short",
    );
    expect(cb).toBe("≈ P12");
    expect(dct).toBe("≈ P59");
    expect(cmb).toBe("≈ P7");
  });

  it("formatAdultAnthroMeasure concatena valor e percentil", () => {
    expect(
      formatAdultAnthroMeasure("cb", "adult", "homem_branco", 30, 32.5, 1),
    ).toBe("32,5 cm · ≈ P50");
  });
});
