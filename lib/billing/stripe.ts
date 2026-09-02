import "server-only";

import Stripe from "stripe";

export function readStripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY?.trim() || null;
}

export function readStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
}

export function isStripeConfigured(): boolean {
  return Boolean(readStripeSecretKey());
}

export function createStripeClient(): Stripe {
  const key = readStripeSecretKey();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY ausente no servidor.");
  }
  // Pinado de propósito: sem isto o SDK usa a versão default dele enquanto o payload do
  // webhook chega na versão da conta, e os dois lados podem discordar da forma do objeto
  // (foi o que escondeu o current_period_end). Subir esta string é uma decisão consciente.
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

export async function createSignupCheckoutSession(input: {
  stripe: Stripe;
  origin: string;
  intentId: string;
  email: string;
  priceId: string;
  planSlug: string;
  billingInterval: "month" | "year";
  expiresAtUnix: number;
}): Promise<{ id: string; url: string }> {
  const metadata = {
    signup_intent_id: input.intentId,
    plan_slug: input.planSlug,
    billing_interval: input.billingInterval,
  };

  const session = await input.stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: input.email,
    client_reference_id: input.intentId,
    expires_at: input.expiresAtUnix,
    success_url: `${input.origin}/login?aba=cadastro&pagamento=ok`,
    cancel_url: `${input.origin}/login?aba=cadastro&pagamento=cancelado`,
    line_items: [{ price: input.priceId, quantity: 1 }],
    subscription_data: { metadata },
    metadata,
  });

  if (!session.url) {
    throw new Error("Stripe não devolveu URL de Checkout.");
  }

  return { id: session.id, url: session.url };
}
