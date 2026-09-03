import { describe, expect, it, vi } from "vitest";

import { createSignupCheckoutSession } from "@/lib/billing/stripe";

/**
 * As URLs de retorno são gravadas na Checkout Session no momento da criação — mudar
 * a configuração depois não conserta sessão já aberta. Por isso vale prendê-las em
 * teste: um engano aqui só aparece quando alguém paga.
 */
function stripeFake(capture: { args?: Record<string, unknown> }) {
  return {
    checkout: {
      sessions: {
        create: vi.fn(async (args: Record<string, unknown>) => {
          capture.args = args;
          return { id: "cs_test_123", url: "https://checkout.stripe.com/c/pay/cs_test_123" };
        }),
      },
    },
  } as unknown as Parameters<typeof createSignupCheckoutSession>[0]["stripe"];
}

const base = {
  origin: "https://dev-nutricao.nutrigestao.app",
  intentId: "intent-1",
  email: "pessoa@exemplo.com",
  priceId: "price_1",
  planSlug: "starter",
  billingInterval: "month" as const,
  expiresAtUnix: 1800000000,
};

describe("createSignupCheckoutSession — URLs de retorno", () => {
  it("manda o sucesso para a aba Entrar", async () => {
    const capture: { args?: Record<string, unknown> } = {};
    await createSignupCheckoutSession({ stripe: stripeFake(capture), ...base });

    expect(capture.args?.success_url).toBe(
      "https://dev-nutricao.nutrigestao.app/login?aba=entrar&pagamento=ok",
    );
  });

  it("manda o cancelamento de volta ao cadastro, onde dá para escolher outro plano", async () => {
    const capture: { args?: Record<string, unknown> } = {};
    await createSignupCheckoutSession({ stripe: stripeFake(capture), ...base });

    expect(capture.args?.cancel_url).toBe(
      "https://dev-nutricao.nutrigestao.app/login?aba=cadastro&pagamento=cancelado",
    );
  });

  it("usa a origem recebida, não um host fixo", async () => {
    const capture: { args?: Record<string, unknown> } = {};
    await createSignupCheckoutSession({
      stripe: stripeFake(capture),
      ...base,
      origin: "https://nutrigestao.app",
    });

    expect(capture.args?.success_url).toBe(
      "https://nutrigestao.app/login?aba=entrar&pagamento=ok",
    );
    expect(String(capture.args?.cancel_url)).not.toContain("localhost");
  });

  it("propaga plano e intervalo na metadata, que o webhook usa para criar a conta", async () => {
    const capture: { args?: Record<string, unknown> } = {};
    await createSignupCheckoutSession({ stripe: stripeFake(capture), ...base });

    expect(capture.args?.metadata).toEqual({
      signup_intent_id: "intent-1",
      plan_slug: "starter",
      billing_interval: "month",
    });
  });
});
