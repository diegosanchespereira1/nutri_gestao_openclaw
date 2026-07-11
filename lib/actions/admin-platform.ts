"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/supabase/service-role";
import { sendPasswordRecoveryViaSupabase } from "@/lib/email/send-supabase-auth-email";
import {
  readSupabaseServiceRoleKey,
  readSupabaseUrl,
} from "@/lib/supabase/runtime-env";
import { DEFAULT_PROFILE_TIME_ZONE } from "@/lib/timezones";
import { buildTenantCapabilities } from "@/lib/admin/tenant-capabilities";
import type { TenantCapabilityItem } from "@/lib/admin/tenant-capabilities";
import {
  getPlanFeatureDefaults,
  isTenantFeatureKey,
  parseTenantFeatureOverridesFromForm,
  type TenantFeatureKey,
} from "@/lib/constants/tenant-features";
import {
  hasAnyModuleEnabled,
  parseEnabledModulesFromForm,
} from "@/lib/types/modules";
import type { TeamJobRole } from "@/lib/types/team-members";

type AdminDb = SupabaseClient;

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

/** Service role quando disponível; senão cliente autenticado (requer RLS super_admin em profiles). */
async function requireSuperAdminDb(): Promise<{
  db: AdminDb;
  user: Awaited<ReturnType<typeof requireSuperAdmin>>["user"];
  authClient: Awaited<ReturnType<typeof createClient>>;
}> {
  const { supabase: authClient, user } = await requireSuperAdmin();
  const serviceKey = readSupabaseServiceRoleKey();
  const url = readSupabaseUrl();
  if (serviceKey && url) {
    return {
      db: createSupabaseClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
      user,
      authClient,
    };
  }
  return { db: authClient, user, authClient };
}

type AdminSubscriptionEventType =
  | "plan_changed"
  | "suspended"
  | "unsuspended"
  | "tenant_unblocked_lgpd";

async function recordAdminTenantEvent(
  supabase: AdminDb,
  params: {
    tenantUserId: string;
    eventType: AdminSubscriptionEventType;
    oldValue?: string | null;
    newValue?: string | null;
    metadata?: Record<string, unknown>;
    createdBy: string;
  },
): Promise<void> {
  await supabase.from("subscription_events").insert({
    tenant_user_id: params.tenantUserId,
    event_type: params.eventType,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
    metadata: { admin_action: true, ...params.metadata },
    created_by: params.createdBy,
  });
}

async function resolveTenantUserId(
  supabase: AdminDb,
  profileId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .not("role", "in", '("admin","super_admin")')
    .maybeSingle();
  return data?.user_id ?? null;
}

// ── 10.1 — Gestão de tenants ──────────────────────────────────────────────────

export type TenantRow = {
  id: string;
  user_id: string;
  full_name: string | null;
  plan_slug: string;
  is_suspended: boolean;
  suspended_reason: string | null;
  plan_expires_at: string | null;
  created_at: string;
  lgpd_blocked_at: string | null;
  lgpd_unblocked_at: string | null;
  modules: TenantCapabilityItem[];
  features: TenantCapabilityItem[];
};

