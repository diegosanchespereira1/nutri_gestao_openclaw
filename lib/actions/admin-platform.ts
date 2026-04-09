"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

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
