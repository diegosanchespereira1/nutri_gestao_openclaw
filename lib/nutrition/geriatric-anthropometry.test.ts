import { describe, expect, it } from "vitest";

import {
  calcGeriatricEstimatedWeightKg,
  calcGeriatricEstimatedHeightM,
} from "./geriatric-anthropometry";

// ── Peso Estimado — Chumlea et al. (1988) ────────────────────────────────────

describe("calcGeriatricEstimatedWeightKg — mulher branca", () => {
  // AJ×1,09 + CB×2,68 − 65,51
  it("AJ=50, CB=25 → valor correto", () => {
    expect(calcGeriatricEstimatedWeightKg("mulher_branca", 50, 25)).toBeCloseTo(
      50 * 1.09 + 25 * 2.68 - 65.51,
      5,
    );
  });

  it("AJ=45, CB=22 → valor positivo e finito", () => {
    const v = calcGeriatricEstimatedWeightKg("mulher_branca", 45, 22);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
  });
});

describe("calcGeriatricEstimatedWeightKg — mulher negra", () => {
  // AJ×1,50 + CB×2,58 − 84,22
  it("AJ=50, CB=25 → valor correto", () => {
    expect(calcGeriatricEstimatedWeightKg("mulher_negra", 50, 25)).toBeCloseTo(
      50 * 1.5 + 25 * 2.58 - 84.22,
      5,
    );
  });

  it("produz resultado diferente da mulher branca (equações distintas)", () => {
    const branca = calcGeriatricEstimatedWeightKg("mulher_branca", 50, 25);
    const negra  = calcGeriatricEstimatedWeightKg("mulher_negra",  50, 25);
    expect(branca).not.toBeCloseTo(negra, 2);
  });
});

describe("calcGeriatricEstimatedWeightKg — homem branco", () => {
  // AJ×1,10 + CB×3,07 − 75,81
  it("AJ=50, CB=25 → valor correto", () => {
    expect(calcGeriatricEstimatedWeightKg("homem_branco", 50, 25)).toBeCloseTo(
      50 * 1.1 + 25 * 3.07 - 75.81,
      5,
    );
  });
});

describe("calcGeriatricEstimatedWeightKg — homem negro", () => {
  // AJ×0,44 + CB×2,86 − 39,21
  it("AJ=50, CB=25 → valor correto", () => {
    expect(calcGeriatricEstimatedWeightKg("homem_negro", 50, 25)).toBeCloseTo(
      50 * 0.44 + 25 * 2.86 - 39.21,
      5,
    );
  });

  it("produz resultado diferente do homem branco (equações distintas)", () => {
    const branco = calcGeriatricEstimatedWeightKg("homem_branco", 50, 25);
    const negro  = calcGeriatricEstimatedWeightKg("homem_negro",  50, 25);
    expect(branco).not.toBeCloseTo(negro, 2);
  });
});

// ── Altura Estimada — Chumlea et al. (1985) ───────────────────────────────────

describe("calcGeriatricEstimatedHeightM — homens", () => {
  // (64,19 + 2,04×AJ − 0,04×Idade) / 100
  it("homem branco: AJ=50, Idade=70 → altura correta em metros", () => {
    const expected = (64.19 + 2.04 * 50 - 0.04 * 70) / 100;
    expect(calcGeriatricEstimatedHeightM("homem_branco", 50, 70)).toBeCloseTo(expected, 5);
  });

  it("homem negro usa a mesma fórmula que homem branco", () => {
    const branco = calcGeriatricEstimatedHeightM("homem_branco", 50, 70);
    const negro  = calcGeriatricEstimatedHeightM("homem_negro",  50, 70);
    expect(branco).toBeCloseTo(negro, 10);
  });

  it("AJ maior → altura maior (relação positiva)", () => {
    const h1 = calcGeriatricEstimatedHeightM("homem_branco", 45, 70);
    const h2 = calcGeriatricEstimatedHeightM("homem_branco", 55, 70);
    expect(h2).toBeGreaterThan(h1);
  });

  it("idade maior → altura menor (relação negativa)", () => {
    const h1 = calcGeriatricEstimatedHeightM("homem_branco", 50, 60);
    const h2 = calcGeriatricEstimatedHeightM("homem_branco", 50, 90);
    expect(h2).toBeLessThan(h1);
  });
});

describe("calcGeriatricEstimatedHeightM — mulheres", () => {
  // (84,88 + 1,83×AJ − 0,24×Idade) / 100
  it("mulher branca: AJ=50, Idade=70 → altura correta em metros", () => {
    const expected = (84.88 + 1.83 * 50 - 0.24 * 70) / 100;
    expect(calcGeriatricEstimatedHeightM("mulher_branca", 50, 70)).toBeCloseTo(expected, 5);
  });

  it("mulher negra usa a mesma fórmula que mulher branca", () => {
    const branca = calcGeriatricEstimatedHeightM("mulher_branca", 50, 70);
    const negra  = calcGeriatricEstimatedHeightM("mulher_negra",  50, 70);
    expect(branca).toBeCloseTo(negra, 10);
  });

  it("resultado em metros (entre 1,0 e 2,2 para entradas típicas)", () => {
    const h = calcGeriatricEstimatedHeightM("mulher_branca", 48, 75);
    expect(h).toBeGreaterThan(1.0);
    expect(h).toBeLessThan(2.2);
  });
});

describe("calcGeriatricEstimatedHeightM — homem vs mulher", () => {
  it("fórmulas masculina e feminina produzem valores diferentes", () => {
    const hm = calcGeriatricEstimatedHeightM("homem_branco", 50, 70);
    const hf = calcGeriatricEstimatedHeightM("mulher_branca", 50, 70);
    expect(hm).not.toBeCloseTo(hf, 2);
  });
});
