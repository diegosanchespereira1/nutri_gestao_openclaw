import { describe, expect, it } from "vitest";

import { ageInMonths, ageInMonthsFromISO, bmiAgeBand } from "./age";

describe("ageInMonths", () => {
  it("mesmo dia → 0 meses", () => {
    expect(ageInMonths(new Date("2020-01-10"), new Date("2020-01-10"))).toBe(0);
  });

  it("um mês exato → 1", () => {
    expect(ageInMonths(new Date("2020-01-10"), new Date("2020-02-10"))).toBe(1);
  });

  it("um dia antes de completar o mês → 0", () => {
    expect(ageInMonths(new Date("2020-01-10"), new Date("2020-02-09"))).toBe(0);
  });

  it("conta meses completos quando o dia ainda não chegou", () => {
    // de 31/jan a 28/fev: dia 28 < 31 → não completou o mês
    expect(ageInMonths(new Date("2020-01-31"), new Date("2020-02-28"))).toBe(0);
  });

  it("vários anos", () => {
    expect(ageInMonths(new Date("2019-06-13"), new Date("2026-06-13"))).toBe(84);
  });

  it("data de avaliação anterior ao nascimento → null", () => {
    expect(ageInMonths(new Date("2020-05-01"), new Date("2020-04-01"))).toBeNull();
  });

  it("datas inválidas → null", () => {
    expect(ageInMonths(new Date("xx"), new Date("2020-01-01"))).toBeNull();
  });
});

describe("ageInMonthsFromISO", () => {
  it("aceita ISO strings", () => {
    expect(ageInMonthsFromISO("2020-01-10", "2021-01-10")).toBe(12);
  });
  it("null em entrada faltante", () => {
    expect(ageInMonthsFromISO(null, "2021-01-10")).toBeNull();
  });
});

describe("bmiAgeBand", () => {
  it("< 60 meses → 0_5", () => {
    expect(bmiAgeBand(59)).toBe("0_5");
  });
  it(">= 60 meses → 5_19", () => {
    expect(bmiAgeBand(60)).toBe("5_19");
  });
});
