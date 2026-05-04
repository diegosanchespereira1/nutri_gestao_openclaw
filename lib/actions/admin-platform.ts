"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

// Guard: only super_admin can call these actions
async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "super_admin") {
    redirect("/admin");
  }
  return { supabase, user };
}

// ── 10.1 — Gestão de tenants ──────────────────────────────────────────────────

export type TenantRow = {
  id: string;
  full_name: string | null;
  plan_slug: string;
  is_suspended: boolean;
  suspended_reason: string | null;
  plan_expires_at: string | null;
  created_at: string;
  lgpd_blocked_at: string | null;
  lgpd_unblocked_at: string | null;
};

export async function loadTenants(search?: string): Promise<{
  rows: TenantRow[];
}> {
  const { supabase } = await requireSuperAdmin();

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, plan_slug, is_suspended, suspended_reason, plan_expires_at, created_at, lgpd_blocked_at, lgpd_unblocked_at",
    )
    .not("role", "in", '("admin","super_admin")')
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error || !data) return { rows: [] };
  return { rows: data as TenantRow[] };
}

export async function suspendTenantAction(formData: FormData): Promise<void> {
  const { supabase } = await requireSuperAdmin();

  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!tenantId) redirect("/admin/tenants?err=invalid");

  const { error } = await supabase
    .from("profiles")
    .update({ is_suspended: true, suspended_reason: reason || "Suspensão administrativa." })
    .eq("id", tenantId)
    .not("role", "in", '("admin","super_admin")');

  if (error) redirect("/admin/tenants?err=save");

  revalidatePath("/admin/tenants");
  redirect("/admin/tenants?ok=suspended");
}

export async function reactivateTenantAction(formData: FormData): Promise<void> {
  const { supabase } = await requireSuperAdmin();

  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  if (!tenantId) redirect("/admin/tenants?err=invalid");

  const { error } = await supabase
    .from("profiles")
    .update({ is_suspended: false, suspended_reason: null })
    .eq("id", tenantId);

  if (error) redirect("/admin/tenants?err=save");

  revalidatePath("/admin/tenants");
  redirect("/admin/tenants?ok=reactivated");
}

export async function changeTenantPlanAction(formData: FormData): Promise<void> {
  const { supabase } = await requireSuperAdmin();

  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  const planSlug = String(formData.get("plan_slug") ?? "").trim();
  const expiresAt = String(formData.get("plan_expires_at") ?? "").trim() || null;

  if (!tenantId || !planSlug) redirect("/admin/tenants?err=invalid");

  const { error } = await supabase
    .from("profiles")
    .update({
      plan_slug: planSlug,
      plan_expires_at: expiresAt ?? null,
    })
    .eq("id", tenantId);

  if (error) redirect("/admin/tenants?err=save");

  revalidatePath("/admin/tenants");
  redirect("/admin/tenants?ok=plan_updated");
}

export async function unblockLgpdTenantAction(formData: FormData): Promise<void> {
  const { supabase } = await requireSuperAdmin();

  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  if (!tenantId) redirect("/admin/tenants?err=invalid");

  const { data, error } = await supabase.rpc("lgpd_admin_unblock_profile", {
    p_profile_id: tenantId,
  });

  if (error) redirect("/admin/tenants?err=save");

  const userId =
    data &&
    typeof data === "object" &&
    "user_id" in data &&
    typeof (data as { user_id: unknown }).user_id === "string"
      ? (data as { user_id: string }).user_id
      : null;

  if (userId) {
    const { liftAuthBanAfterLgpdUnblock } = await import(
      "@/lib/actions/account-deletion"
    );
    await liftAuthBanAfterLgpdUnblock(userId);
  }

  revalidatePath("/admin/tenants");
  redirect("/admin/tenants?ok=lgpd_unblocked");
}

// ── 10.2 — Planos ────────────────────────────────────────────────────────────

export type SubscriptionPlan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly_cents: number;
  price_annual_cents: number | null;
  max_clients: number;
  max_establishments: number;
  max_team_members: number;
  max_patients: number;
  max_storage_mb: number;
  feature_portal_externo: boolean;
  feature_pdf_export: boolean;
  feature_csv_import: boolean;
  feature_api_access: boolean;
  is_active: boolean;
};

