"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseVisitPriority } from "@/lib/constants/visit-priorities";
import { parseVisitKind } from "@/lib/constants/visit-kinds";
import { localDateTimeInTimeZoneToUtcIso } from "@/lib/datetime/local-datetime-tz";
import type { ProfileRole } from "@/lib/roles";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import type { VisitTargetType } from "@/lib/types/visits";
import {
  canCancelScheduledVisit,
  canManageScheduledVisit,
  resolveAssignedTeamMemberIdOnCreate,
} from "@/lib/visits/agenda-access";
import { parseDossierRecipientEmailsFromText } from "@/lib/validators/dossier-email-recipients";

function parseTargetType(raw: unknown): VisitTargetType | null {
  if (raw === "establishment" || raw === "patient") return raw;
  return null;
}

export async function createScheduledVisitAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const targetType = parseTargetType(formData.get("target_type"));
  const establishmentId = String(
    formData.get("establishment_id") ?? "",
  ).trim();
  const patientId = String(formData.get("patient_id") ?? "").trim();
  const localRaw = String(formData.get("scheduled_start_local") ?? "").trim();
  let scheduledIso = String(formData.get("scheduled_start_iso") ?? "").trim();
  if (localRaw) {
    const tz = await fetchProfileTimeZone(supabase, user.id);
    const fromProfileTz = localDateTimeInTimeZoneToUtcIso(localRaw, tz);
    if (fromProfileTz) scheduledIso = fromProfileTz;
  }
  const priority = parseVisitPriority(formData.get("priority")) ?? "normal";
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw.length > 0 ? notesRaw : null;
  const dossierEmailsRaw = String(
    formData.get("dossier_recipient_emails") ?? "",
  ).trim();
  let dossier_recipient_emails: string[] = [];
  if (dossierEmailsRaw.length > 0) {
    const parsed = parseDossierRecipientEmailsFromText(dossierEmailsRaw);
    if (!parsed.ok) {
      redirect("/visitas/nova?err=dossier_email");
    }
    dossier_recipient_emails = parsed.emails;
  }
  const visitKind = parseVisitKind(formData.get("visit_kind"));
  const assignRaw = String(
    formData.get("assigned_team_member_id") ?? "",
  ).trim();
  const assignedTeamMemberId = await resolveAssignedTeamMemberIdOnCreate(
    supabase,
    user.id,
    workspaceOwnerId,
    assignRaw,
  );

  if (!targetType || !scheduledIso || !visitKind) {
    redirect("/visitas/nova?err=missing");
  }

  const start = new Date(scheduledIso);
  if (Number.isNaN(start.getTime())) {
    redirect("/visitas/nova?err=date");
  }

  if (targetType === "establishment" && !establishmentId) {
    redirect("/visitas/nova?err=missing");
  }
  if (targetType === "patient" && !patientId) {
    redirect("/visitas/nova?err=missing");
  }

  if (targetType === "establishment") {
    const { data: est, error: estErr } = await supabase
      .from("establishments")
      .select("id, clients(lifecycle_status, owner_user_id)")
      .eq("id", establishmentId)
      .maybeSingle();

    const c = est?.clients as
      | { lifecycle_status: string; owner_user_id: string }
      | { lifecycle_status: string; owner_user_id: string }[]
      | null
      | undefined;
    const client = Array.isArray(c) ? c[0] : c;

    if (
      estErr ||
      !est ||
      !client ||
      client.owner_user_id !== workspaceOwnerId
    ) {
      redirect("/visitas/nova?err=missing");
    }
    if (client.lifecycle_status === "inativo") {
      redirect("/visitas/nova?err=client_inativo");
    }
    if (client.lifecycle_status === "finalizado") {
      redirect("/visitas/nova?err=client_finalizado");
    }
  }

  if (targetType === "patient") {
    const { data: pat, error: patErr } = await supabase
      .from("patients")
      .select("id, clients(lifecycle_status, owner_user_id)")
      .eq("id", patientId)
      .maybeSingle();

    const c = pat?.clients as
      | { lifecycle_status: string; owner_user_id: string }
      | { lifecycle_status: string; owner_user_id: string }[]
      | null
      | undefined;
    const client = Array.isArray(c) ? c[0] : c;

    if (
      patErr ||
      !pat ||
      !client ||
      client.owner_user_id !== workspaceOwnerId
    ) {
      redirect("/visitas/nova?err=missing");
    }
    if (client.lifecycle_status === "inativo") {
      redirect("/visitas/nova?err=client_inativo");
    }
    if (client.lifecycle_status === "finalizado") {
      redirect("/visitas/nova?err=client_finalizado");
    }
  }

  const insertRow = {
    user_id: user.id,
    target_type: targetType,
    establishment_id: targetType === "establishment" ? establishmentId : null,
    patient_id: targetType === "patient" ? patientId : null,
    scheduled_start: start.toISOString(),
    priority,
    status: "scheduled" as const,
    visit_kind: visitKind,
    assigned_team_member_id: assignedTeamMemberId,
    notes,
    dossier_recipient_emails,
  };

  const { data: created, error } = await supabase
    .from("scheduled_visits")
    .insert(insertRow)
    .select("id")
    .single();

  if (error || !created) {
    redirect("/visitas/nova?err=save");
  }

  revalidatePath("/visitas");
  revalidatePath("/inicio");
  revalidatePath(`/visitas/${created.id as string}`);
  redirect(`/visitas/${created.id as string}`);
}

