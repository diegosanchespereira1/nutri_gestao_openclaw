"use server";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/service-role";
import {
  checkAccountClosureRequestRateLimit,
  getClientIpFromHeaders,
} from "@/lib/rate-limit";
import {
  createSignupCheckoutSession,
  createStripeClient,
  isStripeConfigured,
} from "@/lib/billing/stripe";
import { getServerAppOrigin } from "@/lib/app-origin";
import { encryptSignupPassword } from "@/lib/signup/encrypt-password";
import { parseSignupLead } from "@/lib/signup/parse-signup-lead";
import { checkoutKindForPlan, sortPublicSignupPlans, stripePriceColumn, toPublicSignupPlan } from "@/lib/signup/plan-checkout";
import { checkoutExpiresAt } from "@/lib/signup/abandonment";
import { completeSignupAccount } from "@/lib/signup/complete-account";
import {
  readSignupIntentSecret,
  readSignupSalesEmail,
} from "@/lib/signup/profile-from-intent";
import type {
  PublicSignupPlan,
  SignupBillingInterval,
  SignupLeadInput,
  SignupLeadParsed,
} from "@/lib/signup/types";

export type SignupActionResult =
  | { ok: true }
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string };

async function rateLimitSignup(email: string): Promise<string | null> {
  const hdrs = await headers();
  const ip = getClientIpFromHeaders(
    hdrs.get("x-forwarded-for"),
    hdrs.get("x-real-ip"),
  );
  const limit = await checkAccountClosureRequestRateLimit(`signup:${email}`, ip);
  if (!limit.success) {
    return "Muitas tentativas. Aguarde e tente novamente.";
  }
  return null;
}

export async function listPublicSignupPlansAction(): Promise<{
  plans: PublicSignupPlan[];
  salesEmail: string | null;
  error?: string;
}> {
  const supabase = await createClient();
  const selectCols =
    "slug, name, description, price_monthly_cents, price_annual_cents, max_clients, max_establishments, max_team_members, max_patients, feature_portal_externo, feature_pdf_export, feature_csv_import, sales_whatsapp";

  let { data, error } = await supabase
    .from("subscription_plans")
    .select(selectCols)
    .eq("is_active", true)
    .order("price_monthly_cents", { ascending: true });

  if (error && isServiceRoleConfigured()) {
    const retry = await createServiceRoleClient()
      .from("subscription_plans")
      .select(selectCols)
      .eq("is_active", true)
      .order("price_monthly_cents", { ascending: true });
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return { plans: [], salesEmail: readSignupSalesEmail(), error: "Não foi possível carregar os planos." };
  }

  return {
    plans: sortPublicSignupPlans((data ?? []).map(toPublicSignupPlan)),
    salesEmail: readSignupSalesEmail(),
  };
}

async function insertIntent(
  parsed: SignupLeadParsed,
  extra: Record<string, unknown>,
) {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("signup_intents")
    .insert({
      status: extra.status ?? "dados",
      person_kind: parsed.personKind,
      full_name: parsed.fullName,
      legal_name: parsed.legalName,
      responsible_name: parsed.responsibleName,
      email: parsed.email,
      phone: parsed.phone,
      document_kind: parsed.documentKind,
      document_id: parsed.documentId,
      ...extra,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error("Não foi possível iniciar o cadastro.");
  }
  return data;
}

export async function completeFreeSignupAction(input: {
  lead: SignupLeadInput;
  planSlug: string;
}): Promise<SignupActionResult> {
  const parsed = parseSignupLead(input.lead);
  if (!parsed.ok) {
    return { ok: false, error: Object.values(parsed.errors)[0] ?? "Dados inválidos." };
  }

  const limited = await rateLimitSignup(parsed.value.email);
  if (limited) return { ok: false, error: limited };

  if (!isServiceRoleConfigured()) {
    return { ok: false, error: "Cadastro indisponível no momento." };
  }

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("slug, price_monthly_cents")
    .eq("slug", input.planSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!plan || checkoutKindForPlan({
    slug: plan.slug,
    priceMonthlyCents: Number(plan.price_monthly_cents) || 0,
  }) !== "free") {
    return { ok: false, error: "Este plano não pode ser ativado sem pagamento." };
  }

  try {
    const intent = await insertIntent(parsed.value, {
      status: "plano",
      plan_slug: plan.slug,
      billing_interval: null,
    });

    const completed = await completeSignupAccount({
      service: createServiceRoleClient(),
      intent: {
        ...intent,
        status: "plano",
      },
      password: parsed.value.password,
      planSlug: plan.slug,
      billingInterval: null,
      planExpiresAt: null,
      acquisitionSource: "self_service",
    });

    if (!completed.ok) {
      return { ok: false, error: completed.error };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Não foi possível criar a conta.";
    return { ok: false, error: message };
  }
}

export async function startPaidCheckoutAction(input: {
  lead: SignupLeadInput;
  planSlug: string;
  billingInterval: SignupBillingInterval;
}): Promise<SignupActionResult> {
  const parsed = parseSignupLead(input.lead);
  if (!parsed.ok) {
    return { ok: false, error: Object.values(parsed.errors)[0] ?? "Dados inválidos." };
  }

  const limited = await rateLimitSignup(parsed.value.email);
  if (limited) return { ok: false, error: limited };

  if (!isServiceRoleConfigured()) {
    return { ok: false, error: "Cadastro indisponível no momento." };
  }
  if (!isStripeConfigured()) {
    return { ok: false, error: "Pagamento indisponível no momento. Tente mais tarde." };
  }

  const secret = readSignupIntentSecret();
  if (!secret) {
    return { ok: false, error: "Cadastro indisponível no momento." };
  }

  const service = createServiceRoleClient();
  const priceCol = stripePriceColumn(input.billingInterval);
  const { data: plan } = await service
    .from("subscription_plans")
    .select(
      `slug, price_monthly_cents, price_annual_cents, ${priceCol}`,
    )
    .eq("slug", input.planSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!plan) {
    return { ok: false, error: "Plano inválido." };
  }

  const kind = checkoutKindForPlan({
    slug: plan.slug,
    priceMonthlyCents: Number(plan.price_monthly_cents) || 0,
  });
  if (kind !== "stripe") {
    return { ok: false, error: "Este plano não usa pagamento online." };
  }

  if (input.billingInterval === "year" && !plan.price_annual_cents) {
    return { ok: false, error: "Este plano não tem cobrança anual." };
  }

  const priceId = (plan as Record<string, unknown>)[priceCol];
  if (typeof priceId !== "string" || !priceId.trim()) {
    return { ok: false, error: "Pagamento deste plano ainda não está configurado." };
  }

  try {
    const expires = checkoutExpiresAt();
    const intent = await insertIntent(parsed.value, {
      status: "checkout",
      plan_slug: plan.slug,
      billing_interval: input.billingInterval,
      password_cipher: encryptSignupPassword(parsed.value.password, secret),
      checkout_expires_at: expires.toISOString(),
    });

    const session = await createSignupCheckoutSession({
      stripe: createStripeClient(),
      origin: getServerAppOrigin(),
      intentId: intent.id,
      email: parsed.value.email,
      priceId: priceId.trim(),
      planSlug: plan.slug,
      billingInterval: input.billingInterval,
      expiresAtUnix: Math.floor(expires.getTime() / 1000),
    });

    const { error: updateErr } = await service
      .from("signup_intents")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", intent.id);

    if (updateErr) {
      return { ok: false, error: "Não foi possível preparar o pagamento." };
    }

    return { ok: true, checkoutUrl: session.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Não foi possível iniciar o pagamento.";
    return { ok: false, error: message };
  }
}
