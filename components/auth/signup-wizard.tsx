"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SignupLeadStep } from "@/components/auth/signup-lead-form";
import { SignupPlanStep } from "@/components/auth/signup-plan-step";
import { SignupStepper } from "@/components/auth/signup-stepper";
import {
  checkSignupLeadAvailabilityAction,
  completeFreeSignupAction,
  listPublicSignupPlansAction,
  startPaidCheckoutAction,
} from "@/lib/actions/signup";
import { parseSignupLead } from "@/lib/signup/parse-signup-lead";
import { resolvePlanPriceDisplay } from "@/lib/signup/format-plan-price";
import type {
  PublicSignupPlan,
  SignupBillingInterval,
  SignupLeadInput,
} from "@/lib/signup/types";

const EMPTY_LEAD: SignupLeadInput = {
  personKind: "pf",
  fullName: "",
  legalName: "",
  responsibleName: "",
  email: "",
  phone: "",
  document: "",
  password: "",
  confirmPassword: "",
};

export function SignupWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [lead, setLead] = useState<SignupLeadInput>(EMPTY_LEAD);
  const [plans, setPlans] = useState<PublicSignupPlan[]>([]);
  const [planSlug, setPlanSlug] = useState<string | null>(null);
  const [interval, setInterval] = useState<SignupBillingInterval>("month");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<"free" | "paid" | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listPublicSignupPlansAction().then((result) => {
      if (cancelled) return;
      setPlans(result.plans);
      if (result.error) setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = plans.find((p) => p.slug === planSlug) ?? null;

  /**
   * E-mail e CPF/CNPJ são conferidos aqui, na saída do passo 1.
   *
   * A mesma checagem existe antes do Checkout e dentro do webhook, mas descobrir o
   * conflito lá obriga o utilizador a voltar dois passos com o formulário já
   * fechado. Se a consulta falhar, o passo segue: as camadas seguintes ainda
   * barram, e travar o cadastro por uma indisponibilidade seria pior.
   */
  async function handleLeadContinue() {
    setError(null);
    setLoading(true);
    try {
      const result = await checkSignupLeadAvailabilityAction(lead);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep(2);
    } catch {
      setStep(2);
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanContinue() {
    if (!selected) return;
    setError(null);

    if (selected.checkoutKind === "free") {
      setLoading(true);
      const result = await completeFreeSignupAction({
        lead,
        planSlug: selected.slug,
      });
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone("free");
      return;
    }

    if (selected.checkoutKind === "stripe") {
      setStep(3);
    }
  }

  async function handleStartPayment() {
    if (!selected) return;
    const parsed = parseSignupLead(lead);
    if (!parsed.ok) {
      setError("Revise os dados do cadastro.");
      setStep(1);
      return;
    }
    const price = resolvePlanPriceDisplay({
      interval,
      checkoutKind: selected.checkoutKind,
      priceMonthlyCents: selected.priceMonthlyCents,
      priceAnnualCents: selected.priceAnnualCents,
      annualAvailable: selected.annualAvailable,
    });
    setLoading(true);
    setError(null);
    const result = await startPaidCheckoutAction({
      lead,
      planSlug: selected.slug,
      billingInterval: price.effectiveInterval,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if ("checkoutUrl" in result) {
      window.location.assign(result.checkoutUrl);
    }
  }

  if (done === "free") {
    return (
      <p
        className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-200"
        role="status"
      >
        Conta criada. Enviamos um e-mail para confirmação. Você só entra depois
        de clicar no link.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <SignupStepper current={step} />

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <SignupLeadStep
          value={lead}
          onChange={setLead}
          busy={loading}
          onContinue={() => void handleLeadContinue()}
        />
      ) : null}

      {step === 2 ? (
        <SignupPlanStep
          plans={plans}
          selectedSlug={planSlug}
          interval={interval}
          onSelect={setPlanSlug}
          onIntervalChange={setInterval}
          onBack={() => setStep(1)}
          onContinue={() => void handlePlanContinue()}
          busy={loading}
        />
      ) : null}

      {step === 3 && selected ? (
        <div className="space-y-4">
          {(() => {
            const price = resolvePlanPriceDisplay({
              interval,
              checkoutKind: selected.checkoutKind,
              priceMonthlyCents: selected.priceMonthlyCents,
              priceAnnualCents: selected.priceAnnualCents,
              annualAvailable: selected.annualAvailable,
            });
            return (
              <p className="text-sm">
                Você será redirecionado ao Stripe para assinar{" "}
                <strong>{selected.name}</strong> (
                {price.headline}
                {price.suffix}
                {price.detail ? ` · ${price.detail}` : ""}
                ). A conta e o e-mail de confirmação só são criados depois do
                pagamento.
              </p>
            );
          })()}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep(2)}
              disabled={loading}
            >
              Voltar
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => void handleStartPayment()}
              disabled={loading}
            >
              {loading ? "Abrindo pagamento…" : "Ir para pagamento"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
