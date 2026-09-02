"use client";

import { Button } from "@/components/ui/button";
import {
  formatPlanLimit,
  maxAnnualSavingsLabel,
  resolvePlanPriceDisplay,
  signupStepperNextLabel,
} from "@/lib/signup/format-plan-price";
import {
  buildWhatsAppWebUrl,
  ENTERPRISE_WHATSAPP_DEFAULT_MESSAGE,
} from "@/lib/signup/whatsapp";
import type {
  PublicSignupPlan,
  SignupBillingInterval,
} from "@/lib/signup/types";
import { cn } from "@/lib/utils";

type Props = {
  plans: PublicSignupPlan[];
  selectedSlug: string | null;
  interval: SignupBillingInterval;
  onSelect: (slug: string) => void;
  onIntervalChange: (interval: SignupBillingInterval) => void;
  onBack: () => void;
  onContinue: () => void;
  busy?: boolean;
};

export function SignupPlanStep({
  plans,
  selectedSlug,
  interval,
  onSelect,
  onIntervalChange,
  onBack,
  onContinue,
  busy = false,
}: Props) {
  const selected = plans.find((p) => p.slug === selectedSlug) ?? null;
  const savingsHint = maxAnnualSavingsLabel(plans);
  const isEnterprise = selected?.checkoutKind === "sales";
  const whatsappUrl =
    isEnterprise && selected?.salesWhatsapp
      ? buildWhatsAppWebUrl({
          phoneDigits: selected.salesWhatsapp,
          message: ENTERPRISE_WHATSAPP_DEFAULT_MESSAGE,
        })
      : null;

  function handlePrimaryAction() {
    if (isEnterprise) {
      if (!whatsappUrl) return;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      return;
    }
    onContinue();
  }

  const primaryDisabled =
    !selected ||
    busy ||
    (isEnterprise && !whatsappUrl);

  const primaryLabel = busy
    ? "Criando conta…"
    : selected?.checkoutKind === "free"
      ? "Criar conta gratuita"
      : isEnterprise
        ? whatsappUrl
          ? "Entrar em contato"
          : "WhatsApp não configurado"
        : signupStepperNextLabel(2);

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-2">
        <div
          className="bg-muted inline-flex rounded-full p-1"
          role="group"
          aria-label="Ciclo de cobrança"
        >
          <button
            type="button"
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              interval === "month"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={interval === "month"}
            onClick={() => onIntervalChange("month")}
          >
            Mensal
          </button>
          <button
            type="button"
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              interval === "year"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={interval === "year"}
            onClick={() => onIntervalChange("year")}
          >
            Anual
          </button>
        </div>
        {savingsHint ? (
          <p className="text-primary text-xs font-medium">{savingsHint} no plano anual</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            Compare o valor mensal e o anual em todos os planos
          </p>
        )}
      </div>

      <div className="space-y-3">
        {plans.map((plan) => {
          const selectedPlan = plan.slug === selectedSlug;
          const price = resolvePlanPriceDisplay({
            interval,
            checkoutKind: plan.checkoutKind,
            priceMonthlyCents: plan.priceMonthlyCents,
            priceAnnualCents: plan.priceAnnualCents,
            annualAvailable: plan.annualAvailable,
          });

          return (
            <button
              key={plan.slug}
              type="button"
              onClick={() => onSelect(plan.slug)}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors",
                selectedPlan
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-muted/40",
              )}
              aria-pressed={selectedPlan}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-foreground text-base font-semibold">
                      {plan.name}
                    </span>
                    {price.savingsLabel ? (
                      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-medium">
                        {price.savingsLabel}
                      </span>
                    ) : null}
                  </div>
                  {plan.description ? (
                    <p className="text-muted-foreground text-sm">
                      {plan.description}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground text-xs">
                    Até {formatPlanLimit(plan.maxClients)} clientes ·{" "}
                    {formatPlanLimit(plan.maxPatients)} pacientes ·{" "}
                    {formatPlanLimit(plan.maxTeamMembers)} na equipe
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-primary text-lg font-semibold leading-tight">
                    {price.headline}
                    {price.suffix ? (
                      <span className="text-muted-foreground text-xs font-normal">
                        {price.suffix}
                      </span>
                    ) : null}
                  </p>
                  {price.detail ? (
                    <p className="text-muted-foreground mt-0.5 max-w-[11rem] text-[11px] leading-snug">
                      {price.detail}
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {isEnterprise ? (
        <p className="text-muted-foreground text-sm">
          {whatsappUrl
            ? "Plano sob consulta. O botão abre o WhatsApp Web para falar com o comercial."
            : "Plano sob consulta. Configure o WhatsApp em Admin → Planos (Enterprise)."}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onBack}
          disabled={busy}
        >
          Voltar
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={primaryDisabled}
          onClick={handlePrimaryAction}
        >
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}
