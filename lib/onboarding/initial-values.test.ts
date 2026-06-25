import { describe, expect, it } from "vitest";

import {
  buildOnboardingInitialValues,
  defaultWorkContextFromEnabledModules,
  resolveInitialTenantCompanyName,
} from "@/lib/onboarding/initial-values";
import { DEFAULT_ENABLED_MODULES } from "@/lib/types/modules";

describe("resolveInitialTenantCompanyName", () => {
  it("prioriza tenant_name quando definido", () => {
    expect(
      resolveInitialTenantCompanyName({
        tenantName: "Clínica A",
        fullName: "Outro Nome",
        acquisitionSource: "admin_created",
      }),
    ).toBe("Clínica A");
  });

  it("usa full_name quando tenant foi criado pelo admin", () => {
    expect(
      resolveInitialTenantCompanyName({
        tenantName: null,
        fullName: "NutriVida LTDA",
        acquisitionSource: "admin_created",
      }),
    ).toBe("NutriVida LTDA");
  });

  it("não reutiliza full_name de cadastro próprio", () => {
    expect(
      resolveInitialTenantCompanyName({
        tenantName: null,
        fullName: "Maria Silva",
        acquisitionSource: null,
      }),
    ).toBe("");
  });
});

describe("defaultWorkContextFromEnabledModules", () => {
  it("retorna both quando os dois módulos de atividade estão ativos", () => {
    expect(defaultWorkContextFromEnabledModules(DEFAULT_ENABLED_MODULES)).toBe(
      "both",
    );
  });

  it("retorna clinical quando só atendimento nutricional", () => {
    expect(
      defaultWorkContextFromEnabledModules({
        ...DEFAULT_ENABLED_MODULES,
        assessoria_alimentacao: false,
      }),
    ).toBe("clinical");
  });

  it("retorna institutional quando só assessoria", () => {
    expect(
      defaultWorkContextFromEnabledModules({
        ...DEFAULT_ENABLED_MODULES,
        atendimento_nutricional: false,
      }),
    ).toBe("institutional");
  });
});

describe("buildOnboardingInitialValues", () => {
  it("monta valores iniciais completos", () => {
    expect(
      buildOnboardingInitialValues({
        tenantName: "Empresa X",
        fullName: "Ignorado",
        crn: " CRN-1 ",
        acquisitionSource: "admin_created",
        enabledModules: {
          ...DEFAULT_ENABLED_MODULES,
          atendimento_nutricional: true,
          assessoria_alimentacao: false,
        },
      }),
    ).toEqual({
      tenantCompanyName: "Empresa X",
      crn: "CRN-1",
      suggestedWorkContext: "clinical",
    });
  });
});
