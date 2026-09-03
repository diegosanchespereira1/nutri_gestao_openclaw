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
import {
  checkSignupAvailability,
  type SignupAvailabilityDeps,
} from "@/lib/signup/signup-availability";
import { resolveSignupOutcome, type SignupOutcome } from "@/lib/signup/signup-outcome";
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

/**
 * Desfecho de um cadastro pago, para a página de retorno do Stripe.
 *
 * Devolve **apenas** o estado — nada de e-mail, nome ou documento. O id do intent
 * viaja na URL de retorno e é um UUID, mas mesmo assim esta action não pode virar
 * um oráculo de dados pessoais para quem tenha o link.
 */
/**
 * Disponibilidade de e-mail e CPF/CNPJ para o passo 1 do wizard.
 *
 * A checagem existe também antes do Checkout, mas ali o utilizador já escolheu o
 * plano e clicou em pagar — descobrir o conflito nesse ponto obriga a voltar dois
 * passos. Aqui ele é avisado com o formulário ainda aberto à frente.
 */
export async function checkSignupLeadAvailabilityAction(
  lead: SignupLeadInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = parseSignupLead(lead);
  if (!parsed.ok) {
    return { ok: false, error: Object.values(parsed.errors)[0] ?? "Dados inválidos." };
  }
  // Sem service role não há como consultar; o passo seguinte não é bloqueado por
  // isso — quem barra de facto continua sendo o checkout e o webhook.
  if (!isServiceRoleConfigured()) return { ok: true };

  const availability = await checkSignupAvailability(
    signupAvailabilityDeps(createServiceRoleClient()),
    { email: parsed.value.email, documentId: parsed.value.documentId },
  );
  return availability.available
    ? { ok: true }
    : { ok: false, error: availability.error };
}

export async function checkSignupOutcomeAction(
  intentId: string,
): Promise<{ outcome: SignupOutcome }> {
  const id = intentId.trim();
  // O webhook ainda pode estar a correr: na dúvida, "processando" nunca alarma.
  if (!id || !isServiceRoleConfigured()) return { outcome: "processando" };

  const { data, error } = await createServiceRoleClient()
    .from("signup_intents")
    .select("status, created_user_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return { outcome: "processando" };

  return {
    outcome: resolveSignupOutcome({
      status: data.status ?? null,
      createdUserId: data.created_user_id ?? null,
    }),
  };
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

  // ANTES de cobrar. A mesma checagem existe em completeSignupAccount, mas lá ela
  // roda no webhook — depois do pagamento — e o utilizador ficava com assinatura
  // ativa e sem conta. Aqui ele ainda pode corrigir o formulário.
  const availability = await checkSignupAvailability(
    signupAvailabilityDeps(service),
    { email: parsed.value.email, documentId: parsed.value.documentId },
  );
  if (!availability.available) {
    return { ok: false, error: availability.error };
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


/** I/O da checagem de disponibilidade, partilhado pelas duas actions. */
function signupAvailabilityDeps(
  service: ReturnType<typeof createServiceRoleClient>,
): SignupAvailabilityDeps {
  return {
    async findProfileIdByDocument(documentId) {
      const { data } = await service
        .from("profiles")
        .select("user_id")
        .eq("document_id", documentId)
        .maybeSingle();
      return data?.user_id ?? null;
    },
    async findAuthUserIdByEmail(email) {
      // Mesmo padrão de findAuthUserByEmail em lib/actions/team-members.ts: o
      // GoTrue não expõe busca por e-mail, então percorre as páginas do admin.
      const perPage = 200;
      for (let page = 1; page <= 10; page += 1) {
        const { data, error } = await service.auth.admin.listUsers({
          page,
          perPage,
        });
        if (error) {
          // Sem resposta não dá para afirmar que o e-mail está livre. Deixa
          // passar: createUser ainda barra no webhook, e falhar fechado
          // bloquearia todo cadastro por uma indisponibilidade do Auth.
          console.error("[signupAvailability] listUsers falhou", error);
          return null;
        }
        const users = data?.users ?? [];
        const hit = users.find((u) => u.email?.trim().toLowerCase() === email);
        if (hit?.id) return hit.id;
        if (users.length < perPage) break;
      }
      return null;
    },
  };
}
