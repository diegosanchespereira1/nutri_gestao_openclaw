import { describe, expect, it, vi } from "vitest";

import {
  processStripeWebhookEvent,
  readSubscriptionPeriodEndUnix,
} from "@/lib/signup/process-stripe-event";
import type {
  SignupWebhookDeps,
  StripeWebhookEventLike,
} from "@/lib/signup/process-stripe-event";
import type { SignupIntentRow } from "@/lib/signup/types";

function intent(partial: Partial<SignupIntentRow> = {}): SignupIntentRow {
  return {
    id: "intent-1",
    status: "checkout",
    person_kind: "pf",
    full_name: "Maria Silva",
    legal_name: null,
    responsible_name: null,
    email: "maria@example.com",
    phone: "(11) 98888-7777",
    document_kind: "cpf",
    document_id: "52998224725",
    password_cipher: "v1:x",
    plan_slug: "starter",
    billing_interval: "month",
    stripe_checkout_session_id: "cs_test_1",
    stripe_customer_id: null,
    checkout_expires_at: null,
    abandoned_at: null,
    notified_at: null,
    paid_at: null,
    created_user_id: null,
    confirmation_email_sent_at: null,
    last_error: null,
    created_at: "2026-09-02T12:00:00.000Z",
    ...partial,
  };
}

function deps(overrides: Partial<SignupWebhookDeps> = {}): SignupWebhookDeps {
  return {
    hasProcessedEvent: vi.fn(async () => false),
    recordEvent: vi.fn(async () => undefined),
    findIntentByCheckoutSessionId: vi.fn(async () => intent()),
    markAbandonedAndNotify: vi.fn(async () => undefined),
    completePaidSignup: vi.fn(async () => undefined),
    syncSubscription: vi.fn(async () => undefined),
    ...overrides,
  };
}

function event(
  type: string,
  object: Record<string, unknown> = { id: "cs_test_1" },
): StripeWebhookEventLike {
  return {
    id: "evt_1",
    type,
    data: { object: object as StripeWebhookEventLike["data"]["object"] },
  };
}

describe("processStripeWebhookEvent", () => {
  it("é idempotente no mesmo evt_", async () => {
    const d = deps({ hasProcessedEvent: vi.fn(async () => true) });
    const result = await processStripeWebhookEvent(event("checkout.session.expired"), d);
    expect(result).toEqual({ ok: true, action: "duplicate" });
    expect(d.markAbandonedAndNotify).not.toHaveBeenCalled();
  });

  it("marca abandono quando a sessão de checkout expira", async () => {
    const d = deps();
    const result = await processStripeWebhookEvent(
      event("checkout.session.expired", { id: "cs_test_1" }),
      d,
    );
    expect(result).toEqual({ ok: true, action: "abandoned" });
    expect(d.markAbandonedAndNotify).toHaveBeenCalledOnce();
    expect(d.recordEvent).toHaveBeenCalledOnce();
  });

  it("não abandona sessão antiga depois de um novo checkout", async () => {
    const d = deps({
      findIntentByCheckoutSessionId: vi.fn(async () =>
        intent({ stripe_checkout_session_id: "cs_new" }),
      ),
    });
    const result = await processStripeWebhookEvent(
      event("checkout.session.expired", { id: "cs_old" }),
      d,
    );
    expect(result).toEqual({ ok: true, action: "ignored" });
    expect(d.markAbandonedAndNotify).not.toHaveBeenCalled();
  });

  it("cria conta após pagamento", async () => {
    const d = deps();
    const result = await processStripeWebhookEvent(
      event("checkout.session.completed", {
        id: "cs_test_1",
        payment_status: "paid",
        customer: "cus_1",
        subscription: "sub_1",
      }),
      d,
    );
    expect(result).toEqual({ ok: true, action: "paid" });
    expect(d.completePaidSignup).toHaveBeenCalledOnce();
  });

  it("não recria conta já convertida", async () => {
    const d = deps({
      findIntentByCheckoutSessionId: vi.fn(async () =>
        intent({ status: "conta_criada", created_user_id: "user-1" }),
      ),
    });
    const result = await processStripeWebhookEvent(
      event("checkout.session.completed", {
        id: "cs_test_1",
        payment_status: "paid",
      }),
      d,
    );
    expect(result).toEqual({ ok: true, action: "duplicate" });
    expect(d.completePaidSignup).not.toHaveBeenCalled();
  });
});
/**
 * Regressão: `current_period_end` saiu do root de Subscription e foi para SubscriptionItem
 * no stripe@20 (API 2025-03-31.basil). Como o payload do webhook usa a API version da conta,
 * as duas formas circulam ao mesmo tempo — e ler só o root deixava `plan_expires_at` nulo.
 */
describe("readSubscriptionPeriodEndUnix", () => {
  it("lê do item (forma nova do stripe@20)", () => {
    expect(
      readSubscriptionPeriodEndUnix({ items: { data: [{ current_period_end: 1800000000 }] } }),
    ).toBe(1800000000);
  });

  it("cai no root quando o payload vem na forma antiga", () => {
    expect(readSubscriptionPeriodEndUnix({ current_period_end: 1700000000 })).toBe(1700000000);
  });

  it("prefere o item quando as duas formas vêm juntas", () => {
    expect(
      readSubscriptionPeriodEndUnix({
        current_period_end: 1700000000,
        items: { data: [{ current_period_end: 1800000000 }] },
      }),
    ).toBe(1800000000);
  });

  it("devolve null sem nenhuma das formas", () => {
    expect(readSubscriptionPeriodEndUnix({})).toBeNull();
    expect(readSubscriptionPeriodEndUnix({ items: { data: [] } })).toBeNull();
    expect(readSubscriptionPeriodEndUnix({ current_period_end: 0 })).toBeNull();
    expect(readSubscriptionPeriodEndUnix({ current_period_end: null })).toBeNull();
  });
});

describe("processStripeWebhookEvent — customer.subscription.*", () => {
  it("propaga o fim do período vindo do item da assinatura", async () => {
    const d = deps();
    const result = await processStripeWebhookEvent(
      event("customer.subscription.updated", {
        id: "sub_1",
        customer: "cus_1",
        status: "active",
        cancel_at_period_end: false,
        metadata: { plan_slug: "pro" },
        items: {
          data: [
            { current_period_end: 1800000000, price: { recurring: { interval: "year" } } },
          ],
        },
      }),
      d,
    );

    expect(result).toEqual({ ok: true, action: "synced" });
    expect(d.syncSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: "sub_1",
        customerId: "cus_1",
        status: "active",
        planSlug: "pro",
        billingInterval: "year",
        currentPeriodEnd: new Date(1800000000 * 1000).toISOString(),
      }),
    );
  });

  it("ainda entende o payload na forma antiga, com o campo no root", async () => {
    const d = deps();
    await processStripeWebhookEvent(
      event("customer.subscription.updated", {
        id: "sub_2",
        current_period_end: 1700000000,
        items: { data: [{ price: { recurring: { interval: "month" } } }] },
      }),
      d,
    );

    expect(d.syncSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPeriodEnd: new Date(1700000000 * 1000).toISOString(),
        billingInterval: "month",
      }),
    );
  });

  it("marca canceled quando a assinatura é apagada", async () => {
    const d = deps();
    await processStripeWebhookEvent(
      event("customer.subscription.deleted", { id: "sub_3" }),
      d,
    );

    expect(d.syncSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: "sub_3", status: "canceled", currentPeriodEnd: null }),
    );
  });
});
