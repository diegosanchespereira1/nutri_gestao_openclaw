import { describe, expect, it } from "vitest";

import { DEFAULT_ENABLED_MODULES } from "@/lib/types/modules";
import {
  buildModuleBlockedInicioPath,
  getModuleGateForPath,
  isPathAllowedForEnabledModules,
} from "./module-path-access";

describe("isPathAllowedForEnabledModules", () => {
  it("permite rotas gerais quando visitas e financeiro estão desligados", () => {
    const modules = {
      ...DEFAULT_ENABLED_MODULES,
      visitas: false,
      financeiro: false,
    };
    expect(isPathAllowedForEnabledModules("/inicio", modules)).toBe(true);
    expect(isPathAllowedForEnabledModules("/clientes", modules)).toBe(true);
  });

  it("bloqueia visitas quando o módulo está desligado", () => {
    const modules = { ...DEFAULT_ENABLED_MODULES, visitas: false };
    expect(isPathAllowedForEnabledModules("/visitas", modules)).toBe(false);
    expect(isPathAllowedForEnabledModules("/visitas/nova", modules)).toBe(false);
  });

  it("bloqueia financeiro quando o módulo está desligado", () => {
    const modules = { ...DEFAULT_ENABLED_MODULES, financeiro: false };
    expect(isPathAllowedForEnabledModules("/financeiro", modules)).toBe(false);
  });

  it("bloqueia pacientes quando atendimento nutricional está desligado", () => {
    const modules = {
      ...DEFAULT_ENABLED_MODULES,
      atendimento_nutricional: false,
    };
    expect(isPathAllowedForEnabledModules("/pacientes", modules)).toBe(false);
  });

  it("bloqueia checklists quando assessoria está desligada", () => {
    const modules = {
      ...DEFAULT_ENABLED_MODULES,
      assessoria_alimentacao: false,
    };
    expect(isPathAllowedForEnabledModules("/checklists", modules)).toBe(false);
    expect(isPathAllowedForEnabledModules("/pops", modules)).toBe(false);
  });

  it("resolve gate por pathname", () => {
    expect(getModuleGateForPath("/financeiro")).toBe("financeiro");
    expect(getModuleGateForPath("/financeiro/operacoes")).toBe("financeiro");
    expect(getModuleGateForPath("/inicio")).toBeNull();
  });

  it("monta URL de bloqueio para o início", () => {
    expect(buildModuleBlockedInicioPath("financeiro")).toBe(
      "/inicio?modulo_bloqueado=financeiro",
    );
  });
});
