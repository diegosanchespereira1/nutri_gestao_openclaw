"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseVisitPriority } from "@/lib/constants/visit-priorities";
import { parseVisitKind } from "@/lib/constants/visit-kinds";
import { createClient } from "@/lib/supabase/server";
import type { ScheduledVisitWithTargets, VisitTargetType } from "@/lib/types/visits";

function parseTargetType(raw: unknown): VisitTargetType | null {
  if (raw === "establishment" || raw === "patient") return raw;
  return null;
}

export async function loadScheduledVisitsForOwner(): Promise<{
  rows: ScheduledVisitWithTargets[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] };

  const { data, error } = await supabase
    .from("scheduled_visits")
    .select(
      `
      *,
      establishments ( id, name, client_id ),
      patients ( id, full_name ),
      team_members ( id, full_name, job_role )
    `,
    )
    .eq("user_id", user.id)
    .order("scheduled_start", { ascending: true });

  if (error || !data) return { rows: [] };
  return { rows: data as unknown as ScheduledVisitWithTargets[] };
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
      establishments ( id, name, client_id ),
      patients ( id, full_name ),
      team_members ( id, full_name, job_role )
    `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
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

  const targetType = parseTargetType(formData.get("target_type"));
  const establishmentId = String(
    formData.get("establishment_id") ?? "",
  ).trim();
  const patientId = String(formData.get("patient_id") ?? "").trim();
  const scheduledIso = String(
    formData.get("scheduled_start_iso") ?? "",
  ).trim();
  const priority = parseVisitPriority(formData.get("priority")) ?? "normal";
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw.length > 0 ? notesRaw : null;
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
      client.owner_user_id !== user.id
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
      client.owner_user_id !== user.id
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
