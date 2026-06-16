import { describe, expect, it } from "vitest";

import { correcaoAmputacao, correcaoImcAmputacao } from "./amputation";

// PE corrigido = PE × 100 / (100 − % amputado)

describe("correcaoAmputacao", () => {
  it("sem amputação (0%) → PE inalterado", () => {
    expect(correcaoAmputacao(60, 0)).toBe(60);
  });

  it("% negativo → PE inalterado", () => {
    expect(correcaoAmputacao(60, -5)).toBe(60);
  });

  it("perna + pé (5,9%) → PE corrigido correto", () => {
    // 60 × 100 / 94,1 ≈ 63,76
    expect(correcaoAmputacao(60, 5.9)).toBeCloseTo((60 * 100) / 94.1, 2);
  });

  it("coxa (10%) → PE corrigido correto", () => {
    // 60 × 100 / 90 ≈ 66,67
    expect(correcaoAmputacao(60, 10)).toBeCloseTo((60 * 100) / 90, 2);
  });

  it("pé (1,8%) → PE corrigido correto", () => {
    // 60 × 100 / 98,2 ≈ 61,10
    expect(correcaoAmputacao(60, 1.8)).toBeCloseTo((60 * 100) / 98.2, 2);
  });

  it("braço (6,5%) → PE corrigido correto", () => {
    expect(correcaoAmputacao(70, 6.5)).toBeCloseTo((70 * 100) / 93.5, 2);
  });

  it("PE corrigido é sempre maior que PE base quando ampPct > 0", () => {
    expect(correcaoAmputacao(60, 5.9)).toBeGreaterThan(60);
    expect(correcaoAmputacao(60, 10)).toBeGreaterThan(60);
  });

  it("correto para PE fracionado", () => {
    const base = 58.3;
    expect(correcaoAmputacao(base, 5.9)).toBeCloseTo((base * 100) / 94.1, 3);
  });
});

// IMC corrigido = IMC × (1 − ampPct/100)

describe("correcaoImcAmputacao", () => {
  it("sem amputação (0%) → IMC inalterado", () => {
    expect(correcaoImcAmputacao(24.5, 0)).toBe(24.5);
  });

  it("% negativo → IMC inalterado", () => {
    expect(correcaoImcAmputacao(24.5, -5)).toBe(24.5);
  });

  it("perna + pé (5,9%) → IMC reduzido em 5,9%", () => {
    const expected = 24.5 * (1 - 5.9 / 100);
    expect(correcaoImcAmputacao(24.5, 5.9)).toBeCloseTo(expected, 5);
  });

  it("coxa (10%) → IMC reduzido em 10%", () => {
    const expected = 24.5 * 0.9;
    expect(correcaoImcAmputacao(24.5, 10)).toBeCloseTo(expected, 5);
  });

  it("IMC corrigido é sempre menor que IMC base quando ampPct > 0", () => {
    expect(correcaoImcAmputacao(24.5, 5.9)).toBeLessThan(24.5);
  });
});