export type CreateVisitDialogResult =
  | { ok: true; visitId: string }
  | { ok: false; error: string };

export async function createVisitDialogAction(
  _prev: CreateVisitDialogResult | null,
  formData: FormData,
): Promise<CreateVisitDialogResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const targetType = parseTargetType(formData.get("target_type"));
  if (!targetType) return { ok: false, error: "Selecione o destino da visita." };

  const establishmentId = String(formData.get("establishment_id") ?? "").trim();
  const patientId = String(formData.get("patient_id") ?? "").trim();

  if (targetType === "establishment" && !establishmentId) {
    return { ok: false, error: "Selecione um estabelecimento." };
  }
  if (targetType === "patient" && !patientId) {
    return { ok: false, error: "Selecione um paciente." };
  }

  const localRaw = String(formData.get("scheduled_start_local") ?? "").trim();
  let scheduledIso = String(formData.get("scheduled_start_iso") ?? "").trim();
  if (localRaw) {
    const tz = await fetchProfileTimeZone(supabase, user.id);
    const converted = localDateTimeInTimeZoneToUtcIso(localRaw, tz);
    if (converted) scheduledIso = converted;
  }
  if (!scheduledIso) return { ok: false, error: "Data e hora são obrigatórias." };

  const start = new Date(scheduledIso);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "Data ou hora inválida." };

  const visitKind = parseVisitKind(formData.get("visit_kind"));
  if (!visitKind) return { ok: false, error: "Selecione o tipo de visita." };

  const priority = parseVisitPriority(formData.get("priority")) ?? "normal";
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw.length > 0 ? notesRaw : null;

  const dossierEmailsRaw = String(formData.get("dossier_recipient_emails") ?? "").trim();
  let dossier_recipient_emails: string[] = [];
  if (dossierEmailsRaw.length > 0) {
    const parsed = parseDossierRecipientEmailsFromText(dossierEmailsRaw);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    dossier_recipient_emails = parsed.emails;
  }

  const assignRaw = String(formData.get("assigned_team_member_id") ?? "").trim();
  const assignedTeamMemberId = await resolveAssignedTeamMemberIdOnCreate(
    supabase,
    user.id,
    workspaceOwnerId,
    assignRaw,
  );

  if (targetType === "establishment") {
    const { data: est } = await supabase
      .from("establishments")
      .select("id, clients(lifecycle_status, owner_user_id)")
      .eq("id", establishmentId)
      .maybeSingle();
    const c = est?.clients as { lifecycle_status: string; owner_user_id: string } | { lifecycle_status: string; owner_user_id: string }[] | null | undefined;
    const client = Array.isArray(c) ? c[0] : c;
    if (!est || !client || client.owner_user_id !== workspaceOwnerId) {
      return { ok: false, error: "Estabelecimento não encontrado." };
    }
    if (client.lifecycle_status === "inativo") {
      return { ok: false, error: "Cliente inativo — reative o contrato para agendar visitas." };
    }
    if (client.lifecycle_status === "finalizado") {
      return { ok: false, error: "Contrato finalizado — reative para agendar novas visitas." };
    }
  }

  if (targetType === "patient") {
    const { data: pat } = await supabase
      .from("patients")
      .select("id, clients(lifecycle_status, owner_user_id)")
      .eq("id", patientId)
      .maybeSingle();
    const c = pat?.clients as { lifecycle_status: string; owner_user_id: string } | { lifecycle_status: string; owner_user_id: string }[] | null | undefined;
    const client = Array.isArray(c) ? c[0] : c;
    if (!pat || !client || client.owner_user_id !== workspaceOwnerId) {
      return { ok: false, error: "Paciente não encontrado." };
    }
    if (client.lifecycle_status === "inativo") {
      return { ok: false, error: "Cliente inativo — reative o contrato para agendar visitas." };
    }
    if (client.lifecycle_status === "finalizado") {
      return { ok: false, error: "Contrato finalizado — reative para agendar novas visitas." };
    }
  }

  const { data: created, error } = await supabase
    .from("scheduled_visits")
    .insert({
      user_id: user.id,
      target_type: targetType,
      establishment_id: targetType === "establishment" ? establishmentId : null,
      patient_id: targetType === "patient" ? patientId : null,
      scheduled_start: start.toISOString(),
      priority,
      status: "scheduled" as const,
      visit_kind: visitKind,
      assigned_team_member_id: assignedTeamMemberId,
      notes,
      dossier_recipient_emails,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[createVisitDialogAction] insert failed:", error?.message, error?.code);
    return { ok: false, error: "Não foi possível guardar. Tente novamente." };
  }

  revalidatePath("/visitas");
  revalidatePath("/inicio");
  revalidatePath(`/visitas/${created.id as string}`);
  return { ok: true, visitId: created.id as string };
}

