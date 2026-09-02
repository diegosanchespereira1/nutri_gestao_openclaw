import { describe, expect, it } from "vitest";

import {
  formatPlanLimit,
  formatPlanPriceCents,
  maxAnnualSavingsLabel,
  resolvePlanPriceDisplay,
  signupStepperNextLabel,
} from "@/lib/signup/format-plan-price";
import { profileUpsertFromSignupIntent } from "@/lib/signup/profile-from-intent";
import { buildSignupAbandonmentEmailHtml } from "@/lib/signup/abandonment-email";
import type { SignupIntentRow } from "@/lib/signup/types";

describe("formatPlanPriceCents", () => {
  it("formata BRL e gratuito", () => {
    expect(formatPlanPriceCents(0)).toBe("Gratuito");
    expect(formatPlanPriceCents(4900)).toContain("49");
  });
});

describe("signupStepperNextLabel", () => {
  it("nomeia a próxima etapa", () => {
    expect(signupStepperNextLabel(1)).toBe("Avançar para Plano");
    expect(signupStepperNextLabel(2)).toBe("Avançar para Pagamento");
  });
});

describe("formatPlanLimit", () => {
  it("ilimitado para -1", () => {
    expect(formatPlanLimit(-1)).toBe("Ilimitado");
    expect(formatPlanLimit(15)).toBe("15");
  });
});

describe("resolvePlanPriceDisplay", () => {
  const paid = {
    checkoutKind: "stripe" as const,
    priceMonthlyCents: 4900,
    priceAnnualCents: 49000,
    annualAvailable: true,
  };

  it("mostra preço mensal", () => {
    const d = resolvePlanPriceDisplay({ ...paid, interval: "month" });
    expect(d.suffix).toBe("/mês");
    expect(d.headline).toContain("49");
    expect(d.effectiveInterval).toBe("month");
  });

  it("mostra anual com mensal em destaque e total anual menor", () => {
    const d = resolvePlanPriceDisplay({ ...paid, interval: "year" });
    expect(d.suffix).toBe("/mês");
    expect(d.headline).toContain("40"); // 49000/12 ≈ 40,83
    expect(d.detail).toMatch(/cobrados por ano/i);
    expect(d.detail).toContain("490");
    expect(d.savingsLabel).toMatch(/Economize/i);
    expect(d.effectiveInterval).toBe("year");
  });

  it("plano free ignora o toggle", () => {
    const d = resolvePlanPriceDisplay({
      interval: "year",
      checkoutKind: "free",
      priceMonthlyCents: 0,
      priceAnnualCents: null,
      annualAvailable: false,
    });
    expect(d.headline).toBe("Gratuito");
    expect(d.effectiveInterval).toBe("month");
  });
});

describe("maxAnnualSavingsLabel", () => {
  it("devolve a maior economia entre planos pagos", () => {
    const label = maxAnnualSavingsLabel([
      {
        checkoutKind: "stripe",
        priceMonthlyCents: 4900,
        priceAnnualCents: 49000,
      },
      {
        checkoutKind: "stripe",
        priceMonthlyCents: 9900,
        priceAnnualCents: 99000,
      },
      {
        checkoutKind: "free",
        priceMonthlyCents: 0,
        priceAnnualCents: null,
      },
    ]);
    expect(label).toMatch(/Economize até/);
  });
});

describe("profileUpsertFromSignupIntent", () => {
  it("grava documento e plano pago", () => {
    const row: SignupIntentRow = {
      id: "i1",
      status: "pago",
      person_kind: "pf",
      full_name: "Maria Silva",
      legal_name: null,
      responsible_name: null,
      email: "maria@example.com",
      phone: "(11) 98888-7777",
      document_kind: "cpf",
      document_id: "52998224725",
      password_cipher: null,
      plan_slug: "starter",
      billing_interval: "month",
      stripe_checkout_session_id: "cs_1",
      stripe_customer_id: null,
      checkout_expires_at: null,
      abandoned_at: null,
      notified_at: null,
      paid_at: null,
      created_user_id: null,
      confirmation_email_sent_at: null,
      last_error: null,
      created_at: "2026-09-02T12:00:00.000Z",
    };
    const patch = profileUpsertFromSignupIntent({
      intent: row,
      userId: "user-1",
      planSlug: "starter",
      billingInterval: "month",
      planExpiresAt: "2026-10-02T12:00:00.000Z",
      acquisitionSource: "public_paid",
    });
    expect(patch.document_id).toBe("52998224725");
    expect(patch.plan_slug).toBe("starter");
    expect(patch.acquisition_source).toBe("public_paid");
  });
});

describe("buildSignupAbandonmentEmailHtml", () => {
  it("inclui e-mail e plano", () => {
    const { subject, html } = buildSignupAbandonmentEmailHtml({
      adminUrl: "https://app.example/admin/cadastros",
      intent: {
        id: "i1",
        status: "abandonado",
        person_kind: "pf",
        full_name: "Maria Silva",
        legal_name: null,
        responsible_name: null,
        email: "maria@example.com",
        phone: "(11) 98888-7777",
        document_kind: "cpf",
        document_id: "52998224725",
        password_cipher: null,
        plan_slug: "pro",
        billing_interval: "year",
        stripe_checkout_session_id: "cs_1",
        stripe_customer_id: null,
        checkout_expires_at: null,
        abandoned_at: "2026-09-02T13:00:00.000Z",
        notified_at: null,
        paid_at: null,
        created_user_id: null,
        confirmation_email_sent_at: null,
        last_error: null,
        created_at: "2026-09-02T12:00:00.000Z",
      },
    });
    expect(subject).toContain("abandonado");
    expect(html).toContain("maria@example.com");
    expect(html).toContain("pro");
    expect(html).toContain("anual");
  });
});
