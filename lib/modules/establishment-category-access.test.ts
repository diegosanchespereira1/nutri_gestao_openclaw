import { describe, expect, it } from "vitest";

import {
  establishmentCategoryDisabledMessage,
  establishmentCategorySelectLabel,
  isEstablishmentCategoryEnabled,
  isEstablishmentTypeAllowedForModules,
} from "./establishment-category-access";
import { DEFAULT_ENABLED_MODULES } from "@/lib/types/modules";

describe("establishment-category-access", () => {
  const onlyAssessoria = {
    ...DEFAULT_ENABLED_MODULES,
    atendimento_nutricional: false,
    assessoria_alimentacao: true,
  };

  const onlyAtendimento = {
    ...DEFAULT_ENABLED_MODULES,
    atendimento_nutricional: true,
    assessoria_alimentacao: false,
  };

  it("bloqueia categoria atendimento quando módulo desligado", () => {
    expect(
      isEstablishmentCategoryEnabled("atendimento_nutricional", onlyAssessoria),
    ).toBe(false);
    expect(
      establishmentCategorySelectLabel("atendimento_nutricional", onlyAssessoria),
    ).toBe("Atendimento Nutricional — Não habilitado");
    expect(
      establishmentCategoryDisabledMessage("atendimento_nutricional"),
    ).toBe(
      "A categoria Atendimento Nutricional não está habilitada na sua conta.",
    );
  });

  it("bloqueia categoria assessoria quando módulo desligado", () => {
    expect(
      isEstablishmentCategoryEnabled("assessoria_alimentacao", onlyAtendimento),
    ).toBe(false);
    expect(
      establishmentCategorySelectLabel("assessoria_alimentacao", onlyAtendimento),
    ).toBe("Assessoria em Serviços de Alimentação — Não habilitado");
    expect(
      establishmentCategoryDisabledMessage("assessoria_alimentacao"),
    ).toBe(
      "A categoria Assessoria em Serviços de Alimentação não está habilitada na sua conta.",
    );
  });

  it("permite tipo de assessoria quando módulo ativo", () => {
    expect(
      isEstablishmentTypeAllowedForModules("restaurante", onlyAssessoria),
    ).toBe(true);
    expect(
      isEstablishmentTypeAllowedForModules("clinica", onlyAssessoria),
    ).toBe(false);
  });

  it("permite tipo de atendimento quando módulo ativo", () => {
    expect(
      isEstablishmentTypeAllowedForModules("clinica", onlyAtendimento),
    ).toBe(true);
    expect(
      isEstablishmentTypeAllowedForModules("restaurante", onlyAtendimento),
    ).toBe(false);
  });
});
