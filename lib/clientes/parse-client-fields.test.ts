import { describe, expect, it } from "vitest";

import {
  escapeIlikeValue,
  parseClientDocument,
  parseClientKind,
  sanitizeSearchWildcards,
} from "./parse-client-fields";

describe("parseClientKind", () => {
  it("aceita pf e pj", () => {
    expect(parseClientKind("pf")).toBe("pf");
    expect(parseClientKind("pj")).toBe("pj");
  });

  it("rejeita qualquer outro valor", () => {
    for (const v of ["PF", "", null, undefined, 0, "pessoa_fisica"]) {
      expect(parseClientKind(v)).toBeNull();
    }
  });
});

describe("parseClientDocument", () => {
  it("documento vazio é permitido e vira null", () => {
    expect(parseClientDocument("pf", "")).toEqual({ ok: true, value: null });
    expect(parseClientDocument("pj", "   ")).toEqual({ ok: true, value: null });
    expect(parseClientDocument("pf", "---")).toEqual({ ok: true, value: null });
  });

  it("guarda só dígitos quando o CPF é válido", () => {
    expect(parseClientDocument("pf", "529.982.247-25")).toEqual({
      ok: true,
      value: "52998224725",
    });
  });

  it("recusa CPF inválido", () => {
    expect(parseClientDocument("pf", "111.111.111-11")).toEqual({
      ok: false,
      error: "CPF inválido.",
    });
  });

  it("guarda só dígitos quando o CNPJ é válido", () => {
    expect(parseClientDocument("pj", "11.222.333/0001-81")).toEqual({
      ok: true,
      value: "11222333000181",
    });
  });

  it("recusa CNPJ inválido", () => {
    expect(parseClientDocument("pj", "11.222.333/0001-99")).toEqual({
      ok: false,
      error: "CNPJ inválido.",
    });
  });

  it("valida pelo tipo escolhido, não pelo tamanho", () => {
    // CNPJ válido enviado como pf continua sendo recusado
    expect(parseClientDocument("pf", "11222333000181").ok).toBe(false);
    // CPF válido enviado como pj também
    expect(parseClientDocument("pj", "52998224725").ok).toBe(false);
  });
});

describe("sanitizeSearchWildcards", () => {
  it("remove curingas do ILIKE", () => {
    expect(sanitizeSearchWildcards("100%_puro\\")).toBe("100puro");
  });

  it("troca vírgula por espaço (vírgula separa filtros no PostgREST)", () => {
    expect(sanitizeSearchWildcards("silva,joão")).toBe("silva joão");
  });

  it("preserva texto comum e acentos", () => {
    expect(sanitizeSearchWildcards("Padaria Estrela")).toBe("Padaria Estrela");
    expect(sanitizeSearchWildcards("Açaí & Cia")).toBe("Açaí & Cia");
  });
});

describe("escapeIlikeValue", () => {
  it("duplica aspas duplas", () => {
    expect(escapeIlikeValue('%a"b%')).toBe('%a""b%');
  });

  it("não altera valor sem aspas", () => {
    expect(escapeIlikeValue("%silva%")).toBe("%silva%");
  });
});
