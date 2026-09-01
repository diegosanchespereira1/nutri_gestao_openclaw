import { describe, expect, it } from "vitest";

import {
  buildOnboardingInitialValues,
  defaultWorkContextFromEnabledModules,
  resolveInitialTenantCompanyName,
  resolveTenantDocumentState,
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
        documentKind: "cnpj",
        documentId: "11222333000181",
        isAccountOwner: true,
      }),
    ).toEqual({
      tenantCompanyName: "Empresa X",
      crn: "CRN-1",
      suggestedWorkContext: "clinical",
      tenantDocumentKind: "cnpj",
      tenantDocument: "11.222.333/0001-81",
      tenantDocumentLocked: true,
      askTenantDocument: false,
    });
  });
});

describe("resolveTenantDocumentState", () => {
  it("titular sem documento: pede no passo 1", () => {
    expect(
      resolveTenantDocumentState({
        documentKind: null,
        documentId: null,
        isAccountOwner: true,
      }),
    ).toEqual({
      tenantDocumentKind: "",
      tenantDocument: "",
      tenantDocumentLocked: false,
      askTenantDocument: true,
    });
  });

  it("documento já registado: mostra mascarado e bloqueado", () => {
    expect(
      resolveTenantDocumentState({
        documentKind: "cnpj",
        documentId: "11222333000181",
        isAccountOwner: true,
      }),
    ).toEqual({
      tenantDocumentKind: "cnpj",
      tenantDocument: "11.222.333/0001-81",
      tenantDocumentLocked: true,
      askTenantDocument: false,
    });
  });

  it("membro de equipe nunca preenche", () => {
    const r = resolveTenantDocumentState({
      documentKind: null,
      documentId: null,
      isAccountOwner: false,
    });
    expect(r.askTenantDocument).toBe(false);
    expect(r.tenantDocumentLocked).toBe(false);
  });

  it("tipo inválido vindo do banco não vira lixo na UI", () => {
    const r = resolveTenantDocumentState({
      documentKind: "rg",
      documentId: "52998224725",
      isAccountOwner: true,
    });
    expect(r.tenantDocumentKind).toBe("");
    expect(r.tenantDocument).toBe("529.982.247-25");
    expect(r.tenantDocumentLocked).toBe(true);
  });
});
