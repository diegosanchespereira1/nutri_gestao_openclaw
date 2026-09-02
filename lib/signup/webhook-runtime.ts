import "server-only";

import { decryptSignupPassword } from "@/lib/signup/encrypt-password";
import { completeSignupAccount } from "@/lib/signup/complete-account";
import { sendSignupAbandonmentEmail } from "@/lib/email/send-signup-abandonment-email";
import { readSignupIntentSecret } from "@/lib/signup/profile-from-intent";
import { createStripeClient } from "@/lib/billing/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { SignupIntentRow } from "@/lib/signup/types";
import { readSubscriptionPeriodEndUnix } from "@/lib/signup/process-stripe-event";
import type {
  SignupWebhookDeps,
  StripeCheckoutSessionLike,
} from "@/lib/signup/process-stripe-event";

function asIntent(row: Record<string, unknown>): SignupIntentRow {
  return row as unknown as SignupIntentRow;
}

export function createSignupWebhookDeps(): SignupWebhookDeps {
  return {
    async hasProcessedEvent(eventId) {
      const service = createServiceRoleClient();
      const { data } = await service
        .from("stripe_webhook_events")
        .select("id")
        .eq("id", eventId)
        .maybeSingle();
      return Boolean(data);
    },

    async recordEvent(event) {
      const service = createServiceRoleClient();
      await service.from("stripe_webhook_events").insert({
        id: event.id,
        type: event.type,
        payload: event as unknown as Record<string, unknown>,
      });
    },

    async findIntentByCheckoutSessionId(sessionId) {
      const service = createServiceRoleClient();
      const { data } = await service
        .from("signup_intents")
        .select("*")
        .eq("stripe_checkout_session_id", sessionId)
        .maybeSingle();
      return data ? asIntent(data) : null;
    },

    async markAbandonedAndNotify(intent) {
      const service = createServiceRoleClient();
      const abandonedAt = new Date().toISOString();
      await service
        .from("signup_intents")
        .update({
          status: "abandonado",
          abandoned_at: abandonedAt,
          password_cipher: null,
        })
        .eq("id", intent.id)
        .eq("status", "checkout");

      const updated: SignupIntentRow = {
        ...intent,
        status: "abandonado",
        abandoned_at: abandonedAt,
      };
      const sent = await sendSignupAbandonmentEmail(updated);
      await service
        .from("signup_intents")
        .update({
          notified_at: sent.ok ? new Date().toISOString() : null,
          last_error: sent.ok ? null : sent.error,
        })
        .eq("id", intent.id);
    },

    async completePaidSignup({ intent, session }) {
      const secret = readSignupIntentSecret();
      if (!secret || !intent.password_cipher) {
        const service = createServiceRoleClient();
        await service
          .from("signup_intents")
          .update({
            status: "pago",
            paid_at: new Date().toISOString(),
            last_error: "Senha cifrada ou SIGNUP_INTENT_SECRET ausente.",
          })
          .eq("id", intent.id);
        throw new Error("Não foi possível criar a conta após o pagamento.");
      }

      const password = decryptSignupPassword(intent.password_cipher, secret);
      const planSlug = intent.plan_slug ?? session.metadata?.plan_slug ?? "starter";
      const billingInterval =
        intent.billing_interval ??
        (session.metadata?.billing_interval === "year" ? "year" : "month");

      const periodEnd = await readSubscriptionPeriodEnd(session);
      const customerId =
        typeof session.customer === "string" ? session.customer : null;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;

      const result = await completeSignupAccount({
        service: createServiceRoleClient(),
        intent,
        password,
        planSlug,
        billingInterval,
        planExpiresAt: periodEnd,
        acquisitionSource: "public_paid",
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripeStatus: "active",
      });

      if (!result.ok) {
        const service = createServiceRoleClient();
        await service
          .from("signup_intents")
          .update({
            status: "pago",
            paid_at: new Date().toISOString(),
            last_error: result.error,
          })
          .eq("id", intent.id);
        throw new Error(result.error);
      }
    },

    async syncSubscription(input) {
      const service = createServiceRoleClient();
      if (!input.subscriptionId) return;
      const patch: Record<string, unknown> = {
        status: input.status,
        cancel_at_period_end: input.cancelAtPeriodEnd,
        current_period_end: input.currentPeriodEnd,
      };
      if (input.customerId) patch.stripe_customer_id = input.customerId;
      if (input.planSlug) patch.plan_slug = input.planSlug;
      if (input.billingInterval) patch.billing_interval = input.billingInterval;

      await service
        .from("tenant_billing")
        .update(patch)
        .eq("stripe_subscription_id", input.subscriptionId);

      if (input.currentPeriodEnd || input.planSlug || input.billingInterval) {
        const { data: billing } = await service
          .from("tenant_billing")
          .select("tenant_user_id, plan_slug, billing_interval, current_period_end")
          .eq("stripe_subscription_id", input.subscriptionId)
          .maybeSingle();
        if (billing?.tenant_user_id) {
          await service
            .from("profiles")
            .update({
              plan_expires_at: input.currentPeriodEnd ?? billing.current_period_end,
              plan_slug: input.planSlug ?? billing.plan_slug,
              billing_interval: input.billingInterval ?? billing.billing_interval,
            })
            .eq("user_id", billing.tenant_user_id);
        }
      }
    },
  };
}

async function readSubscriptionPeriodEnd(
  session: StripeCheckoutSessionLike,
): Promise<string | null> {
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;
  if (!subscriptionId) return null;
  try {
    const stripe = createStripeClient();
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const end = readSubscriptionPeriodEndUnix(sub);
    if (!end) return null;
    return new Date(end * 1000).toISOString();
  } catch {
    return null;
  }
}
