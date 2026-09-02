"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/service-role";
import type { SignupIntentRow } from "@/lib/signup/types";

async function requireSuperAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "super_admin") return null;
  return { supabase, user };
}

export async function loadSignupIntents(status?: string): Promise<{
  rows: SignupIntentRow[];
  forbidden: boolean;
}> {
  const auth = await requireSuperAdminUser();
  if (!auth) return { rows: [], forbidden: true };

  const db = isServiceRoleConfigured()
    ? createServiceRoleClient()
    : auth.supabase;

  let query = db
    .from("signup_intents")
    .select(
      "id, status, person_kind, full_name, legal_name, responsible_name, email, phone, document_kind, document_id, password_cipher, plan_slug, billing_interval, stripe_checkout_session_id, stripe_customer_id, checkout_expires_at, abandoned_at, notified_at, paid_at, created_user_id, confirmation_email_sent_at, last_error, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "todos") {
    query = query.eq("status", status);
  }

  const { data } = await query;
  const rows = (data ?? []).map((row) => ({
    ...row,
    password_cipher: row.password_cipher ? "[redacted]" : null,
  })) as SignupIntentRow[];

  return { rows, forbidden: false };
}
