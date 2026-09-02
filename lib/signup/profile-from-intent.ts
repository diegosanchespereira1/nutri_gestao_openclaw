import { DEFAULT_ENABLED_MODULES } from "@/lib/types/modules";
import { DEFAULT_PROFILE_TIME_ZONE } from "@/lib/timezones";
import { displayNameFromLead } from "@/lib/signup/parse-signup-lead";
import type { SignupIntentRow } from "@/lib/signup/types";

export function profileUpsertFromSignupIntent(input: {
  intent: SignupIntentRow;
  userId: string;
  planSlug: string;
  billingInterval: "month" | "year" | null;
  planExpiresAt: string | null;
  acquisitionSource: "self_service" | "public_paid";
}): Record<string, unknown> {
  const fullName = displayNameFromLead({
    personKind: input.intent.person_kind,
    fullName: input.intent.full_name,
    legalName: input.intent.legal_name,
    responsibleName: input.intent.responsible_name,
  });

  return {
    user_id: input.userId,
    full_name: fullName,
    tenant_name: fullName,
    phone: input.intent.phone,
    document_kind: input.intent.document_kind,
    document_id: input.intent.document_id,
    plan_slug: input.planSlug,
    billing_interval: input.billingInterval,
    plan_expires_at: input.planExpiresAt,
    acquisition_source: input.acquisitionSource,
    timezone: DEFAULT_PROFILE_TIME_ZONE,
    enabled_modules: DEFAULT_ENABLED_MODULES,
  };
}

export function readSignupIntentSecret(): string | null {
  return process.env.SIGNUP_INTENT_SECRET?.trim() || null;
}

export function readSignupSalesEmail(): string | null {
  return process.env.SIGNUP_SALES_EMAIL?.trim() || null;
}
