import {
  TENANT_FEATURE_KEYS,
  TENANT_FEATURE_LABELS,
  getPlanFeatureDefaults,
  tenantFeatureOverrideFieldName,
  type TenantFeatureKey,
} from "@/lib/constants/tenant-features";
import {
  parseTenantDocument,
  tenantDocumentLabel,
} from "@/lib/tenant/tenant-document";
import {
  ENABLED_MODULE_KEYS,
  ENABLED_MODULE_LABELS,
  type EnabledModuleKey,
} from "@/lib/types/modules";

export type CreateTenantPlanSummaryInput = {
  slug: string;
  name: string;
  price_monthly_cents: number;
  feature_portal_externo: boolean;
  feature_pdf_export: boolean;
  feature_csv_import: boolean;
  feature_api_access: boolean;
};

export type CreateTenantSummaryModule = {
  label: string;
  enabled: boolean;
};

export type CreateTenantSummaryFeature = {
  label: string;
  status: string;
};

export type CreateTenantSummaryLimits = {
  clients: string;
  patients: string;
  teamMembers: string;
};

export type CreateTenantSummary = {
  fullName: string;
  document: string;
  email: string;
  passwordMode: "defined" | "auto";
  modules: CreateTenantSummaryModule[];
  planName: string;
  planPrice: string;
  features: CreateTenantSummaryFeature[];
  limits: CreateTenantSummaryLimits;
  sendConfirmationEmail: boolean;
};

function formatPlanPrice(cents: number): string {
  if (cents <= 0) return "Gratuito";
  return `R$ ${(cents / 100).toFixed(0)}/mês`;
}

function readChecked(form: HTMLFormElement, name: string): boolean {
  return (
    form.querySelector<HTMLInputElement>(
      `input[name="${name}"][type="checkbox"]`,
    )?.checked === true
  );
}

function readNumber(form: HTMLFormElement, name: string): number {
  const raw = form.querySelector<HTMLInputElement>(
    `input[name="${name}"]`,
  )?.value;
  const n = Number(String(raw ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

/** Texto legível dos limites para o diálogo de confirmação. */
export function readLimitsSummary(
  form: HTMLFormElement,
): CreateTenantSummaryLimits {
  const clientsOn = readChecked(form, "clients_limit_enabled");
  const patientsOn = readChecked(form, "patients_limit_enabled");
  const teamOn = readChecked(form, "team_members_enabled");
  const teamUnlimited = readChecked(form, "team_members_unlimited");

  return {
    clients: clientsOn
      ? `Até ${readNumber(form, "clients_limit")} clientes`
      : "Sem limite de clientes",
    patients: patientsOn
      ? `Até ${readNumber(form, "patients_limit")} pacientes`
      : "Sem limite de pacientes",
    teamMembers: !teamOn
      ? "Cadastro de equipe desabilitado"
      : teamUnlimited
        ? "Equipe habilitada — assentos ilimitados"
        : `Equipe habilitada — ${readNumber(form, "team_members_limit")} assentos`,
  };
}

function readModuleEnabled(
  form: HTMLFormElement,
  key: EnabledModuleKey,
): boolean {
  return (
    form.querySelector<HTMLInputElement>(
      `input[name="module_${key}"][type="checkbox"]`,
    )?.checked === true
  );
}

function readFeatureOverride(
  form: HTMLFormElement,
  key: TenantFeatureKey,
): "default" | "true" | "false" {
  const raw =
    form.querySelector<HTMLInputElement>(
      `input[name="${tenantFeatureOverrideFieldName(key)}"]:checked`,
    )?.value ?? "default";

  if (raw === "true" || raw === "false") return raw;
  return "default";
}

export function buildCreateTenantSummary(
  form: HTMLFormElement,
  plans: CreateTenantPlanSummaryInput[],
): CreateTenantSummary | null {
  const fullName = (
    form.elements.namedItem("full_name") as HTMLInputElement | null
  )?.value.trim();
  const email = (
    form.elements.namedItem("email") as HTMLInputElement | null
  )?.value.trim();
  const password = (
    form.elements.namedItem("password") as HTMLInputElement | null
  )?.value.trim();

  if (!fullName || !email) return null;

  const planSlug = (
    form.elements.namedItem("plan_slug") as HTMLInputElement | null
  )?.value;
  const selectedPlan =
    plans.find((p) => p.slug === planSlug) ?? plans[0] ?? null;

  const planDefaults = getPlanFeatureDefaults(selectedPlan);

  const modules = ENABLED_MODULE_KEYS.map((key) => ({
    label: ENABLED_MODULE_LABELS[key],
    enabled: readModuleEnabled(form, key),
  }));

  const features = TENANT_FEATURE_KEYS.map((key) => {
    const override = readFeatureOverride(form, key);
    const planDefault = planDefaults[key];

    if (override === "true") {
      return { label: TENANT_FEATURE_LABELS[key], status: "Ativar (override)" };
    }
    if (override === "false") {
      return {
        label: TENANT_FEATURE_LABELS[key],
        status: "Desativar (override)",
      };
    }
    return {
      label: TENANT_FEATURE_LABELS[key],
      status: `Padrão do plano (${planDefault ? "ativo" : "inativo"})`,
    };
  });

  const sendConfirmationEmail =
    form.querySelector<HTMLInputElement>(
      'input[name="send_invite"][type="checkbox"]',
    )?.checked === true;

  const parsedDocument = parseTenantDocument(
    (form.elements.namedItem("document_kind") as HTMLSelectElement | null)?.value,
    (form.elements.namedItem("document_id") as HTMLInputElement | null)?.value,
    { required: false },
  );

  return {
    fullName,
    document: parsedDocument.ok
      ? tenantDocumentLabel(parsedDocument.value)
      : "Não informado",
    email,
    passwordMode: (password?.length ?? 0) >= 12 ? "defined" : "auto",
    modules,
    planName: selectedPlan?.name ?? planSlug ?? "—",
    planPrice: selectedPlan
      ? formatPlanPrice(selectedPlan.price_monthly_cents)
      : "—",
    features,
    limits: readLimitsSummary(form),
    sendConfirmationEmail,
  };
}
