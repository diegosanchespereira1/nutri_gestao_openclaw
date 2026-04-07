"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type {
  ExternalPortalUser,
  ExternalPortalUserRole,
  ExternalAccessPermissions,
  GuardianRelationship,
  PatientParentalConsent,
} from "@/lib/types/external-portal";
import { LGPD_CONSENT_TEXT_TEMPLATE } from "@/lib/types/external-portal";

function isValidRole(v: string): v is ExternalPortalUserRole {
  return ["viewer", "guardian"].includes(v);
}

function isValidRelationship(v: string): v is GuardianRelationship {
  return ["parent", "legal_guardian", "other"].includes(v);
}

// ── Story 9.1 — Utilizadores externos ────────────────────────────────────────

export async function loadExternalPortalUsers(): Promise<{
  rows: ExternalPortalUser[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("external_portal_users")
    .select(
      "id, owner_user_id, email, full_name, role, patient_id, is_active, last_access_at, created_at",
    )
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return { rows: [] };
  return { rows: data as ExternalPortalUser[] };
}

export async function inviteExternalUserAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "viewer");
  const patientId = String(formData.get("patient_id") ?? "").trim() || null;

  if (!email || !fullName || !isValidRole(roleRaw)) {
    redirect("/equipe?portalErr=invalid");
  }

  // Verify patient belongs to tenant if provided
  if (patientId) {
    const { data: patientOk } = await supabase
      .from("patients")
      .select("id")
      .eq("id", patientId)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (!patientOk) redirect("/equipe?portalErr=patient");
  }

  // Generate a simple magic link token (UUID-based)
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const { error } = await supabase.from("external_portal_users").upsert(
    {
      owner_user_id: user.id,
      email,
      full_name: fullName,
      role: roleRaw,
      patient_id: patientId,
      magic_link_token: token,
      magic_link_expires_at: expiresAt.toISOString(),
      is_active: true,
    },
    { onConflict: "owner_user_id,email" },
  );

  if (error) redirect("/equipe?portalErr=save");

  revalidatePath("/equipe");
  redirect("/equipe?portalOk=invited");
}

export async function revokeExternalUserAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const externalUserId = String(formData.get("external_user_id") ?? "").trim();
  if (!externalUserId) redirect("/equipe?portalErr=invalid");

  const { error } = await supabase
    .from("external_portal_users")
    .update({ is_active: false, magic_link_token: null })
    .eq("id", externalUserId)
    .eq("owner_user_id", user.id);

  if (error) redirect("/equipe?portalErr=save");

  revalidatePath("/equipe");
  redirect("/equipe");
}

// ── Story 9.2 — Permissões por categoria de dado ──────────────────────────────

export async function loadPermissionsByExternalUser(
  externalUserId: string,
): Promise<{ rows: ExternalAccessPermissions[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("external_access_permissions")
    .select("*")
    .eq("owner_user_id", user.id)
    .eq("external_user_id", externalUserId);

  if (error || !data) return { rows: [] };
  return { rows: data as ExternalAccessPermissions[] };
}

export async function upsertExternalPermissionsAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const externalUserId = String(formData.get("external_user_id") ?? "").trim();
  const patientId = String(formData.get("patient_id") ?? "").trim();

  if (!externalUserId || !patientId) redirect("/equipe?portalErr=invalid");

  // Verify the external user belongs to this tenant
  const { data: extUserOk } = await supabase
    .from("external_portal_users")
    .select("id")
    .eq("id", externalUserId)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!extUserOk) redirect("/equipe?portalErr=unauthorized");

  const { error } = await supabase
    .from("external_access_permissions")
    .upsert(
      {
        owner_user_id: user.id,
        external_user_id: externalUserId,
        patient_id: patientId,
        can_view_reports: formData.get("can_view_reports") === "on",
        can_view_measurements: formData.get("can_view_measurements") === "on",
        can_view_exams: formData.get("can_view_exams") === "on",
        can_view_nutrition_plan: formData.get("can_view_nutrition_plan") === "on",
      },
      { onConflict: "external_user_id,patient_id" },
    );

  if (error) redirect("/equipe?portalErr=save");

  revalidatePath("/equipe");
  redirect("/equipe?portalOk=permissions");
}

// ── Story 9.4 — Consentimento parental (menores LGPD Art. 14) ────────────────

export async function loadConsentsByPatient(patientId: string): Promise<{
  rows: PatientParentalConsent[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("patient_parental_consents")
    .select("*")
    .eq("owner_user_id", user.id)
    .eq("patient_id", patientId)
    .order("consented_at", { ascending: false });

  if (error || !data) return { rows: [] };
  return { rows: data as PatientParentalConsent[] };
}

export async function recordParentalConsentAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const patientId = String(formData.get("patient_id") ?? "").trim();
  const guardianFullName = String(formData.get("guardian_full_name") ?? "").trim();
  const guardianDocumentId =
    String(formData.get("guardian_document_id") ?? "").trim() || null;
  const relationshipRaw = String(formData.get("guardian_relationship") ?? "");
  const guardianEmail =
    String(formData.get("guardian_email") ?? "").trim() || null;
  const confirmed = formData.get("consent_confirmed") === "on";

  if (
    !patientId ||
    !guardianFullName ||
    !isValidRelationship(relationshipRaw) ||
    !confirmed
  ) {
    redirect(`/pacientes/${patientId}?consentErr=invalid`);
  }

  // Verify patient belongs to tenant
  const { data: patientOk } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!patientOk) redirect(`/pacientes/${patientId}?consentErr=unauthorized`);

  const { error } = await supabase
    .from("patient_parental_consents")
    .insert({
      owner_user_id: user.id,
      patient_id: patientId,
      guardian_full_name: guardianFullName,
      guardian_document_id: guardianDocumentId,
      guardian_relationship: relationshipRaw,
      guardian_email: guardianEmail,
      consent_text: LGPD_CONSENT_TEXT_TEMPLATE,
    });

  if (error) redirect(`/pacientes/${patientId}?consentErr=save`);

  revalidatePath(`/pacientes/${patientId}`);
  redirect(`/pacientes/${patientId}?consentOk=1`);
}

export async function revokeParentalConsentAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const consentId = String(formData.get("consent_id") ?? "").trim();
  const patientId = String(formData.get("patient_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!consentId || !patientId) {
    redirect(`/pacientes/${patientId}?consentErr=invalid`);
  }

  const { error } = await supabase
    .from("patient_parental_consents")
    .update({
      revoked_at: new Date().toISOString(),
      revocation_reason: reason || "Revogado pelo profissional.",
    })
    .eq("id", consentId)
    .eq("owner_user_id", user.id)
    .is("revoked_at", null);

  if (error) redirect(`/pacientes/${patientId}?consentErr=save`);

  revalidatePath(`/pacientes/${patientId}`);
  redirect(`/pacientes/${patientId}`);
}
