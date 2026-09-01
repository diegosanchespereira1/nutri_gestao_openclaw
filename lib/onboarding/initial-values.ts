import type { OnboardingWorkContext } from "@/lib/actions/onboarding";
import { maskBrDocumentInput } from "@/lib/format/br-document";
import type { TenantDocumentKind } from "@/lib/tenant/tenant-document";
import type { EnabledModules } from "@/lib/types/modules";

export type OnboardingInitialValues = {
  tenantCompanyName: string;
  crn: string;
  suggestedWorkContext: OnboardingWorkContext | null;
  /** Documento fiscal da conta (CPF/CNPJ do tenant). */
  tenantDocumentKind: TenantDocumentKind | "";
  /** Já mascarado para exibição. */
  tenantDocument: string;
  /** Já registado: o passo 1 apenas mostra para conferência. */
  tenantDocumentLocked: boolean;
  /** Titular ainda sem documento — é aqui que os tenants antigos preenchem. */
  askTenantDocument: boolean;
};

/**
 * Como o passo 1 trata o documento da conta.
 *
 * Membro de equipe nunca preenche: quem tem documento fiscal é a conta, e o
 * trigger `profiles_document_owner_only` recusaria a gravação.
 */
export function resolveTenantDocumentState(input: {
  documentKind: string | null | undefined;
  documentId: string | null | undefined;
  isAccountOwner: boolean;
}): {
  tenantDocumentKind: TenantDocumentKind | "";
  tenantDocument: string;
  tenantDocumentLocked: boolean;
  askTenantDocument: boolean;
} {
  const kind =
    input.documentKind === "cpf" || input.documentKind === "cnpj"
      ? input.documentKind
      : "";
  const digits = (input.documentId ?? "").replace(/\D/g, "");
  const hasDocument = digits.length > 0;

  return {
    tenantDocumentKind: kind,
    tenantDocument: hasDocument ? maskBrDocumentInput(kind || null, digits) : "",
    tenantDocumentLocked: hasDocument,
    askTenantDocument: input.isAccountOwner && !hasDocument,
  };
}

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
  documentKind?: string | null;
  documentId?: string | null;
  isAccountOwner?: boolean;
}): OnboardingInitialValues {
  return {
    ...resolveTenantDocumentState({
      documentKind: input.documentKind,
      documentId: input.documentId,
      isAccountOwner: input.isAccountOwner ?? true,
    }),
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
