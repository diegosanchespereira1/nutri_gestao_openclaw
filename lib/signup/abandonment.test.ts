import { describe, expect, it } from "vitest";

import {
  CHECKOUT_TTL_SECONDS,
  isStaleCheckoutExpiration,
  shouldNotifyCheckoutAbandonment,
  signupStatusLabel,
} from "@/lib/signup/abandonment";

describe("shouldNotifyCheckoutAbandonment", () => {
  it("só notifica checkout sem e-mail prévio", () => {
    expect(
      shouldNotifyCheckoutAbandonment({
        status: "checkout",
        notified_at: null,
        stripe_checkout_session_id: "cs_test_1",
      }),
    ).toBe(true);

    expect(
      shouldNotifyCheckoutAbandonment({
        status: "plano",
        notified_at: null,
        stripe_checkout_session_id: null,
      }),
    ).toBe(false);

    expect(
      shouldNotifyCheckoutAbandonment({
        status: "checkout",
        notified_at: "2026-09-02T12:00:00.000Z",
        stripe_checkout_session_id: "cs_test_1",
      }),
    ).toBe(false);
  });
});

describe("isStaleCheckoutExpiration", () => {
  it("ignora sessão antiga ou já paga", () => {
    expect(
      isStaleCheckoutExpiration({
        intentSessionId: "cs_new",
        expiredSessionId: "cs_old",
        status: "checkout",
      }),
    ).toBe(true);

    expect(
      isStaleCheckoutExpiration({
        intentSessionId: "cs_1",
        expiredSessionId: "cs_1",
        status: "conta_criada",
      }),
    ).toBe(true);

    expect(
      isStaleCheckoutExpiration({
        intentSessionId: "cs_1",
        expiredSessionId: "cs_1",
        status: "checkout",
      }),
    ).toBe(false);
  });
});

describe("signupStatusLabel", () => {
  it("rotula abandono", () => {
    expect(signupStatusLabel("abandonado")).toBe("Abandonado no pagamento");
  });
});

describe("checkout ttl", () => {
  it("é 60 minutos", () => {
    expect(CHECKOUT_TTL_SECONDS).toBe(3600);
  });
});
