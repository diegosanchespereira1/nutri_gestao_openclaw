import { describe, expect, it } from "vitest";

import {
  isValidModuleContextParam,
  moduleContextToParam,
  parseModuleContextParam,
} from "./module-context";

// ── parseModuleContextParam ─────────────────────────────────────────────────

describe("parseModuleContextParam — aliases válidos", () => {
  it("aceita alias curto 'an'", () => {
    expect(parseModuleContextParam("an")).toBe("atendimento_nutricional");
  });

  it("aceita alias curto 'aa'", () => {
    expect(parseModuleContextParam("aa")).toBe("assessoria_alimentacao");
  });

  it("aceita valor completo 'atendimento_nutricional'", () => {
    expect(parseModuleContextParam("atendimento_nutricional")).toBe(
      "atendimento_nutricional",
    );
  });

  it("aceita valor completo 'assessoria_alimentacao'", () => {
    expect(parseModuleContextParam("assessoria_alimentacao")).toBe(
      "assessoria_alimentacao",
    );
  });

  it("normaliza espaços no início/fim", () => {
    expect(parseModuleContextParam("  an  ")).toBe("atendimento_nutricional");
    expect(parseModuleContextParam("  aa  ")).toBe("assessoria_alimentacao");
  });

  it("normaliza para minúsculas", () => {
    expect(parseModuleContextParam("AN")).toBe("atendimento_nutricional");
    expect(parseModuleContextParam("AA")).toBe("assessoria_alimentacao");
    expect(parseModuleContextParam("ATENDIMENTO_NUTRICIONAL")).toBe(
      "atendimento_nutricional",
    );
  });
});

describe("parseModuleContextParam — valores inválidos retornam null", () => {
  it("retorna null para undefined", () => {
    expect(parseModuleContextParam(undefined)).toBeNull();
  });

  it("retorna null para string vazia", () => {
    expect(parseModuleContextParam("")).toBeNull();
  });

  it("retorna null para valor desconhecido", () => {
    expect(parseModuleContextParam("nutricao")).toBeNull();
    expect(parseModuleContextParam("modulo1")).toBeNull();
    expect(parseModuleContextParam("1")).toBeNull();
  });

  it("retorna null para array (Next.js multi-value param)", () => {
    expect(parseModuleContextParam(["an", "aa"])).toBeNull();
  });

  // Casos de segurança — tentativas de injeção
  it("bloqueia tentativa de SQL injection via param", () => {
    expect(parseModuleContextParam("'; DROP TABLE profiles; --")).toBeNull();
    expect(parseModuleContextParam("an OR 1=1")).toBeNull();
    expect(parseModuleContextParam("atendimento_nutricional; --")).toBeNull();
  });

  it("bloqueia injeção via caracteres especiais", () => {
    expect(parseModuleContextParam("<script>alert(1)</script>")).toBeNull();
    expect(parseModuleContextParam("../../../etc/passwd")).toBeNull();
    expect(parseModuleContextParam("\0atendimento_nutricional")).toBeNull();
  });

  it("bloqueia valores parcialmente corretos", () => {
    expect(parseModuleContextParam("atendimento")).toBeNull();
    expect(parseModuleContextParam("assessoria")).toBeNull();
    expect(parseModuleContextParam("nutricional")).toBeNull();
    expect(parseModuleContextParam("alimentacao")).toBeNull();
  });

  it("bloqueia concatenação de valores válidos", () => {
    expect(parseModuleContextParam("an aa")).toBeNull();
    expect(
      parseModuleContextParam("atendimento_nutricional,assessoria_alimentacao"),
    ).toBeNull();
  });
});

// ── moduleContextToParam ────────────────────────────────────────────────────

describe("moduleContextToParam", () => {
  it("atendimento_nutricional → 'an'", () => {
    expect(moduleContextToParam("atendimento_nutricional")).toBe("an");
  });

  it("assessoria_alimentacao → 'aa'", () => {
    expect(moduleContextToParam("assessoria_alimentacao")).toBe("aa");
  });
});

// ── isValidModuleContextParam ───────────────────────────────────────────────

describe("isValidModuleContextParam", () => {
  it("true para aliases válidos", () => {
    expect(isValidModuleContextParam("an")).toBe(true);
    expect(isValidModuleContextParam("aa")).toBe(true);
    expect(isValidModuleContextParam("atendimento_nutricional")).toBe(true);
    expect(isValidModuleContextParam("assessoria_alimentacao")).toBe(true);
  });

  it("false para valores inválidos", () => {
    expect(isValidModuleContextParam(undefined)).toBe(false);
    expect(isValidModuleContextParam("")).toBe(false);
    expect(isValidModuleContextParam("invalid")).toBe(false);
    expect(isValidModuleContextParam("'; DROP TABLE profiles; --")).toBe(false);
  });

  it("false para arrays", () => {
    expect(isValidModuleContextParam(["an"])).toBe(false);
  });
});

// ── Propriedade: round-trip ─────────────────────────────────────────────────

describe("round-trip: moduleContextToParam → parseModuleContextParam", () => {
  it("atendimento_nutricional sobrevive ao round-trip", () => {
    const ctx = "atendimento_nutricional" as const;
    expect(parseModuleContextParam(moduleContextToParam(ctx))).toBe(ctx);
  });

  it("assessoria_alimentacao sobrevive ao round-trip", () => {
    const ctx = "assessoria_alimentacao" as const;
    expect(parseModuleContextParam(moduleContextToParam(ctx))).toBe(ctx);
  });
});
