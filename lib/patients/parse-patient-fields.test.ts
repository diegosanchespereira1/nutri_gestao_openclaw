import { describe, expect, it } from "vitest";

import type { PatientInScope } from "@/lib/types/patients";

import {
  comparePatientsInScope,
  parseOptionalBirthDate,
  parsePatientDocument,
  parseSex,
} from "./parse-patient-fields";

describe("parseSex", () => {
  it("aceita os três valores do domínio", () => {
    expect(parseSex("female")).toBe("female");
    expect(parseSex("male")).toBe("male");
    expect(parseSex("other")).toBe("other");
  });

  it("vazio e nulo viram null (campo opcional)", () => {
    expect(parseSex("")).toBeNull();
    expect(parseSex(null)).toBeNull();
    expect(parseSex(undefined)).toBeNull();
  });

  it("valor desconhecido também vira null, não erro", () => {
    expect(parseSex("feminino")).toBeNull();
    expect(parseSex("F")).toBeNull();
  });
});

describe("parseOptionalBirthDate", () => {
  it("aceita ISO YYYY-MM-DD", () => {
    expect(parseOptionalBirthDate("2015-03-09")).toEqual({
      ok: true,
      value: "2015-03-09",
    });
  });

  it("ignora espaços em volta", () => {
    expect(parseOptionalBirthDate("  2015-03-09  ")).toEqual({
      ok: true,
      value: "2015-03-09",
    });
  });

  it("vazio é erro — a data é obrigatória apesar do nome da função", () => {
    expect(parseOptionalBirthDate("")).toEqual({
      ok: false,
      error: "Data de nascimento é obrigatória.",
    });
    expect(parseOptionalBirthDate("   ")).toEqual({
      ok: false,
      error: "Data de nascimento é obrigatória.",
    });
  });

  it("recusa formatos que não sejam ISO", () => {
    for (const v of ["09/03/2015", "2015-3-9", "20150309", "hoje"]) {
      expect(parseOptionalBirthDate(v)).toEqual({
        ok: false,
        error: "Data de nascimento inválida.",
      });
    }
  });

  it("valida o formato, não o calendário (comportamento atual)", () => {
    // 30 de fevereiro passa: a validação é só de forma.
    expect(parseOptionalBirthDate("2015-02-30").ok).toBe(true);
  });
});

describe("parsePatientDocument", () => {
  it("vazio vira null", () => {
    expect(parsePatientDocument("")).toEqual({ ok: true, value: null });
    expect(parsePatientDocument("--.-")).toEqual({ ok: true, value: null });
  });

  it("guarda só dígitos do CPF válido", () => {
    expect(parsePatientDocument("529.982.247-25")).toEqual({
      ok: true,
      value: "52998224725",
    });
  });

  it("recusa CPF inválido", () => {
    expect(parsePatientDocument("111.111.111-11")).toEqual({
      ok: false,
      error: "CPF inválido.",
    });
  });

  it("recusa CNPJ — documento de paciente é sempre CPF", () => {
    expect(parsePatientDocument("11222333000181").ok).toBe(false);
  });
});

describe("comparePatientsInScope", () => {
  const p = (
    full_name: string,
    school_grade_name: string | null,
    school_grade_position: number | null,
  ) =>
    ({
      full_name,
      school_grade_name,
      school_grade_position,
    }) as unknown as PatientInScope;

  it("quem tem série vem antes de quem não tem", () => {
    expect(comparePatientsInScope(p("Ana", "1º ano", 1), p("Bruno", null, null))).toBeLessThan(0);
    expect(comparePatientsInScope(p("Ana", null, null), p("Bruno", "1º ano", 1))).toBeGreaterThan(0);
  });

  it("ordena pela posição da série", () => {
    expect(comparePatientsInScope(p("Ana", "2º ano", 2), p("Bruno", "1º ano", 1))).toBeGreaterThan(0);
  });

  it("mesma posição: desempata pelo nome da série", () => {
    expect(comparePatientsInScope(p("Ana", "A", 1), p("Bruno", "B", 1))).toBeLessThan(0);
  });

  it("mesma série: desempata pelo nome do paciente, ignorando acento e caixa", () => {
    expect(comparePatientsInScope(p("ana", "1º ano", 1), p("Bruno", "1º ano", 1))).toBeLessThan(0);
    expect(comparePatientsInScope(p("Álvaro", "1º ano", 1), p("Bruno", "1º ano", 1))).toBeLessThan(0);
  });

  it("ordena uma lista completa de forma estável", () => {
    const lista = [
      p("Carlos", null, null),
      p("Bruno", "2º ano", 2),
      p("Ana", "1º ano", 1),
      p("Amanda", null, null),
    ];
    expect([...lista].sort(comparePatientsInScope).map((x) => x.full_name)).toEqual([
      "Ana",
      "Bruno",
      "Amanda",
      "Carlos",
    ]);
  });
});
