import { NextResponse } from "next/server";

import {
  createStripeClient,
  readStripeWebhookSecret,
} from "@/lib/billing/stripe";
import {
  processStripeWebhookEvent,
  type StripeCheckoutSessionLike,
} from "@/lib/signup/process-stripe-event";
import { createSignupWebhookDeps } from "@/lib/signup/webhook-runtime";
import { isServiceRoleConfigured } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const secret = readStripeWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook Stripe não configurado." },
      { status: 503 },
    );
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "Servidor sem service role." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  const rawBody = await request.text();
  let constructed: { id: string; type: string; data: { object: unknown } };
  try {
    constructed = createStripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      secret,
    );
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const object = constructed.data.object as StripeCheckoutSessionLike &
    Record<string, unknown>;
  const result = await processStripeWebhookEvent(
    {
      id: constructed.id,
      type: constructed.type,
      data: { object },
    },
    createSignupWebhookDeps(),
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ received: true, action: result.action });
}
