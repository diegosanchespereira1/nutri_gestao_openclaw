"use client";

import { useMemo, useState } from "react";
import { CreditCard, Sparkles } from "lucide-react";

import { AdminFormSectionCard } from "@/components/admin/admin-form-section-card";
import { Badge } from "@/components/ui/badge";
import {
  TENANT_FEATURE_KEYS,
  TENANT_FEATURE_LABELS,
  getPlanFeatureDefaults,
  tenantFeatureOverrideFieldName,
  type TenantFeatureKey,
} from "@/lib/constants/tenant-features";
import { cn } from "@/lib/utils";

export type CreateTenantPlanOption = {
  slug: string;
  name: string;
  price_monthly_cents: number;
  feature_portal_externo: boolean;
  feature_pdf_export: boolean;
  feature_csv_import: boolean;
  feature_api_access: boolean;
};

type Props = {
  plans: CreateTenantPlanOption[];
  defaultPlanSlug?: string;
};

function formatPlanPrice(cents: number): string {
  if (cents <= 0) return "Gratuito";
  return `R$ ${(cents / 100).toFixed(0)}/mês`;
}

export function CreateTenantSubscriptionSection({
  plans,
  defaultPlanSlug = "free",
}: Props) {
  if (plans.length === 0) {
    return (
      <AdminFormSectionCard
        title="Plano e features"
        description="Nenhum plano ativo está disponível no momento."
        icon={CreditCard}
      >
        <p className="text-muted-foreground text-sm">
          Configure pelo menos um plano em Admin → Planos antes de criar um
          tenant.
        </p>
      </AdminFormSectionCard>
    );
  }

  return (
    <CreateTenantSubscriptionSectionInner
      plans={plans}
      defaultPlanSlug={defaultPlanSlug}
    />
  );
}

function CreateTenantSubscriptionSectionInner({
  plans,
  defaultPlanSlug,
}: Required<Pick<Props, "plans">> & { defaultPlanSlug: string }) {
  const initialSlug =
    plans.find((p) => p.slug === defaultPlanSlug)?.slug ??
    plans[0]?.slug ??
    defaultPlanSlug;

  const [planSlug, setPlanSlug] = useState(initialSlug);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.slug === planSlug),
    [plans, planSlug],
  );

  const planDefaults = useMemo(
    () => getPlanFeatureDefaults(selectedPlan),
    [selectedPlan],
  );

  return (
    <AdminFormSectionCard
      title="Plano e features"
      description="Escolha o plano base e, se necessário, ajuste features que sobrescrevem o plano."
      icon={CreditCard}
      contentClassName="space-y-6"
    >
      <input type="hidden" name="plan_slug" value={planSlug} />

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Plano inicial
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {plans.map((plan) => {
            const selected = plan.slug === planSlug;
            return (
              <button
                key={plan.slug}
                type="button"
                onClick={() => setPlanSlug(plan.slug)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  "focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40",
                )}
                aria-pressed={selected}
              >
                <span className="text-foreground block font-medium">
                  {plan.name}
                </span>
                <span className="text-muted-foreground mt-1 block text-sm">
                  {formatPlanPrice(plan.price_monthly_cents)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-border space-y-3 border-t pt-6">
        <div className="flex items-start gap-2">
          <Sparkles className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Overrides de features</p>
            <p className="text-muted-foreground text-sm">
              Opcional. Cada ajuste tem precedência sobre o plano. Use
              &quot;Padrão&quot; para herdar o plano selecionado.
            </p>
          </div>
        </div>

        <div className="divide-border divide-y rounded-xl ring-1 ring-foreground/10">
          {TENANT_FEATURE_KEYS.map((key) => (
            <FeatureOverrideRow
              key={key}
              featureKey={key}
              planDefault={planDefaults[key]}
            />
          ))}
        </div>
      </div>
    </AdminFormSectionCard>
  );
}

function FeatureOverrideRow({
  featureKey,
  planDefault,
}: {
  featureKey: TenantFeatureKey;
  planDefault: boolean;
}) {
  const fieldName = tenantFeatureOverrideFieldName(featureKey);

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <p className="text-sm font-medium">
          {TENANT_FEATURE_LABELS[featureKey]}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">No plano:</span>
          <Badge
            variant="outline"
            className={cn(
              planDefault &&
                "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
            )}
          >
            {planDefault ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </div>

      <SegmentedOverride
        name={fieldName}
        ariaLabel={TENANT_FEATURE_LABELS[featureKey]}
      />
    </div>
  );
}

function SegmentedOverride({
  name,
  ariaLabel,
}: {
  name: string;
  ariaLabel: string;
}) {
  const options = [
    { value: "default", label: "Padrão" },
    { value: "true", label: "Ativar" },
    { value: "false", label: "Desativar" },
  ] as const;

  return (
    <div
      className="bg-muted/50 inline-flex rounded-lg p-1 ring-1 ring-foreground/10"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt, index) => {
        const id = `${name}-${opt.value}`;
        return (
          <label
            key={opt.value}
            htmlFor={id}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              "text-muted-foreground hover:text-foreground",
              "has-[:checked]:bg-background has-[:checked]:text-foreground has-[:checked]:shadow-sm",
            )}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={opt.value}
              defaultChecked={index === 0}
              className="sr-only"
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}
