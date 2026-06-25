export const TENANT_FEATURE_KEYS = [
  "feature_portal_externo",
  "feature_pdf_export",
  "feature_csv_import",
  "feature_api_access",
] as const;

export type TenantFeatureKey = (typeof TENANT_FEATURE_KEYS)[number];

export const TENANT_FEATURE_LABELS: Record<TenantFeatureKey, string> = {
  feature_portal_externo: "Portal externo para pacientes",
  feature_pdf_export: "Exportação de PDF de dossiês",
  feature_csv_import: "Importação de dados via CSV",
  feature_api_access: "Acesso à API / tokens",
};

export type TenantPlanFeatureDefaults = Record<TenantFeatureKey, boolean>;

export function isTenantFeatureKey(value: string): value is TenantFeatureKey {
  return (TENANT_FEATURE_KEYS as readonly string[]).includes(value);
}

export function tenantFeatureOverrideFieldName(key: TenantFeatureKey): string {
  return `feature_override_${key}`;
}

/** Overrides explícitos no formulário (`true` / `false`). `default` não gera registro. */
export function parseTenantFeatureOverridesFromForm(
  formData: FormData,
): Array<{ feature_key: TenantFeatureKey; enabled: boolean }> {
  const overrides: Array<{ feature_key: TenantFeatureKey; enabled: boolean }> =
    [];

  for (const key of TENANT_FEATURE_KEYS) {
    const raw = String(
      formData.get(tenantFeatureOverrideFieldName(key)) ?? "default",
    ).trim();
    if (raw === "true") {
      overrides.push({ feature_key: key, enabled: true });
    } else if (raw === "false") {
      overrides.push({ feature_key: key, enabled: false });
    }
  }

  return overrides;
}

export function getPlanFeatureDefaults(
  plan: TenantPlanFeatureDefaults | null | undefined,
): TenantPlanFeatureDefaults {
  return {
    feature_portal_externo: Boolean(plan?.feature_portal_externo),
    feature_pdf_export: Boolean(plan?.feature_pdf_export),
    feature_csv_import: Boolean(plan?.feature_csv_import),
    feature_api_access: Boolean(plan?.feature_api_access),
  };
}