export async function loadSubscriptionPlans(): Promise<{
  rows: SubscriptionPlan[];
}> {
  const { supabase } = await requireSuperAdmin();

  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("price_monthly_cents", { ascending: true });

  if (error || !data) return { rows: [] };
  return { rows: data as SubscriptionPlan[] };
}

// ── 10.3 — Métricas ──────────────────────────────────────────────────────────

export type PlatformMetrics = {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  free_plan_count: number;
  starter_plan_count: number;
  pro_plan_count: number;
  enterprise_plan_count: number;
  total_clients: number;
  total_visits: number;
  total_recipes: number;
};

export async function loadPlatformMetrics(): Promise<{
  metrics: PlatformMetrics | null;
}> {
  const { supabase } = await requireSuperAdmin();

  const { data, error } = await supabase
    .from("admin_platform_metrics")
    .select("*")
    .maybeSingle();

  if (error || !data) return { metrics: null };
  return { metrics: data as PlatformMetrics };
}

// ── Super Admin — Cockpit de Tenant ──────────────────────────────────────────

export type TenantDetailProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  crn: string | null;
  phone: string | null;
  plan_slug: string;
  plan_expires_at: string | null;
  is_suspended: boolean;
  suspended_reason: string | null;
  trial_started_at: string | null;
  last_active_at: string | null;
  acquisition_source: string | null;
  created_at: string;
  lgpd_blocked_at: string | null;
  lgpd_unblocked_at: string | null;
};

export type SubscriptionEvent = {
  id: string;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
};

export type TenantFeatureOverride = {
  id: string;
  feature_key: string;
  enabled: boolean;
  reason: string | null;
  updated_at: string;
};

