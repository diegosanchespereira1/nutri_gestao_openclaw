export function formatPlanPriceCents(cents: number): string {
  if (cents <= 0) return "Gratuito";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatPlanLimit(value: number): string {
  return value < 0 ? "Ilimitado" : String(value);
}

export function signupStepperNextLabel(step: 1 | 2): string {
  return step === 1 ? "Avançar para Plano" : "Avançar para Pagamento";
}

export type PlanPriceDisplay = {
  /** Texto grande: "R$ 49,00" ou "Gratuito" / "Sob consulta" */
  headline: string;
  /** Sufixo ao lado do headline: "/mês" | "/ano" | "" */
  suffix: string;
  /** Linha auxiliar sob o preço */
  detail: string | null;
  /** Economia vs 12× mensal, quando anual */
  savingsLabel: string | null;
  /** Intervalo efetivo para checkout deste plano */
  effectiveInterval: "month" | "year";
};

/**
 * Preço exibido no card conforme o ciclo escolhido (toggle Mensal/Anual).
 * Padrão SaaS: no anual mostra o total/ano e o equivalente por mês.
 */
export function resolvePlanPriceDisplay(input: {
  interval: "month" | "year";
  checkoutKind: "free" | "stripe" | "sales";
  priceMonthlyCents: number;
  priceAnnualCents: number | null;
  annualAvailable: boolean;
}): PlanPriceDisplay {
  if (input.checkoutKind === "sales") {
    return {
      headline: "Sob consulta",
      suffix: "",
      detail: null,
      savingsLabel: null,
      effectiveInterval: "month",
    };
  }

  if (input.checkoutKind === "free" || input.priceMonthlyCents <= 0) {
    return {
      headline: "Gratuito",
      suffix: "",
      detail: "Sem cartão de crédito",
      savingsLabel: null,
      effectiveInterval: "month",
    };
  }

  const wantsYear = input.interval === "year";
  const hasAnnual =
    input.annualAvailable &&
    input.priceAnnualCents != null &&
    input.priceAnnualCents > 0;

  if (wantsYear) {
    const annual = hasAnnual
      ? (input.priceAnnualCents as number)
      : input.priceMonthlyCents * 10;
    const perMonth = Math.round(annual / 12);
    const fullYear = input.priceMonthlyCents * 12;
    const saved = fullYear - annual;
    const savingsLabel =
      saved > 0
        ? `Economize ${formatPlanPriceCents(saved)}/ano`
        : null;

    return {
      headline: formatPlanPriceCents(perMonth),
      suffix: "/mês",
      detail: hasAnnual
        ? `${formatPlanPriceCents(annual)} cobrados por ano`
        : `${formatPlanPriceCents(annual)}/ano · anual ainda não configurado no catálogo`,
      savingsLabel: hasAnnual ? savingsLabel : null,
      effectiveInterval: hasAnnual ? "year" : "month",
    };
  }

  return {
    headline: formatPlanPriceCents(input.priceMonthlyCents),
    suffix: "/mês",
    detail: null,
    savingsLabel: null,
    effectiveInterval: "month",
  };
}

/** Economia máxima entre planos pagos (para badge do toggle Anual). */
export function maxAnnualSavingsLabel(
  plans: Array<{
    checkoutKind: "free" | "stripe" | "sales";
    priceMonthlyCents: number;
    priceAnnualCents: number | null;
  }>,
): string | null {
  let best = 0;
  for (const plan of plans) {
    if (plan.checkoutKind !== "stripe") continue;
    if (!plan.priceAnnualCents || plan.priceAnnualCents <= 0) continue;
    if (plan.priceMonthlyCents <= 0) continue;
    const saved = plan.priceMonthlyCents * 12 - plan.priceAnnualCents;
    if (saved > best) best = saved;
  }
  if (best <= 0) return null;
  return `Economize até ${formatPlanPriceCents(best)}`;
}
