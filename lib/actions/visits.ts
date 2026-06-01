"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { SupabaseClient } from "@supabase/supabase-js";

import { parseVisitPriority } from "@/lib/constants/visit-priorities";
import { parseVisitKind } from "@/lib/constants/visit-kinds";
import { localDateTimeInTimeZoneToUtcIso } from "@/lib/datetime/local-datetime-tz";
import type { ProfileRole } from "@/lib/roles";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import type { ScheduledVisitWithTargets, VisitTargetType } from "@/lib/types/visits";
import {
  canManageScheduledVisit,
  canViewAllWorkspaceVisits,
  resolveTeamMemberIdForAuthUser,
} from "@/lib/visits/agenda-access";
import { parseDossierRecipientEmailsFromText } from "@/lib/validators/dossier-email-recipients";

export const SCHEDULED_VISITS_WITH_TARGETS_SELECT = `
  *,
  establishments ( id, name, client_id, clients ( legal_name, trade_name ) ),
  patients ( id, full_name ),
  team_members ( id, full_name, job_role )
`.trim();

function defaultVisitsWindow(options?: { from?: string; to?: string }) {
  const now = new Date();
  return {
    from:
      options?.from ??
      new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() - 6,
          now.getUTCDate(),
        ),
      ).toISOString(),
    to:
      options?.to ??
      new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 90,
        ),
      ).toISOString(),
  };
}

/**
 * Visitas visíveis na agenda: titular/admin vê todas do workspace;
 * membro da equipa vê as que criou ou que lhe foram atribuídas.
 */
export async function loadScheduledVisitsForAgenda(args: {
  supabase: SupabaseClient;
  authUserId: string;
  workspaceOwnerId: string;
  role?: ProfileRole | null;
  from?: string;
  to?: string;
}): Promise<{ rows: ScheduledVisitWithTargets[] }> {
  const { from, to } = defaultVisitsWindow(args);

  let role = args.role;
  if (role === undefined) {
    const { data: profile } = await args.supabase
      .from("profiles")
      .select("role")
      .eq("user_id", args.authUserId)
      .maybeSingle();
    role = (profile?.role as ProfileRole | null | undefined) ?? null;
  }

  let query = args.supabase
    .from("scheduled_visits")
    .select(SCHEDULED_VISITS_WITH_TARGETS_SELECT)
    .gte("scheduled_start", from)
    .lte("scheduled_start", to)
    .order("scheduled_start", { ascending: true });

  if (
    !canViewAllWorkspaceVisits(
      args.authUserId,
      args.workspaceOwnerId,
      role,
    )
  ) {
    const teamMemberId = await resolveTeamMemberIdForAuthUser(
      args.supabase,
      args.authUserId,
      args.workspaceOwnerId,
    );
    if (teamMemberId) {
      query = query.or(
        `user_id.eq.${args.authUserId},assigned_team_member_id.eq.${teamMemberId}`,
      );
    } else {
      query = query.eq("user_id", args.authUserId);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error("[loadScheduledVisitsForAgenda]", error.message);
    return { rows: [] };
  }
  if (!data) return { rows: [] };
  return { rows: data as unknown as ScheduledVisitWithTargets[] };
}

function parseTargetType(raw: unknown): VisitTargetType | null {
  if (raw === "establishment" || raw === "patient") return raw;
  return null;
}

/**
 * Carrega visitas agendadas dentro de uma janela de tempo.
 * Por padrão busca 6 meses para trás + 90 dias para frente,
 * o suficiente para o dashboard (gráfico de 6 meses + agenda do dia).
 * Evita trazer o histórico completo de todos os tempos.
 */
export async function loadScheduledVisitsForOwner(options?: {
  /** Início da janela (ISO string). Default: 6 meses atrás. */
  from?: string;
  /** Fim da janela (ISO string). Default: 90 dias à frente. */
  to?: string;
}): Promise<{
  rows: ScheduledVisitWithTargets[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  return loadScheduledVisitsForAgenda({
    supabase,
    authUserId: user.id,
    workspaceOwnerId,
    from: options?.from,
    to: options?.to,
  });
}

export async function loadScheduledVisitById(
  id: string,
): Promise<{ row: ScheduledVisitWithTargets | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { row: null };

  const { data, error } = await supabase
    .from("scheduled_visits")
    .select(
      `
      *,
      establishments ( id, name, client_id, clients ( legal_name, trade_name ) ),
      patients ( id, full_name ),
      team_members ( id, full_name, job_role )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return { row: null };
  return { row: data as unknown as ScheduledVisitWithTargets };
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
  const assignedTeamMemberId = assignRaw.length > 0 ? assignRaw : null;

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
  const assignedTeamMemberId = assignRaw.length > 0 ? assignRaw : null;

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