export type AdminTenantNote = {
  id: string;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TenantCockpitData = {
  profile: TenantDetailProfile;
  events: SubscriptionEvent[];
  overrides: TenantFeatureOverride[];
  notes: AdminTenantNote[];
  plans: SubscriptionPlan[];
  activityCounts: {
    clients: number;
    establishments: number;
    visits: number;
    recipes: number;
    apiTokens: number;
  };
};

export async function loadTenantCockpitData(
  profileId: string,
): Promise<{ data: TenantCockpitData } | { error: string }> {
  const { supabase } = await requireSuperAdmin();

  // Load profile
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select(
      "id, user_id, full_name, crn, phone, plan_slug, plan_expires_at, is_suspended, suspended_reason, trial_started_at, last_active_at, acquisition_source, created_at, lgpd_blocked_at, lgpd_unblocked_at",
    )
    .eq("id", profileId)
    .not("role", "in", '("admin","super_admin")')
    .maybeSingle();

  if (profileErr || !profile) return { error: "Tenant não encontrado." };

  const tenantUserId = (profile as TenantDetailProfile).user_id;

  // Load all related data in parallel
  const [
    eventsResult,
    overridesResult,
    notesResult,
    plansResult,
    clientsResult,
    establishmentsResult,
    visitsResult,
    recipesResult,
    tokensResult,
  ] = await Promise.all([
    supabase
      .from("subscription_events")
      .select("id, event_type, old_value, new_value, metadata, created_at, created_by")
      .eq("tenant_user_id", tenantUserId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("tenant_feature_overrides")
      .select("id, feature_key, enabled, reason, updated_at")
      .eq("tenant_user_id", tenantUserId)
      .order("feature_key"),
    supabase
      .from("admin_tenant_notes")
      .select("id, body, created_by, created_at, updated_at")
      .eq("tenant_user_id", tenantUserId)
      .order("created_at", { ascending: false }),
    supabase
      .from("subscription_plans")
      .select("id, name, slug, description, price_monthly_cents, price_annual_cents, max_clients, max_establishments, max_team_members, max_patients, max_storage_mb, feature_portal_externo, feature_pdf_export, feature_csv_import, feature_api_access, is_active")
      .order("price_monthly_cents"),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", tenantUserId),
    supabase
      .from("establishments")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", tenantUserId),
    supabase
      .from("scheduled_visits")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", tenantUserId),
    supabase
      .from("technical_recipes")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", tenantUserId),
    supabase
      .from("api_tokens")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", tenantUserId)
      .is("revoked_at", null),
  ]);

  return {
    data: {
      profile: profile as TenantDetailProfile,
      events: (eventsResult.data ?? []) as SubscriptionEvent[],
      overrides: (overridesResult.data ?? []) as TenantFeatureOverride[],
      notes: (notesResult.data ?? []) as AdminTenantNote[],
      plans: (plansResult.data ?? []) as SubscriptionPlan[],
      activityCounts: {
        clients: clientsResult.count ?? 0,
        establishments: establishmentsResult.count ?? 0,
        visits: visitsResult.count ?? 0,
        recipes: recipesResult.count ?? 0,
        apiTokens: tokensResult.count ?? 0,
      },
    },
  };
}

export async function setTenantFeatureOverrideAction(
  formData: FormData,
): Promise<void> {
  const { supabase, user } = await requireSuperAdmin();

  const tenantUserId = String(formData.get("tenant_user_id") ?? "").trim();
  const profileId = String(formData.get("profile_id") ?? "").trim();
  const featureKey = String(formData.get("feature_key") ?? "").trim();
  const enabled = formData.get("enabled") === "true";
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!tenantUserId || !featureKey) {
    redirect(`/admin/tenants/${profileId}?err=invalid`);
  }

  const { error } = await supabase.from("tenant_feature_overrides").upsert(
    {
      tenant_user_id: tenantUserId,
      feature_key: featureKey,
      enabled,
      reason,
      updated_by: user.id,
    },
    { onConflict: "tenant_user_id,feature_key" },
  );

  if (error) redirect(`/admin/tenants/${profileId}?err=save`);

  revalidatePath(`/admin/tenants/${profileId}`);
  redirect(`/admin/tenants/${profileId}?ok=feature_updated`);
}

export async function addAdminNoteAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireSuperAdmin();

  const tenantUserId = String(formData.get("tenant_user_id") ?? "").trim();
  const profileId = String(formData.get("profile_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!tenantUserId || !body) {
    redirect(`/admin/tenants/${profileId}?err=invalid`);
  }

  const { error } = await supabase.from("admin_tenant_notes").insert({
    tenant_user_id: tenantUserId,
    body,
    created_by: user.id,
  });

  if (error) redirect(`/admin/tenants/${profileId}?err=save`);

  revalidatePath(`/admin/tenants/${profileId}`);
  redirect(`/admin/tenants/${profileId}?ok=note_added`);
}

export async function deleteAdminNoteAction(formData: FormData): Promise<void> {
  const { supabase } = await requireSuperAdmin();

  const noteId = String(formData.get("note_id") ?? "").trim();
  const profileId = String(formData.get("profile_id") ?? "").trim();

  if (!noteId) redirect(`/admin/tenants/${profileId}?err=invalid`);

  const { error } = await supabase
    .from("admin_tenant_notes")
    .delete()
    .eq("id", noteId);

  if (error) redirect(`/admin/tenants/${profileId}?err=save`);

  revalidatePath(`/admin/tenants/${profileId}`);
  redirect(`/admin/tenants/${profileId}?ok=note_deleted`);
}

export async function recordPaymentEventAction(
  formData: FormData,
): Promise<void> {
  const { supabase, user } = await requireSuperAdmin();

  const tenantUserId = String(formData.get("tenant_user_id") ?? "").trim();
  const profileId = String(formData.get("profile_id") ?? "").trim();
  const amountCents = parseInt(
    String(formData.get("amount_cents") ?? "0"),
    10,
  );
  const notes = String(formData.get("notes") ?? "").trim();

  if (!tenantUserId || amountCents <= 0) {
    redirect(`/admin/tenants/${profileId}?err=invalid`);
  }

  const { error } = await supabase.from("subscription_events").insert({
    tenant_user_id: tenantUserId,
    event_type: "payment_received",
    new_value: String(amountCents),
    metadata: { amount_cents: amountCents, notes, recorded_manually: true },
    created_by: user.id,
  });

  if (error) redirect(`/admin/tenants/${profileId}?err=save`);

  revalidatePath(`/admin/tenants/${profileId}`);
  redirect(`/admin/tenants/${profileId}?ok=payment_recorded`);
}

// ── 10.6 — Notificar profissionais ao atualizar portaria ─────────────────────

export async function notifyTenantsAboutPortariaUpdateAction(
  formData: FormData,
): Promise<void> {
  // In a full implementation, this would enqueue emails/push notifications.
  // For MVP: record the notification event and update checklist template version.
  const { supabase } = await requireSuperAdmin();

  const templateId = String(formData.get("template_id") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!templateId || !message) redirect("/admin/checklists?err=invalid");

  // Bump version on checklist template (triggers re-validation on next use)
  const { data: template } = await supabase
    .from("checklist_templates")
    .select("version")
    .eq("id", templateId)
    .maybeSingle();

  if (template) {
    await supabase
      .from("checklist_templates")
      .update({ version: (template.version ?? 1) + 1 })
      .eq("id", templateId);
  }

  // In production: call email service (Resend, SendGrid, etc.) with tenant list
  // For now, we just revalidate the admin page
  revalidatePath("/admin/checklists");
  redirect("/admin/checklists?ok=notified");
}

// ── Super Admin — Criação de tenant pelo admin ────────────────────────────────

export type DegustacaoConfigRow = {
  id: string;
  feature_key: string;
  enabled: boolean;
  label: string | null;
};

export async function loadDegustacaoConfig(): Promise<{
  rows: DegustacaoConfigRow[];
}> {
  const { supabase } = await requireSuperAdmin();
  const { data } = await supabase
    .from("degustacao_config")
    .select("id, feature_key, enabled, label")
    .order("feature_key");
  return { rows: (data ?? []) as DegustacaoConfigRow[] };
}

export async function saveDegustacaoConfigAction(
  formData: FormData,
): Promise<void> {
  const { supabase, user } = await requireSuperAdmin();

  // formData contains one entry per feature_key: feature_key => "true" | "false"
  const entries = Array.from(formData.entries()).filter(
    ([k]) => !k.startsWith("_"),
  );

  for (const [featureKey, value] of entries) {
    await supabase
      .from("degustacao_config")
      .update({ enabled: value === "true", updated_by: user.id })
      .eq("feature_key", featureKey);
  }

  revalidatePath("/admin/degustacao");
  redirect("/admin/degustacao?ok=saved");
}

export async function createTenantAsAdminAction(
  formData: FormData,
): Promise<void> {
  // Verify super_admin first (uses regular client for auth check)
  const { user: adminUser } = await requireSuperAdmin();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const planSlug = String(formData.get("plan_slug") ?? "free").trim();
  const sendInvite = formData.get("send_invite") === "true";

  if (!fullName || !email) {
    redirect("/admin/tenants/novo?err=invalid");
  }

  // Minimum password or let Supabase generate one when sending invite
  const effectivePassword =
    password.length >= 12 ? password : crypto.randomUUID().replace(/-/g, "");

  // Use service role to create auth user (bypasses RLS + email verification)
  const adminSupabase = createServiceRoleClient();

  const { data: created, error: createErr } =
    await adminSupabase.auth.admin.createUser({
      email,
      password: effectivePassword,
      email_confirm: !sendInvite,   // confirm immediately unless sending invite
      user_metadata: {
        full_name: fullName,
        acquisition_source: "admin_created",
      },
    });

  if (createErr || !created.user) {
    const isExists =
      createErr?.message?.toLowerCase().includes("already") ||
      createErr?.message?.toLowerCase().includes("exists");
    redirect(`/admin/tenants/novo?err=${isExists ? "exists" : "create"}`);
  }

  const newUserId = created.user.id;

  // The handle_new_user trigger will have already created the profile row.
  // Now update it with the chosen plan (using service role so RLS is bypassed).
  await adminSupabase
    .from("profiles")
    .update({
      plan_slug: planSlug,
      acquisition_source: "admin_created",
    })
    .eq("user_id", newUserId);

  // Log admin action in subscription_events (trigger may also have logged tenant_created)
  await adminSupabase.from("subscription_events").insert({
    tenant_user_id: newUserId,
    event_type: "plan_changed",
    old_value: "free",
    new_value: planSlug,
    metadata: {
      created_by_admin: adminUser.id,
      note: "Plano definido na criação pelo admin",
    },
    created_by: adminUser.id,
  });

  revalidatePath("/admin/tenants");
  redirect("/admin/tenants?ok=tenant_created");
}
