import { describe, expect, it, vi } from "vitest";

import { processStripeWebhookEvent } from "@/lib/signup/process-stripe-event";
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
