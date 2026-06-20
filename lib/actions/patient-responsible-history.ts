"use server";

import { redirect } from "next/navigation";

import {
  formatResponsibleLabel,
  mapAuditRowsToResponsibleHistory,
} from "@/lib/patients/responsible-history";
import { createClient } from "@/lib/supabase/server";
import type { PatientResponsibleHistoryEvent } from "@/lib/types/patient-responsible-history";

export async function loadPatientResponsibleHistory(
  patientId: string,
): Promise<{
  currentResponsibleName: string | null;
  events: PatientResponsibleHistoryEvent[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: patient } = await supabase
    .from("patients")
    .select("responsible_team_member_id")
    .eq("id", patientId)
    .maybeSingle();

  let currentResponsibleName: string | null = null;
  const currentId = patient?.responsible_team_member_id as string | null;
  if (currentId) {
    const { data: member } = await supabase
      .from("team_members")
      .select("full_name")
      .eq("id", currentId)
      .maybeSingle();
    currentResponsibleName =
      typeof member?.full_name === "string" ? member.full_name : null;
  }

  const { data: auditRows, error } = await supabase
    .from("audit_log")
    .select("id, operation, created_at, actor_user_id, old_values, new_values")
    .eq("table_name", "patients")
    .eq("record_id", patientId)
    .eq("status", "active")
    .in("operation", ["INSERT", "UPDATE", "DELETE"])
    .order("created_at", { ascending: false });

  if (error || !auditRows) {
    return { currentResponsibleName, events: [] };
  }

  const teamMemberIds = new Set<string>();
  const actorIds = new Set<string>();

  for (const row of auditRows) {
    const oldValues = row.old_values as Record<string, unknown> | null;
    const newValues = row.new_values as Record<string, unknown> | null;
    for (const values of [oldValues, newValues]) {
      const id = values?.responsible_team_member_id;
      if (typeof id === "string" && id.length > 0) teamMemberIds.add(id);
    }
    const actorId = row.actor_user_id as string | null;
    if (actorId) actorIds.add(actorId);
  }
  if (currentId) teamMemberIds.add(currentId);

  const teamMemberNames = new Map<string, string>();
  if (teamMemberIds.size > 0) {
    const { data: members } = await supabase
      .from("team_members")
      .select("id, full_name")
      .in("id", [...teamMemberIds]);
    for (const m of members ?? []) {
      if (m.id && m.full_name) teamMemberNames.set(m.id, m.full_name);
    }
  }

  const actorNames = new Map<string, string>();
  if (actorIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", [...actorIds]);
    for (const p of profiles ?? []) {
      if (p.user_id && p.full_name) actorNames.set(p.user_id, p.full_name);
    }
  }

  const events = mapAuditRowsToResponsibleHistory({
    rows: auditRows as Parameters<
      typeof mapAuditRowsToResponsibleHistory
    >[0]["rows"],
    teamMemberNames,
    actorNames,
  });

  return { currentResponsibleName, events };
}

export async function logPatientResponsibleChange(args: {
  patientId: string;
  operation: "assigned" | "changed" | "removed" | "created_without";
  fromTeamMemberId: string | null;
  toTeamMemberId: string | null;
  fromTeamMemberName: string | null;
  toTeamMemberName: string | null;
}): Promise<void> {
  const { logApplicationActivityAction } = await import(
    "@/lib/actions/application-activity"
  );

  const eventType =
    args.operation === "assigned"
      ? "patient_responsible_assigned"
      : args.operation === "changed"
        ? "patient_responsible_changed"
        : args.operation === "removed"
          ? "patient_responsible_removed"
          : "patient_responsible_created_without";

  await logApplicationActivityAction({
    eventType,
    entityType: "patient",
    entityId: args.patientId,
    metadata: {
      from_team_member_id: args.fromTeamMemberId,
      to_team_member_id: args.toTeamMemberId,
      from_team_member_name: args.fromTeamMemberName,
      to_team_member_name: args.toTeamMemberName,
    },
  });
}

export { formatResponsibleLabel };
