import { describe, expect, it } from "vitest";

import {
  DEFAULT_ENABLED_MODULES,
  enabledModulesList,
  enabledModuleFieldName,
  hasAnyModuleEnabled,
  isModuleContext,
  parseEnabledModules,
  parseEnabledModulesFromForm,
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
        visitas: true,
        financeiro: true,
      }),
    ).toEqual(DEFAULT_ENABLED_MODULES);
  });

  it("desabilita assessoria quando false explícito", () => {
    expect(
      parseEnabledModules({
        atendimento_nutricional: true,
        assessoria_alimentacao: false,
        visitas: true,
        financeiro: true,
      }),
    ).toEqual({
      atendimento_nutricional: true,
      assessoria_alimentacao: false,
      visitas: true,
      financeiro: true,
    });
  });

  it("desabilita atendimento quando false explícito", () => {
    expect(
      parseEnabledModules({
        atendimento_nutricional: false,
        assessoria_alimentacao: true,
        visitas: true,
        financeiro: true,
      }),
    ).toEqual({
      atendimento_nutricional: false,
      assessoria_alimentacao: true,
      visitas: true,
      financeiro: true,
    });
  });

  it("ambos desabilitados", () => {
    expect(
      parseEnabledModules({
        atendimento_nutricional: false,
        assessoria_alimentacao: false,
        visitas: true,
        financeiro: true,
      }),
    ).toEqual({
      atendimento_nutricional: false,
      assessoria_alimentacao: false,
      visitas: true,
      financeiro: true,
    });
  });

  it("desabilita visitas e financeiro quando false explícito", () => {
    expect(
      parseEnabledModules({
        atendimento_nutricional: true,
        assessoria_alimentacao: true,
        visitas: false,
        financeiro: false,
      }),
    ).toEqual({
      atendimento_nutricional: true,
      assessoria_alimentacao: true,
      visitas: false,
      financeiro: false,
    });
  });

  it("chaves ausentes contam como habilitadas (retrocompatibilidade)", () => {
    // Objeto sem as chaves → valor não é false → habilitado
    expect(parseEnabledModules({})).toEqual(DEFAULT_ENABLED_MODULES);
    expect(parseEnabledModules({ atendimento_nutricional: true })).toEqual(
      DEFAULT_ENABLED_MODULES,
    );
  });

  it("valores não-booleanos contam como habilitados (permissivo)", () => {
    expect(
      parseEnabledModules({
        atendimento_nutricional: 1,
        assessoria_alimentacao: "yes",
        visitas: 0,
        financeiro: "",
      }),
    ).toEqual(DEFAULT_ENABLED_MODULES);
  });

  it("null em chave individual não desabilita (apenas false desabilita)", () => {
    expect(
      parseEnabledModules({
        atendimento_nutricional: null,
        assessoria_alimentacao: null,
        visitas: null,
        financeiro: null,
      }),
    ).toEqual(DEFAULT_ENABLED_MODULES);
  });

  it("retorna cópia — não mutável com o default", () => {
    const result = parseEnabledModules(null);
    result.atendimento_nutricional = false;
    expect(DEFAULT_ENABLED_MODULES.atendimento_nutricional).toBe(true);
  });
});

// ── hasAnyModuleEnabled ─────────────────────────────────────────────────────

describe("hasAnyModuleEnabled", () => {
  const allOn = DEFAULT_ENABLED_MODULES;
  const onlyAn = {
    ...DEFAULT_ENABLED_MODULES,
    assessoria_alimentacao: false,
  };
  const onlyAa = {
    ...DEFAULT_ENABLED_MODULES,
    atendimento_nutricional: false,
  };
  const none = {
    ...DEFAULT_ENABLED_MODULES,
    atendimento_nutricional: false,
    assessoria_alimentacao: false,
  };

  it("true quando ambos habilitados", () => {
    expect(hasAnyModuleEnabled(allOn)).toBe(true);
  });

  it("true quando apenas um habilitado", () => {
    expect(hasAnyModuleEnabled(onlyAn)).toBe(true);
    expect(hasAnyModuleEnabled(onlyAa)).toBe(true);
  });

  it("false quando nenhum habilitado", () => {
    expect(hasAnyModuleEnabled(none)).toBe(false);
  });
});

// ── enabledModulesList ──────────────────────────────────────────────────────

describe("enabledModulesList", () => {
  it("retorna ambos quando ambos habilitados", () => {
    const result = enabledModulesList(DEFAULT_ENABLED_MODULES);
    expect(result).toContain("atendimento_nutricional");
    expect(result).toContain("assessoria_alimentacao");
    expect(result).toHaveLength(2);
  });

  it("retorna apenas AN quando AA desabilitado", () => {
    const result = enabledModulesList({
      ...DEFAULT_ENABLED_MODULES,
      assessoria_alimentacao: false,
    });
    expect(result).toEqual(["atendimento_nutricional"]);
  });

  it("retorna apenas AA quando AN desabilitado", () => {
    const result = enabledModulesList({
      ...DEFAULT_ENABLED_MODULES,
      atendimento_nutricional: false,
    });
    expect(result).toEqual(["assessoria_alimentacao"]);
  });

  it("retorna array vazio quando nenhum habilitado", () => {
    const result = enabledModulesList({
      ...DEFAULT_ENABLED_MODULES,
      atendimento_nutricional: false,
      assessoria_alimentacao: false,
    });
    expect(result).toEqual([]);
  });
});

describe("parseEnabledModulesFromForm", () => {
  it("lê checkboxes marcados como true", () => {
    const formData = new FormData();
    for (const key of [
      "atendimento_nutricional",
      "assessoria_alimentacao",
      "visitas",
      "financeiro",
    ] as const) {
      formData.set(enabledModuleFieldName(key), "true");
    }
    expect(parseEnabledModulesFromForm(formData)).toEqual(DEFAULT_ENABLED_MODULES);
  });

  it("lê módulos desmarcados como false", () => {
    const formData = new FormData();
    formData.set(enabledModuleFieldName("atendimento_nutricional"), "false");
    formData.set(enabledModuleFieldName("assessoria_alimentacao"), "true");
    formData.set(enabledModuleFieldName("visitas"), "false");
    formData.set(enabledModuleFieldName("financeiro"), "true");

    expect(parseEnabledModulesFromForm(formData)).toEqual({
      atendimento_nutricional: false,
      assessoria_alimentacao: true,
      visitas: false,
      financeiro: true,
    });
  });

  it("lê checkbox marcado quando hidden=false precede no FormData", () => {
    const formData = new FormData();
    formData.append(enabledModuleFieldName("atendimento_nutricional"), "false");
    formData.append(enabledModuleFieldName("atendimento_nutricional"), "true");
    formData.append(enabledModuleFieldName("assessoria_alimentacao"), "false");
    formData.append(enabledModuleFieldName("visitas"), "false");
    formData.append(enabledModuleFieldName("visitas"), "true");
    formData.append(enabledModuleFieldName("financeiro"), "false");

    expect(parseEnabledModulesFromForm(formData)).toEqual({
      atendimento_nutricional: true,
      assessoria_alimentacao: false,
      visitas: true,
      financeiro: false,
    });
  });
});