export async function loadTenants(search?: string): Promise<{
  rows: TenantRow[];
}> {
  const { supabase } = await requireSuperAdmin();

  let query = supabase
    .from("profiles")
    .select(
      "id, user_id, full_name, plan_slug, is_suspended, suspended_reason, plan_expires_at, created_at, lgpd_blocked_at, lgpd_unblocked_at, enabled_modules",
    )
    .not("role", "in", '("admin","super_admin")')
    .or("acquisition_source.is.null,acquisition_source.neq.team_member")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  const [{ data, error }, { data: plans }] = await Promise.all([
    query,
    supabase
      .from("subscription_plans")
      .select(
        "slug, feature_portal_externo, feature_pdf_export, feature_csv_import, feature_api_access",
      ),
  ]);

  if (error) {
    console.error("[loadTenants]", error.message);
    return { rows: [] };
  }
  if (!data) return { rows: [] };

  const plansBySlug = Object.fromEntries(
    (plans ?? []).map((plan) => [plan.slug, getPlanFeatureDefaults(plan)]),
  );

  const userIds = data
    .map((row) => row.user_id)
    .filter((id): id is string => typeof id === "string");

  const overridesByUser = new Map<string, Partial<Record<TenantFeatureKey, boolean>>>();

  if (userIds.length > 0) {
    const { data: overrides } = await supabase
      .from("tenant_feature_overrides")
      .select("tenant_user_id, feature_key, enabled")
      .in("tenant_user_id", userIds);

    for (const override of overrides ?? []) {
      if (
        typeof override.tenant_user_id !== "string" ||
        typeof override.feature_key !== "string" ||
        !isTenantFeatureKey(override.feature_key)
      ) {
        continue;
      }

      const bucket =
        overridesByUser.get(override.tenant_user_id) ??
        ({} as Partial<Record<TenantFeatureKey, boolean>>);
      bucket[override.feature_key] = Boolean(override.enabled);
      overridesByUser.set(override.tenant_user_id, bucket);
    }
  }

  return {
    rows: data.map((row) => {
      const userId = String(row.user_id);
      const capabilities = buildTenantCapabilities({
        enabledModulesRaw: (row as Record<string, unknown>).enabled_modules,
        planSlug: row.plan_slug,
        plansBySlug,
        overridesByKey: overridesByUser.get(userId) ?? {},
      });

      return {
        id: row.id,
        user_id: userId,
        full_name: row.full_name,
        plan_slug: row.plan_slug,
        is_suspended: row.is_suspended,
        suspended_reason: row.suspended_reason,
        plan_expires_at: row.plan_expires_at,
        created_at: row.created_at,
        lgpd_blocked_at: row.lgpd_blocked_at,
        lgpd_unblocked_at: row.lgpd_unblocked_at,
        modules: capabilities.modules,
        features: capabilities.features,
      };
    }),
  };
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
  const { supabase, user } = await requireSuperAdmin();

  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  const planSlug = String(formData.get("plan_slug") ?? "").trim();
  const expiresAt = String(formData.get("plan_expires_at") ?? "").trim() || null;

  if (!tenantId || !planSlug) redirect("/admin/tenants?err=invalid");

  const tenantUserId = await resolveTenantUserId(supabase, tenantId);
  if (!tenantUserId) redirect("/admin/tenants?err=invalid");

  const { data: before } = await supabase
    .from("profiles")
    .select("plan_slug, plan_expires_at")
    .eq("id", tenantId)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update({
      plan_slug: planSlug,
      plan_expires_at: expiresAt ?? null,
    })
    .eq("id", tenantId);

  if (error) redirect("/admin/tenants?err=save");

  const planSlugChanged = before?.plan_slug !== planSlug;
  const expiresChanged =
    (before?.plan_expires_at ?? null) !== (expiresAt ?? null);

  if (expiresChanged && !planSlugChanged) {
    await recordAdminTenantEvent(supabase, {
      tenantUserId,
      eventType: "plan_changed",
      oldValue: before?.plan_slug ?? null,
      newValue: planSlug,
      metadata: {
        old_plan_expires_at: before?.plan_expires_at ?? null,
        new_plan_expires_at: expiresAt,
        plan_expires_only: true,
      },
      createdBy: user.id,
    });
  }

  revalidatePath("/admin/tenants");
  redirect("/admin/tenants?ok=plan_updated");
}

export async function unblockLgpdTenantAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireSuperAdmin();

  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  if (!tenantId) redirect("/admin/tenants?err=invalid");

  const tenantUserId = await resolveTenantUserId(supabase, tenantId);
  if (!tenantUserId) redirect("/admin/tenants?err=invalid");

  const { data, error } = await supabase.rpc("lgpd_admin_unblock_profile", {
    p_profile_id: tenantId,
  });

  if (error) redirect("/admin/tenants?err=save");

  await recordAdminTenantEvent(supabase, {
    tenantUserId,
    eventType: "tenant_unblocked_lgpd",
    metadata: { profile_id: tenantId },
    createdBy: user.id,
  });

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

  const { data, error } = await supabase.rpc("get_admin_platform_metrics");

  if (error) {
    console.error("[loadPlatformMetrics]", error.message);
    return { metrics: null };
  }
  if (!data || typeof data !== "object") return { metrics: null };
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

export type TenantTeamMemberRow = {
  id: string;
  member_user_id: string | null;
  full_name: string;
  email: string | null;
  job_role: TeamJobRole;
  is_active: boolean;
  created_at: string;
};

