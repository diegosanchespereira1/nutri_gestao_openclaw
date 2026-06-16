/**
 * Testes de lookup e integridade dos novos datasets de referência
 * (CB, PCT, SE, PC) — percentil e escore-Z.
 */
import { describe, expect, it } from "vitest";
import { getReference } from "./reference";
import { PERCENTILE_TABLES } from "./reference-data/percentile/index";
import { ZSCORE_TABLES } from "./reference-data/zscore/index";

// ---------------------------------------------------------------------------
// 1. Lookup por getReference
// ---------------------------------------------------------------------------

const NEW_INDICATORS = [
  "arm_circumference_for_age",
  "triceps_skinfold_for_age",
  "subscapular_skinfold_for_age",
  "head_circumference_for_age",
] as const;

const SEXES = ["female", "male"] as const;

describe("getReference — novos indicadores — faixa coberta", () => {
  for (const indicator of NEW_INDICATORS) {
    for (const sex of SEXES) {
      const minMonth = indicator === "head_circumference_for_age" ? 0 : 3;

      it(`${indicator}:${sex} retorna linha para mês ${minMonth} (início)`, () => {
        const row = getReference(indicator, sex, minMonth, "percentile");
        expect(row).not.toBeNull();
        expect(Array.isArray(row)).toBe(true);
      });

      it(`${indicator}:${sex} retorna linha para mês 60 (fim)`, () => {
        const row = getReference(indicator, sex, 60, "percentile");
        expect(row).not.toBeNull();
      });

      it(`${indicator}:${sex} retorna 11 colunas no percentil`, () => {
        const row = getReference(indicator, sex, 30, "percentile");
        expect(row).toHaveLength(11);
      });

      it(`${indicator}:${sex} retorna 7 colunas no escore-Z`, () => {
        const row = getReference(indicator, sex, 30, "zscore");
        expect(row).toHaveLength(7);
      });
    }
  }
});

describe("getReference — fora da faixa", () => {
  it("arm_circumference_for_age: null para mês 2 (tabela começa em 3)", () => {
    expect(getReference("arm_circumference_for_age", "female", 2, "percentile")).toBeNull();
  });

  it("arm_circumference_for_age: null para mês 61 (tabela termina em 60)", () => {
    expect(getReference("arm_circumference_for_age", "female", 61, "percentile")).toBeNull();
  });

  it("triceps_skinfold_for_age: null para mês 0 (tabela começa em 3)", () => {
    expect(getReference("triceps_skinfold_for_age", "male", 0, "percentile")).toBeNull();
  });

  it("subscapular_skinfold_for_age: null para mês 1 (tabela começa em 3)", () => {
    expect(getReference("subscapular_skinfold_for_age", "female", 1, "percentile")).toBeNull();
  });

  it("head_circumference_for_age: null para mês 61", () => {
    expect(getReference("head_circumference_for_age", "male", 61, "percentile")).toBeNull();
  });

  it("head_circumference_for_age: linha disponível para mês 0", () => {
    expect(getReference("head_circumference_for_age", "female", 0, "percentile")).not.toBeNull();
  });
});

describe("getReference — meninas ≠ meninos", () => {
  for (const indicator of NEW_INDICATORS) {
    it(`${indicator}: datasets de female e male são diferentes no mês 30`, () => {
      const female = getReference(indicator, "female", 30, "percentile");
      const male   = getReference(indicator, "male",   30, "percentile");
      expect(female).not.toBeNull();
      expect(male).not.toBeNull();
      // Médias (p50 = índice 5) diferem entre sexos em todos os indicadores
      expect(female![5]).not.toEqual(male![5]);
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Integridade dos arquivos de dados (formato, sem NaN, ordem crescente)
// ---------------------------------------------------------------------------

describe("integridade dos dados — percentil (11 colunas, ordem crescente)", () => {
  for (const indicator of NEW_INDICATORS) {
    for (const sex of SEXES) {
      const key = `${indicator}:${sex}`;
      const table = PERCENTILE_TABLES[key];

      it(`${key}: tabela existe e não está vazia`, () => {
        expect(table).toBeDefined();
        expect(Object.keys(table).length).toBeGreaterThan(0);
      });

      it(`${key}: cada linha tem 11 colunas`, () => {
        for (const [month, row] of Object.entries(table)) {
          expect(row, `mês ${month}`).toHaveLength(11);
        }
      });

      it(`${key}: sem NaN ou Infinity`, () => {
        for (const [month, row] of Object.entries(table)) {
          for (const val of row) {
            expect(typeof val, `mês ${month}`).toBe("number");
            expect(Number.isFinite(val), `mês ${month}`).toBe(true);
          }
        }
      });

      it(`${key}: percentis em ordem não-decrescente (p1 ≤ p3 ≤ … ≤ p99)`, () => {
        for (const [month, row] of Object.entries(table)) {
          for (let i = 1; i < row.length; i++) {
            expect(row[i], `mês ${month} col ${i}`).toBeGreaterThanOrEqual(row[i - 1]);
          }
        }
      });

      it(`${key}: faixa de meses correta`, () => {
        const months = Object.keys(table).map(Number);
        const expectedMin = indicator === "head_circumference_for_age" ? 0 : 3;
        expect(Math.min(...months)).toBe(expectedMin);
        expect(Math.max(...months)).toBe(60);
      });
    }
  }
});

describe("integridade dos dados — escore-Z (7 colunas, ordem crescente)", () => {
  for (const indicator of NEW_INDICATORS) {
    for (const sex of SEXES) {
      const key = `${indicator}:${sex}`;
      const table = ZSCORE_TABLES[key];

      it(`${key}: tabela z-score existe e não está vazia`, () => {
        expect(table).toBeDefined();
        expect(Object.keys(table).length).toBeGreaterThan(0);
      });

      it(`${key}: cada linha z-score tem 7 colunas`, () => {
        for (const [month, row] of Object.entries(table)) {
          expect(row, `mês ${month}`).toHaveLength(7);
        }
      });

      it(`${key}: z-score sem NaN`, () => {
        for (const [month, row] of Object.entries(table)) {
          for (const val of row) {
            expect(Number.isFinite(val), `mês ${month}`).toBe(true);
          }
        }
      });

      it(`${key}: SDs em ordem crescente (-3SD < … < +3SD)`, () => {
        for (const [month, row] of Object.entries(table)) {
          for (let i = 1; i < row.length; i++) {
            expect(row[i], `mês ${month} col ${i}`).toBeGreaterThan(row[i - 1]);
          }
        }
      });
    }
  }
});
