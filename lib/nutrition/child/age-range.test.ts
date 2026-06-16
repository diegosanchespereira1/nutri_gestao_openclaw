/**
 * Testes de visibilidade dos novos indicadores por faixa etária.
 * Regras:
 *   CB/PCT/SE: visíveis apenas quando ageMonths >= 3 && ageMonths <= 60
 *   PC:        visível apenas quando ageMonths >= 0 && ageMonths <= 60
 */
import { describe, expect, it } from "vitest";

/** Replica a lógica de `showSkinfoldAndCB` do formulário. */
function showsSkinfoldAndCB(ageMonths: number | null): boolean {
  return ageMonths != null && ageMonths >= 3 && ageMonths <= 60;
}

/** Replica a lógica de `showHeadCirc` do formulário. */
function showsHeadCircumference(ageMonths: number | null): boolean {
  return ageMonths != null && ageMonths >= 0 && ageMonths <= 60;
}

describe("showsSkinfoldAndCB — CB / PCT / SE", () => {
  it("visível no limite inferior (3 meses)", () => {
    expect(showsSkinfoldAndCB(3)).toBe(true);
  });

  it("visível no limite superior (60 meses)", () => {
    expect(showsSkinfoldAndCB(60)).toBe(true);
  });

  it("visível no meio da faixa (30 meses)", () => {
    expect(showsSkinfoldAndCB(30)).toBe(true);
  });

  it("NÃO visível antes de 3 meses (0 meses)", () => {
    expect(showsSkinfoldAndCB(0)).toBe(false);
  });

  it("NÃO visível antes de 3 meses (1 mês)", () => {
    expect(showsSkinfoldAndCB(1)).toBe(false);
  });

  it("NÃO visível antes de 3 meses (2 meses)", () => {
    expect(showsSkinfoldAndCB(2)).toBe(false);
  });

  it("NÃO visível após 60 meses (61 meses)", () => {
    expect(showsSkinfoldAndCB(61)).toBe(false);
  });

  it("NÃO visível após 60 meses (72 meses = 6 anos)", () => {
    expect(showsSkinfoldAndCB(72)).toBe(false);
  });

  it("NÃO visível com ageMonths null (nascimento ainda sem data)", () => {
    expect(showsSkinfoldAndCB(null)).toBe(false);
  });
});

describe("showsHeadCircumference — PC", () => {
  it("visível desde o nascimento (0 meses)", () => {
    expect(showsHeadCircumference(0)).toBe(true);
  });

  it("visível no limite superior (60 meses)", () => {
    expect(showsHeadCircumference(60)).toBe(true);
  });

  it("visível no meio da faixa (24 meses)", () => {
    expect(showsHeadCircumference(24)).toBe(true);
  });

  it("NÃO visível após 60 meses (61 meses)", () => {
    expect(showsHeadCircumference(61)).toBe(false);
  });

  it("NÃO visível com ageMonths null", () => {
    expect(showsHeadCircumference(null)).toBe(false);
  });
});