export type TenantCockpitData = {
  profile: TenantDetailProfile;
  loginEmail: string | null;
  events: SubscriptionEvent[];
  overrides: TenantFeatureOverride[];
  notes: AdminTenantNote[];
  plans: SubscriptionPlan[];
  teamMembers: TenantTeamMemberRow[];
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
  const { db, authClient } = await requireSuperAdminDb();

  // Perfil e dados com RLS super_admin usam cliente autenticado.
  const { data: profile, error: profileErr } = await authClient
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
    teamMembersResult,
  ] = await Promise.all([
    authClient
      .from("subscription_events")
      .select("id, event_type, old_value, new_value, metadata, created_at, created_by")
      .eq("tenant_user_id", tenantUserId)
      .order("created_at", { ascending: false })
      .limit(20),
    authClient
      .from("tenant_feature_overrides")
      .select("id, feature_key, enabled, reason, updated_at")
      .eq("tenant_user_id", tenantUserId)
      .order("feature_key"),
    authClient
      .from("admin_tenant_notes")
      .select("id, body, created_by, created_at, updated_at")
      .eq("tenant_user_id", tenantUserId)
      .order("created_at", { ascending: false }),
    authClient
      .from("subscription_plans")
      .select("id, name, slug, description, price_monthly_cents, price_annual_cents, max_clients, max_establishments, max_team_members, max_patients, max_storage_mb, feature_portal_externo, feature_pdf_export, feature_csv_import, feature_api_access, is_active")
      .order("price_monthly_cents"),
    db
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", tenantUserId),
    db
      .from("establishments")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", tenantUserId),
    db
      .from("scheduled_visits")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", tenantUserId),
    db
      .from("technical_recipes")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", tenantUserId),
    db
      .from("api_tokens")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", tenantUserId)
      .is("revoked_at", null),
    db
      .from("team_members")
      .select("id, member_user_id, full_name, email, job_role, is_active, created_at")
      .eq("owner_user_id", tenantUserId)
      .order("full_name", { ascending: true }),
  ]);

  // E-mail de login do titular — só disponível em auth.users (não em profiles),
  // por isso exige service role. Sem service role configurado, fica "—" no cockpit.
  let loginEmail: string | null = null;
  if (isServiceRoleConfigured()) {
    try {
      const { data: authUser, error: authUserErr } =
        await db.auth.admin.getUserById(tenantUserId);
      if (!authUserErr) {
        loginEmail = authUser.user?.email ?? null;
      }
    } catch (e) {
      console.error("[loadTenantCockpitData] getUserById falhou", {
        tenantUserId,
        error: e instanceof Error ? e.message : e,
      });
    }
  }

  return {
    data: {
      profile: profile as TenantDetailProfile,
      loginEmail,
      events: (eventsResult.data ?? []) as SubscriptionEvent[],
      overrides: (overridesResult.data ?? []) as TenantFeatureOverride[],
      notes: (notesResult.data ?? []) as AdminTenantNote[],
      plans: (plansResult.data ?? []) as SubscriptionPlan[],
      teamMembers: (teamMembersResult.data ?? []) as TenantTeamMemberRow[],
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

/**
 * Ativa/desativa o acesso de um membro da equipe a partir do cockpit.
 * - Desativar: bane o usuário em auth.users (banned_until) — a senha atual
 *   deixa de funcionar imediatamente, mesmo mecanismo do bloqueio LGPD.
 * - Reativar: desbane, troca a senha por uma aleatória (invalida a senha
 *   antiga) e envia email de redefinição de senha.
 */
export async function toggleTeamMemberActiveAction(
  formData: FormData,
): Promise<void> {
  await requireSuperAdmin();

  const memberId = String(formData.get("member_id") ?? "").trim();
  const profileId = String(formData.get("profile_id") ?? "").trim();
  const activate = formData.get("activate") === "true";

  if (!memberId) redirect(`/admin/tenants/${profileId}?err=invalid`);

  if (!isServiceRoleConfigured()) {
    redirect(`/admin/tenants/${profileId}?err=server_config`);
  }

  const service = createServiceRoleClient();

  const { data: member, error: memberErr } = await service
    .from("team_members")
    .select("id, member_user_id, email, full_name")
    .eq("id", memberId)
    .maybeSingle();

  if (memberErr || !member) {
    redirect(`/admin/tenants/${profileId}?err=invalid`);
  }

  const memberUserId = member.member_user_id as string | null;

  if (activate) {
    if (memberUserId) {
      const randomPassword = crypto.randomUUID().replace(/-/g, "");
      const { error: authErr } = await service.auth.admin.updateUserById(
        memberUserId,
        { ban_duration: "none", password: randomPassword },
      );
      if (authErr) {
        console.error("[toggleTeamMemberActiveAction] unban falhou", {
          memberId,
          memberUserId,
          message: authErr.message,
        });
        redirect(`/admin/tenants/${profileId}?err=save`);
      }
      const email = member.email as string | null;
      if (email) {
        const sent = await sendPasswordRecoveryViaSupabase(service, email);
        if (!sent.ok) {
          console.error(
            "[toggleTeamMemberActiveAction] email de redefinição falhou",
            { memberId, email, error: sent.error },
          );
        }
      }
    }

    const { error } = await service
      .from("team_members")
      .update({ is_active: true })
      .eq("id", memberId);
    if (error) redirect(`/admin/tenants/${profileId}?err=save`);

    revalidatePath(`/admin/tenants/${profileId}`);
    redirect(`/admin/tenants/${profileId}?ok=member_activated`);
  }

  if (memberUserId) {
    const { error: authErr } = await service.auth.admin.updateUserById(
      memberUserId,
      { ban_duration: "876000h" },
    );
    if (authErr) {
      console.error("[toggleTeamMemberActiveAction] ban falhou", {
        memberId,
        memberUserId,
        message: authErr.message,
      });
      redirect(`/admin/tenants/${profileId}?err=save`);
    }
  }

  const { error } = await service
    .from("team_members")
    .update({ is_active: false })
    .eq("id", memberId);
  if (error) redirect(`/admin/tenants/${profileId}?err=save`);

  revalidatePath(`/admin/tenants/${profileId}`);
  redirect(`/admin/tenants/${profileId}?ok=member_deactivated`);
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

  const enabledModules = parseEnabledModulesFromForm(formData);
  if (!hasAnyModuleEnabled(enabledModules)) {
    redirect("/admin/tenants/novo?err=modules");
  }

  if (!isServiceRoleConfigured()) {
    redirect("/admin/tenants/novo?err=server_config");
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
      // Conta criada pelo admin deve permitir login imediato; convite é só email.
      email_confirm: true,
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

  // Self-hosted pode não ter o trigger on_auth_user_created; garantir perfil sempre.
  const { error: profileErr } = await adminSupabase.from("profiles").upsert(
    {
      user_id: newUserId,
      full_name: fullName,
      tenant_name: fullName,
      plan_slug: planSlug,
      acquisition_source: "admin_created",
      timezone: DEFAULT_PROFILE_TIME_ZONE,
      enabled_modules: enabledModules,
    },
    { onConflict: "user_id" },
  );

  if (profileErr) {
    console.error("[createTenantAsAdminAction] profile upsert:", profileErr.message);
    redirect("/admin/tenants/novo?err=create");
  }

  await adminSupabase.from("subscription_events").insert({
    tenant_user_id: newUserId,
    event_type: "tenant_created",
    new_value: "admin_created",
    metadata: {
      email,
      acquisition_source: "admin_created",
      created_by_admin: adminUser.id,
    },
    created_by: adminUser.id,
  });

  // Log admin action in subscription_events (plano na criação)
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

  const featureOverrides = parseTenantFeatureOverridesFromForm(formData);
  if (featureOverrides.length > 0) {
    const { error: overridesErr } = await adminSupabase
      .from("tenant_feature_overrides")
      .upsert(
        featureOverrides.map((override) => ({
          tenant_user_id: newUserId,
          feature_key: override.feature_key,
          enabled: override.enabled,
          reason: "Definido na criação pelo admin",
          updated_by: adminUser.id,
        })),
        { onConflict: "tenant_user_id,feature_key" },
      );

    if (overridesErr) {
      console.error(
        "[createTenantAsAdminAction] feature overrides:",
        overridesErr.message,
      );
      redirect("/admin/tenants/novo?err=create");
    }

    for (const override of featureOverrides) {
      await adminSupabase.from("subscription_events").insert({
        tenant_user_id: newUserId,
        event_type: "feature_override_set",
        new_value: override.enabled ? "enabled" : "disabled",
        metadata: {
          feature_key: override.feature_key,
          created_by_admin: adminUser.id,
          note: "Override definido na criação pelo admin",
        },
        created_by: adminUser.id,
      });
    }
  }

  if (sendInvite) {
    const emailed = await sendPasswordRecoveryViaSupabase(adminSupabase, email);
    if (!emailed.ok) {
      console.error("[createTenantAsAdminAction] invite email:", emailed.error);
      revalidatePath("/admin/tenants");
      redirect("/admin/tenants?ok=tenant_created&email_err=send");
    }
  }

  revalidatePath("/admin/tenants");
  redirect("/admin/tenants?ok=tenant_created");
}
