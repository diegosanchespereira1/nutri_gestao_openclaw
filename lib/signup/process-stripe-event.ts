import type { SignupIntentRow, SignupIntentStatus } from "@/lib/signup/types";
import {
  isStaleCheckoutExpiration,
  shouldNotifyCheckoutAbandonment,
} from "@/lib/signup/abandonment";

export type StripeCheckoutSessionLike = {
  id: string;
  customer?: string | null;
  subscription?: string | null;
  payment_status?: string | null;
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
};

export type StripeWebhookEventLike = {
  id: string;
  type: string;
  data: { object: StripeCheckoutSessionLike & Record<string, unknown> };
};

export type SignupWebhookDeps = {
  hasProcessedEvent: (eventId: string) => Promise<boolean>;
  recordEvent: (event: StripeWebhookEventLike) => Promise<void>;
  findIntentByCheckoutSessionId: (
    sessionId: string,
  ) => Promise<SignupIntentRow | null>;
  markAbandonedAndNotify: (intent: SignupIntentRow) => Promise<void>;
  completePaidSignup: (input: {
    intent: SignupIntentRow;
    session: StripeCheckoutSessionLike;
  }) => Promise<void>;
  syncSubscription: (input: {
    subscriptionId: string;
    customerId: string | null;
    status: string | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    planSlug: string | null;
    billingInterval: "month" | "year" | null;
  }) => Promise<void>;
};

export type ProcessStripeEventResult =
  | { ok: true; action: "duplicate" | "ignored" | "abandoned" | "paid" | "synced" }
  | { ok: false; error: string };

/**
 * Lê o fim do período de uma Subscription tolerando as duas formas do campo.
 *
 * A partir de `stripe@20` (API 2025-03-31.basil) `current_period_end` saiu do root de
 * `Subscription` e passou a viver em cada `SubscriptionItem`. O payload do webhook usa a
 * API version **da conta**, que pode ser mais antiga que a do SDK, então as duas formas
 * podem aparecer — daí a leitura em cascata em vez de trocar uma pela outra.
 */
export function readSubscriptionPeriodEndUnix(sub: {
  current_period_end?: number | null;
  items?: { data?: Array<{ current_period_end?: number | null }> };
}): number | null {
  const fromItem = sub.items?.data?.[0]?.current_period_end;
  if (typeof fromItem === "number" && fromItem > 0) return fromItem;
  const fromRoot = sub.current_period_end;
  if (typeof fromRoot === "number" && fromRoot > 0) return fromRoot;
  return null;
}

export async function processStripeWebhookEvent(
  event: StripeWebhookEventLike,
  deps: SignupWebhookDeps,
): Promise<ProcessStripeEventResult> {
  if (await deps.hasProcessedEvent(event.id)) {
    return { ok: true, action: "duplicate" };
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const intent = await deps.findIntentByCheckoutSessionId(session.id);
    if (!intent) {
      await deps.recordEvent(event);
      return { ok: true, action: "ignored" };
    }
    if (
      isStaleCheckoutExpiration({
        intentSessionId: intent.stripe_checkout_session_id,
        expiredSessionId: session.id,
        status: intent.status,
      })
    ) {
      await deps.recordEvent(event);
      return { ok: true, action: "ignored" };
    }
    if (shouldNotifyCheckoutAbandonment(intent)) {
      await deps.markAbandonedAndNotify(intent);
      await deps.recordEvent(event);
      return { ok: true, action: "abandoned" };
    }
    await deps.recordEvent(event);
    return { ok: true, action: "ignored" };
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status && session.payment_status !== "paid") {
      await deps.recordEvent(event);
      return { ok: true, action: "ignored" };
    }
    const intent = await deps.findIntentByCheckoutSessionId(session.id);
    if (!intent) {
      return { ok: false, error: "Intent de cadastro não encontrada para a sessão." };
    }
    const alreadyDone: SignupIntentStatus[] = ["pago", "conta_criada"];
    if (alreadyDone.includes(intent.status)) {
      await deps.recordEvent(event);
      return { ok: true, action: "duplicate" };
    }
    await deps.completePaidSignup({ intent, session });
    await deps.recordEvent(event);
    return { ok: true, action: "paid" };
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const obj = event.data.object as unknown as {
      id?: string;
      customer?: string;
      status?: string;
      cancel_at_period_end?: boolean;
      current_period_end?: number;
      metadata?: Record<string, string> | null;
      items?: {
        data?: Array<{
          current_period_end?: number | null;
          plan?: { interval?: string };
          price?: { recurring?: { interval?: string } };
        }>;
      };
    };
    const subscriptionId = obj.id ?? "";
    if (!subscriptionId) {
      await deps.recordEvent(event);
      return { ok: true, action: "ignored" };
    }
    const interval =
      obj.items?.data?.[0]?.price?.recurring?.interval === "year" ||
      obj.items?.data?.[0]?.plan?.interval === "year"
        ? "year"
        : obj.items?.data?.[0]?.price?.recurring?.interval === "month" ||
            obj.items?.data?.[0]?.plan?.interval === "month"
          ? "month"
          : null;
    await deps.syncSubscription({
      subscriptionId,
      customerId: typeof obj.customer === "string" ? obj.customer : null,
      status: obj.status ?? (event.type === "customer.subscription.deleted" ? "canceled" : null),
      cancelAtPeriodEnd: Boolean(obj.cancel_at_period_end),
      currentPeriodEnd: (() => {
        const end = readSubscriptionPeriodEndUnix(obj);
        return end ? new Date(end * 1000).toISOString() : null;
      })(),
      planSlug: obj.metadata?.plan_slug ?? null,
      billingInterval: interval,
    });
    await deps.recordEvent(event);
    return { ok: true, action: "synced" };
  }

  await deps.recordEvent(event);
  return { ok: true, action: "ignored" };
}
