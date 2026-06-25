import {
  TENANT_FEATURE_KEYS,
  TENANT_FEATURE_LABELS,
  getPlanFeatureDefaults,
  type TenantFeatureKey,
  type TenantPlanFeatureDefaults,
} from "@/lib/constants/tenant-features";
import {
  ENABLED_MODULE_KEYS,
  ENABLED_MODULE_LABELS,
  parseEnabledModules,
  type EnabledModuleKey,
  type EnabledModules,
} from "@/lib/types/modules";

export type TenantCapabilityItem = {
  key: string;
  label: string;
  enabled: boolean;
  overridden?: boolean;
};

const MODULE_SHORT_LABELS: Record<EnabledModuleKey, string> = {
  atendimento_nutricional: "Nutrição",
  assessoria_alimentacao: "Assessoria",
  visitas: "Visitas",
  financeiro: "Financeiro",
};

const FEATURE_SHORT_LABELS: Record<TenantFeatureKey, string> = {
  feature_portal_externo: "Portal",
  feature_pdf_export: "PDF",
  feature_csv_import: "CSV",
  feature_api_access: "API",
};

export function listEnabledModules(
  rawModules: unknown,
): TenantCapabilityItem[] {
  const modules = parseEnabledModules(rawModules);

  return ENABLED_MODULE_KEYS.map((key) => ({
    key,
    label: MODULE_SHORT_LABELS[key],
    enabled: modules[key],
  })).filter((item) => item.enabled);
}

export function resolveEffectivePlanFeatures(
  planDefaults: TenantPlanFeatureDefaults,
  overridesByKey: Partial<Record<TenantFeatureKey, boolean>>,
): TenantCapabilityItem[] {
  return TENANT_FEATURE_KEYS.map((key) => {
    const hasOverride = overridesByKey[key] !== undefined;
    const enabled = hasOverride
      ? Boolean(overridesByKey[key])
      : planDefaults[key];

    return {
      key,
      label: FEATURE_SHORT_LABELS[key],
      enabled,
      overridden: hasOverride,
    };
  });
}

export function listEnabledPlanFeatures(items: TenantCapabilityItem[]): TenantCapabilityItem[] {
  return items.filter((item) => item.enabled);
}

export function buildTenantCapabilities(input: {
  enabledModulesRaw: unknown;
  planSlug: string;
  plansBySlug: Record<string, TenantPlanFeatureDefaults | undefined>;
  overridesByKey: Partial<Record<TenantFeatureKey, boolean>>;
}): {
  modules: TenantCapabilityItem[];
  features: TenantCapabilityItem[];
} {
  const planDefaults = getPlanFeatureDefaults(
    input.plansBySlug[input.planSlug],
  );
  const allFeatures = resolveEffectivePlanFeatures(
    planDefaults,
    input.overridesByKey,
  );

  return {
    modules: listEnabledModules(input.enabledModulesRaw),
    features: listEnabledPlanFeatures(allFeatures),
  };
}

export function tenantFeatureFullLabel(key: TenantFeatureKey): string {
  return TENANT_FEATURE_LABELS[key];
}

export function tenantModuleFullLabel(key: EnabledModuleKey): string {
  return ENABLED_MODULE_LABELS[key];
}
