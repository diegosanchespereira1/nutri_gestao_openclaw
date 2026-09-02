import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerAppOrigin } from "@/lib/app-origin";
import { sendSignupConfirmationEmail } from "@/lib/email/send-signup-confirm-email";
import { limitsPatchFromPlan } from "@/lib/signup/limits-from-plan";
import { profileUpsertFromSignupIntent } from "@/lib/signup/profile-from-intent";
import { displayNameFromLead } from "@/lib/signup/parse-signup-lead";
import { mapTenantDocumentDbError } from "@/lib/tenant/tenant-document";
import type { SignupBillingInterval, SignupIntentRow } from "@/lib/signup/types";

type ServiceClient = SupabaseClient;

export type CompleteSignupAccountInput = {
  service: ServiceClient;
  intent: SignupIntentRow;
  password: string;
  planSlug: string;
  billingInterval: SignupBillingInterval | null;
  planExpiresAt: string | null;
  acquisitionSource: "self_service" | "public_paid";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeStatus?: string | null;
};

export type CompleteSignupAccountResult =
  | { ok: true; userId: string }
  | { ok: false; error: string; code?: "document_taken" | "email_taken" | "create" };

export async function completeSignupAccount(
  input: CompleteSignupAccountInput,
): Promise<CompleteSignupAccountResult> {
  const { service, intent } = input;

  if (intent.created_user_id) {
    if (!intent.confirmation_email_sent_at) {
      await sendConfirmationForUser(service, intent, input.password);
    }
    return { ok: true, userId: intent.created_user_id };
  }

  const { data: documentOwner } = await service
    .from("profiles")
    .select("user_id")
    .eq("document_id", intent.document_id)
    .maybeSingle();
  if (documentOwner) {
    return {
      ok: false,
      error: "Já existe uma conta com este CPF/CNPJ.",
      code: "document_taken",
    };
  }

  const fullName = displayNameFromLead({
    personKind: intent.person_kind,
    fullName: intent.full_name,
    legalName: intent.legal_name,
    responsibleName: intent.responsible_name,
  });

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email: intent.email,
    password: input.password,
    email_confirm: false,
    user_metadata: {
      full_name: fullName,
      acquisition_source: input.acquisitionSource,
    },
  });

  if (createErr || !created.user) {
    const message = createErr?.message?.toLowerCase() ?? "";
    const isExists = message.includes("already") || message.includes("exists");
    return {
      ok: false,
      error: isExists
        ? "Já existe uma conta com este e-mail."
        : "Não foi possível criar a conta.",
      code: isExists ? "email_taken" : "create",
    };
  }

  const userId = created.user.id;

  const { error: profileErr } = await service.from("profiles").upsert(
    profileUpsertFromSignupIntent({
      intent,
      userId,
      planSlug: input.planSlug,
      billingInterval: input.billingInterval,
      planExpiresAt: input.planExpiresAt,
      acquisitionSource: input.acquisitionSource,
    }),
    { onConflict: "user_id" },
  );

  if (profileErr) {
    if (mapTenantDocumentDbError(profileErr)) {
      return {
        ok: false,
        error: "Já existe uma conta com este CPF/CNPJ.",
        code: "document_taken",
      };
    }
    return { ok: false, error: "Não foi possível gravar o perfil.", code: "create" };
  }

  const { data: planRow } = await service
    .from("subscription_plans")
    .select("max_clients, max_patients, max_team_members")
    .eq("slug", input.planSlug)
    .maybeSingle();

  if (planRow) {
    await service
      .from("tenant_limits")
      .update(limitsPatchFromPlan(planRow))
      .eq("tenant_user_id", userId);
  }

  if (input.stripeCustomerId || input.stripeSubscriptionId) {
    await service.from("tenant_billing").upsert(
      {
        tenant_user_id: userId,
        stripe_customer_id: input.stripeCustomerId ?? null,
        stripe_subscription_id: input.stripeSubscriptionId ?? null,
        status: input.stripeStatus ?? "active",
        billing_interval: input.billingInterval,
        plan_slug: input.planSlug,
        current_period_end: input.planExpiresAt,
        cancel_at_period_end: false,
      },
      { onConflict: "tenant_user_id" },
    );
  }

  await service
    .from("signup_intents")
    .update({
      status: "conta_criada",
      created_user_id: userId,
      paid_at: input.acquisitionSource === "public_paid" ? new Date().toISOString() : intent.paid_at,
      password_cipher: null,
      last_error: null,
    })
    .eq("id", intent.id);

  const emailResult = await sendConfirmationForUser(service, intent, input.password);
  if (!emailResult.ok) {
    await service
      .from("signup_intents")
      .update({ last_error: emailResult.error })
      .eq("id", intent.id);
  }

  return { ok: true, userId };
}

async function sendConfirmationForUser(
  service: ServiceClient,
  intent: SignupIntentRow,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const origin = getServerAppOrigin();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`;

  let actionLink: string | null = null;

  const signupLink = await service.auth.admin.generateLink({
    type: "signup",
    email: intent.email,
    password,
    options: { redirectTo },
  });

  if (!signupLink.error && signupLink.data.properties?.action_link) {
    actionLink = signupLink.data.properties.action_link;
  } else {
    const magic = await service.auth.admin.generateLink({
      type: "magiclink",
      email: intent.email,
      options: { redirectTo },
    });
    if (magic.error || !magic.data.properties?.action_link) {
      return {
        ok: false,
        error: magic.error?.message ?? signupLink.error?.message ?? "Falha ao gerar link de confirmação.",
      };
    }
    actionLink = magic.data.properties.action_link;
  }

  const fullName = displayNameFromLead({
    personKind: intent.person_kind,
    fullName: intent.full_name,
    legalName: intent.legal_name,
    responsibleName: intent.responsible_name,
  });

  const sent = await sendSignupConfirmationEmail({
    email: intent.email,
    fullName,
    actionLink,
  });
  if (!sent.ok) return sent;

  await service
    .from("signup_intents")
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq("id", intent.id);

  return { ok: true };
}
