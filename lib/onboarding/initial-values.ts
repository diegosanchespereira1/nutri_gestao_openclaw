import type { OnboardingWorkContext } from "@/lib/actions/onboarding";
import type { EnabledModules } from "@/lib/types/modules";

export type OnboardingInitialValues = {
  tenantCompanyName: string;
  crn: string;
  suggestedWorkContext: OnboardingWorkContext | null;
};

/** Nome da empresa/clínica para exibir no passo 1 do onboarding. */
export function resolveInitialTenantCompanyName(input: {
  tenantName: string | null | undefined;
  fullName: string | null | undefined;
  acquisitionSource: string | null | undefined;
}): string {
  const fromTenant = input.tenantName?.trim();
  if (fromTenant) return fromTenant;

  if (input.acquisitionSource === "admin_created") {
    return input.fullName?.trim() ?? "";
  }

  return "";
}

/** Sugere contexto de trabalho a partir dos módulos habilitados pelo admin. */
export function defaultWorkContextFromEnabledModules(
  modules: EnabledModules,
): OnboardingWorkContext | null {
  const clinical = modules.atendimento_nutricional;
  const institutional = modules.assessoria_alimentacao;

  if (clinical && institutional) return "both";
  if (institutional) return "institutional";
  if (clinical) return "clinical";
  return null;
}

export function buildOnboardingInitialValues(input: {
  tenantName: string | null | undefined;
  fullName: string | null | undefined;
  crn: string | null | undefined;
  acquisitionSource: string | null | undefined;
  enabledModules: EnabledModules;
}): OnboardingInitialValues {
  return {
    tenantCompanyName: resolveInitialTenantCompanyName({
      tenantName: input.tenantName,
      fullName: input.fullName,
      acquisitionSource: input.acquisitionSource,
    }),
    crn: input.crn?.trim() ?? "",
    suggestedWorkContext: defaultWorkContextFromEnabledModules(
      input.enabledModules,
    ),
  };
}
