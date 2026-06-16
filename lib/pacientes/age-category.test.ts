import { describe, expect, it } from "vitest";

import {
  ageYearsFromBirth,
  ageCategoryFromYears,
  assessmentVisibilityForCategory,
  parseAgeCategory,
  patientAgeCategory,
} from "./age-category";

const at = new Date("2026-06-14T12:00:00");

describe("ageYearsFromBirth", () => {
  it("calcula anos completos", () => {
    expect(ageYearsFromBirth("2018-03-12", at)).toBe(8);
    expect(ageYearsFromBirth("2018-12-31", at)).toBe(7); // ainda não fez aniversário
  });
  it("null para data ausente/futura/inválida", () => {
    expect(ageYearsFromBirth(null, at)).toBeNull();
    expect(ageYearsFromBirth("2030-01-01", at)).toBeNull();
    expect(ageYearsFromBirth("xx", at)).toBeNull();
  });
});

describe("patientAgeCategory", () => {
  it.each([
    ["2018-03-12", "crianca"], // 8 anos
    ["2009-06-14", "crianca"], // 17 anos
    ["2008-06-14", "adulto"], // 18 anos
    ["1980-01-01", "adulto"], // ~46
    ["1966-06-14", "idoso"], // 60 anos
    ["1950-01-01", "idoso"],
  ])("%s → %s", (birth, expected) => {
    expect(patientAgeCategory(birth, at)).toBe(expected);
  });
  it("sem data → null", () => {
    expect(patientAgeCategory(null, at)).toBeNull();
  });
});

describe("parseAgeCategory", () => {
  it("aceita categorias válidas e cai para all", () => {
    expect(parseAgeCategory("crianca")).toBe("crianca");
    expect(parseAgeCategory("idoso")).toBe("idoso");
    expect(parseAgeCategory("xpto")).toBe("all");
    expect(parseAgeCategory(undefined)).toBe("all");
  });
});

// ── ageCategoryFromYears ──────────────────────────────────────────────────────

describe("ageCategoryFromYears", () => {
  it("null → null", () => expect(ageCategoryFromYears(null)).toBeNull());
  it("undefined → null", () => expect(ageCategoryFromYears(undefined)).toBeNull());
  it("NaN → null", () => expect(ageCategoryFromYears(NaN)).toBeNull());
  it("0 → crianca",  () => expect(ageCategoryFromYears(0)).toBe("crianca"));
  it("17 → crianca", () => expect(ageCategoryFromYears(17)).toBe("crianca"));
  it("18 → adulto",  () => expect(ageCategoryFromYears(18)).toBe("adulto"));
  it("59 → adulto",  () => expect(ageCategoryFromYears(59)).toBe("adulto"));
  it("60 → idoso",   () => expect(ageCategoryFromYears(60)).toBe("idoso"));
  it("100 → idoso",  () => expect(ageCategoryFromYears(100)).toBe("idoso"));
});

// ── assessmentVisibilityForCategory ──────────────────────────────────────────

describe("assessmentVisibilityForCategory", () => {
  it("crianca → só aba infantil visível", () => {
    expect(assessmentVisibilityForCategory("crianca")).toEqual({
      showChild: true,
      showAdult: false,
      showGeriatric: false,
    });
  });

  it("adulto → só aba adulto visível", () => {
    expect(assessmentVisibilityForCategory("adulto")).toEqual({
      showChild: false,
      showAdult: true,
      showGeriatric: false,
    });
  });

  it("idoso → só aba geriátrica visível", () => {
    expect(assessmentVisibilityForCategory("idoso")).toEqual({
      showChild: false,
      showAdult: false,
      showGeriatric: true,
    });
  });

  it("null (sem data de nascimento) → todas as abas visíveis", () => {
    expect(assessmentVisibilityForCategory(null)).toEqual({
      showChild: true,
      showAdult: true,
      showGeriatric: true,
    });
  });
});
