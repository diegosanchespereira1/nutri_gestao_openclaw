import {
  TENANT_FEATURE_KEYS,
  TENANT_FEATURE_LABELS,
  getPlanFeatureDefaults,
  tenantFeatureOverrideFieldName,
  type TenantFeatureKey,
} from "@/lib/constants/tenant-features";
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

export type CreateTenantSummary = {
  fullName: string;
  email: string;
  passwordMode: "defined" | "auto";
  modules: CreateTenantSummaryModule[];
  planName: string;
  planPrice: string;
  features: CreateTenantSummaryFeature[];
  sendConfirmationEmail: boolean;
};

function formatPlanPrice(cents: number): string {
  if (cents <= 0) return "Gratuito";
  return `R$ ${(cents / 100).toFixed(0)}/mês`;
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

  return {
    fullName,
    email,
    passwordMode: password.length >= 12 ? "defined" : "auto",
    modules,
    planName: selectedPlan?.name ?? planSlug ?? "—",
    planPrice: selectedPlan
      ? formatPlanPrice(selectedPlan.price_monthly_cents)
      : "—",
    features,
    sendConfirmationEmail,
  };
}
