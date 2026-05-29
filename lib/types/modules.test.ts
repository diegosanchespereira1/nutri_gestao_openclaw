import { describe, expect, it } from "vitest";

import {
  DEFAULT_ENABLED_MODULES,
  enabledModulesList,
  hasAnyModuleEnabled,
  isModuleContext,
  parseEnabledModules,
} from "./modules";

// ── isModuleContext ─────────────────────────────────────────────────────────

describe("isModuleContext", () => {
  it("aceita valores válidos", () => {
    expect(isModuleContext("atendimento_nutricional")).toBe(true);
    expect(isModuleContext("assessoria_alimentacao")).toBe(true);
  });

  it("rejeita valores desconhecidos", () => {
    expect(isModuleContext("")).toBe(false);
    expect(isModuleContext("an")).toBe(false);
    expect(isModuleContext("aa")).toBe(false);
    expect(isModuleContext(null)).toBe(false);
    expect(isModuleContext(undefined)).toBe(false);
    expect(isModuleContext(42)).toBe(false);
    expect(isModuleContext("atendimento")).toBe(false);
    expect(isModuleContext("ATENDIMENTO_NUTRICIONAL")).toBe(false);
    // Tentativa de SQL injection via campo de módulo
    expect(isModuleContext("'; DROP TABLE profiles; --")).toBe(false);
    expect(isModuleContext("atendimento_nutricional OR 1=1")).toBe(false);
  });
});

// ── parseEnabledModules ─────────────────────────────────────────────────────

describe("parseEnabledModules", () => {
  it("retorna default quando input é null", () => {
    expect(parseEnabledModules(null)).toEqual(DEFAULT_ENABLED_MODULES);
  });

  it("retorna default quando input é undefined", () => {
    expect(parseEnabledModules(undefined)).toEqual(DEFAULT_ENABLED_MODULES);
  });

  it("retorna default quando input é string (não-objeto)", () => {
    expect(parseEnabledModules("atendimento_nutricional")).toEqual(DEFAULT_ENABLED_MODULES);
  });

  it("retorna default quando input é número", () => {
    expect(parseEnabledModules(42)).toEqual(DEFAULT_ENABLED_MODULES);
  });

  it("retorna default quando input é array vazio", () => {
    // Array é um objeto mas não tem as chaves corretas → ambos habilitados
    expect(parseEnabledModules([])).toEqual(DEFAULT_ENABLED_MODULES);
  });

  it("ambos habilitados quando ambos são true", () => {
    expect(
      parseEnabledModules({
        atendimento_nutricional: true,
        assessoria_alimentacao: true,
      }),
    ).toEqual({ atendimento_nutricional: true, assessoria_alimentacao: true });
  });

  it("desabilita assessoria quando false explícito", () => {
    expect(
      parseEnabledModules({
        atendimento_nutricional: true,
        assessoria_alimentacao: false,
      }),
    ).toEqual({ atendimento_nutricional: true, assessoria_alimentacao: false });
  });

  it("desabilita atendimento quando false explícito", () => {
    expect(
      parseEnabledModules({
        atendimento_nutricional: false,
        assessoria_alimentacao: true,
      }),
    ).toEqual({ atendimento_nutricional: false, assessoria_alimentacao: true });
  });

  it("ambos desabilitados", () => {
    expect(
      parseEnabledModules({
        atendimento_nutricional: false,
        assessoria_alimentacao: false,
      }),
    ).toEqual({ atendimento_nutricional: false, assessoria_alimentacao: false });
  });

  it("chaves ausentes contam como habilitadas (retrocompatibilidade)", () => {
    // Objeto sem as chaves → valor não é false → habilitado
    expect(parseEnabledModules({})).toEqual(DEFAULT_ENABLED_MODULES);
    expect(parseEnabledModules({ atendimento_nutricional: true })).toEqual(
      DEFAULT_ENABLED_MODULES,
    );
  });

  it("valores não-booleanos contam como habilitados (permissivo)", () => {
    // Qualquer valor que não seja false explícito → habilitado
    expect(
      parseEnabledModules({
        atendimento_nutricional: 1,
        assessoria_alimentacao: "yes",
      }),
    ).toEqual({ atendimento_nutricional: true, assessoria_alimentacao: true });
  });

  it("null em chave individual não desabilita (apenas false desabilita)", () => {
    expect(
      parseEnabledModules({
        atendimento_nutricional: null,
        assessoria_alimentacao: null,
      }),
    ).toEqual({ atendimento_nutricional: true, assessoria_alimentacao: true });
  });

  it("retorna cópia — não mutável com o default", () => {
    const result = parseEnabledModules(null);
    result.atendimento_nutricional = false;
    expect(DEFAULT_ENABLED_MODULES.atendimento_nutricional).toBe(true);
  });
});

// ── hasAnyModuleEnabled ─────────────────────────────────────────────────────

describe("hasAnyModuleEnabled", () => {
  it("true quando ambos habilitados", () => {
    expect(
      hasAnyModuleEnabled({ atendimento_nutricional: true, assessoria_alimentacao: true }),
    ).toBe(true);
  });

  it("true quando apenas um habilitado", () => {
    expect(
      hasAnyModuleEnabled({ atendimento_nutricional: true, assessoria_alimentacao: false }),
    ).toBe(true);
    expect(
      hasAnyModuleEnabled({ atendimento_nutricional: false, assessoria_alimentacao: true }),
    ).toBe(true);
  });

  it("false quando nenhum habilitado", () => {
    expect(
      hasAnyModuleEnabled({ atendimento_nutricional: false, assessoria_alimentacao: false }),
    ).toBe(false);
  });
});

// ── enabledModulesList ──────────────────────────────────────────────────────

describe("enabledModulesList", () => {
  it("retorna ambos quando ambos habilitados", () => {
    const result = enabledModulesList({
      atendimento_nutricional: true,
      assessoria_alimentacao: true,
    });
    expect(result).toContain("atendimento_nutricional");
    expect(result).toContain("assessoria_alimentacao");
    expect(result).toHaveLength(2);
  });

  it("retorna apenas AN quando AA desabilitado", () => {
    const result = enabledModulesList({
      atendimento_nutricional: true,
      assessoria_alimentacao: false,
    });
    expect(result).toEqual(["atendimento_nutricional"]);
  });

  it("retorna apenas AA quando AN desabilitado", () => {
    const result = enabledModulesList({
      atendimento_nutricional: false,
      assessoria_alimentacao: true,
    });
    expect(result).toEqual(["assessoria_alimentacao"]);
  });

  it("retorna array vazio quando nenhum habilitado", () => {
    const result = enabledModulesList({
      atendimento_nutricional: false,
      assessoria_alimentacao: false,
    });
    expect(result).toEqual([]);
  });
});