export type RescheduleVisitResult = { ok: true } | { ok: false; error: string };

export async function rescheduleVisitAction(
  visitId: string,
  newScheduledStart: string,
): Promise<RescheduleVisitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: visit } = await supabase
    .from("scheduled_visits")
    .select("id, user_id, assigned_team_member_id")
    .eq("id", visitId)
    .maybeSingle();

  const canManage = visit
    ? await canManageScheduledVisit({
        supabase,
        authUserId: user.id,
        workspaceOwnerId,
        role: (profile?.role as ProfileRole | null | undefined) ?? null,
        visit: {
          user_id: visit.user_id as string,
          assigned_team_member_id: visit.assigned_team_member_id as string | null,
        },
      })
    : false;

  if (!visit || !canManage) {
    return { ok: false, error: "Visita não encontrada." };
  }

  const { error } = await supabase
    .from("scheduled_visits")
    .update({ scheduled_start: newScheduledStart })
    .eq("id", visitId);

  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidatePath("/visitas");
  revalidatePath("/inicio");
  return { ok: true };
}

export type CancelVisitResult = { ok: true } | { ok: false; error: string };

export async function cancelVisitAction(
  visitId: string,
): Promise<CancelVisitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (profile?.role as ProfileRole | null | undefined) ?? null;

  const { data: visit } = await supabase
    .from("scheduled_visits")
    .select("id, user_id, status")
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) {
    return { ok: false, error: "Visita não encontrada." };
  }

  if (
    !canCancelScheduledVisit(user.id, workspaceOwnerId, role, {
      user_id: visit.user_id as string,
    })
  ) {
    return { ok: false, error: "Sem permissão para cancelar esta visita." };
  }

  if (visit.status === "cancelled") {
    return { ok: false, error: "Esta visita já está cancelada." };
  }

  if (visit.status === "completed") {
    return { ok: false, error: "Visitas concluídas não podem ser canceladas." };
  }

  const { error } = await supabase
    .from("scheduled_visits")
    .update({ status: "cancelled" })
    .eq("id", visitId);

  if (error) {
    console.error("[cancelVisitAction]", error.message);
    return { ok: false, error: "Não foi possível cancelar a visita." };
  }

  revalidatePath("/visitas");
  revalidatePath("/inicio");
  revalidatePath(`/visitas/${visitId}`);
  return { ok: true };
}

export type UpdateDossierRecipientsState =
  | { ok: true }
  | { ok: false; error: string };

/** Atualiza destinatários de email do dossiê (ficha da visita). */
export async function updateScheduledVisitDossierRecipientsFormAction(
  _prev: UpdateDossierRecipientsState | null,
  formData: FormData,
): Promise<UpdateDossierRecipientsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const visitId = String(formData.get("visit_id") ?? "").trim();
  if (!visitId) return { ok: false, error: "Visita inválida." };

  const raw = String(formData.get("dossier_recipient_emails") ?? "").trim();
  const parsed =
    raw.length === 0
      ? ({ ok: true as const, emails: [] as string[] })
      : parseDossierRecipientEmailsFromText(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { data: v } = await supabase
    .from("scheduled_visits")
    .select("id")
    .eq("id", visitId)
    .maybeSingle();

  if (!v) return { ok: false, error: "Visita não encontrada." };

  const { error } = await supabase
    .from("scheduled_visits")
    .update({ dossier_recipient_emails: parsed.emails })
    .eq("id", visitId);

  if (error) return { ok: false, error: "Não foi possível salvar." };

  revalidatePath(`/visitas/${visitId}`);
  revalidatePath("/visitas");
  revalidatePath("/inicio");
  return { ok: true };
}
