import type { SupabaseClient } from "@supabase/supabase-js";

import { logPatientResponsibleChange } from "@/lib/actions/patient-responsible-history";

async function resolveTeamMemberName(
  supabase: SupabaseClient,
  teamMemberId: string | null,
): Promise<string | null> {
  if (!teamMemberId) return null;
  const { data } = await supabase
    .from("team_members")
    .select("full_name")
    .eq("id", teamMemberId)
    .maybeSingle();
  return typeof data?.full_name === "string" ? data.full_name : null;
}

/** Regista em application_activity_log a alteração do responsável (audit_log vem do trigger). */
export async function emitPatientResponsibleActivityLog(args: {
  supabase: SupabaseClient;
  patientId: string;
  previousTeamMemberId: string | null;
  nextTeamMemberId: string | null;
  isCreate?: boolean;
}): Promise<void> {
  const { supabase, patientId, previousTeamMemberId, nextTeamMemberId, isCreate } =
    args;

  if (!isCreate && previousTeamMemberId === nextTeamMemberId) {
    return;
  }

  const [fromName, toName] = await Promise.all([
    resolveTeamMemberName(supabase, previousTeamMemberId),
    resolveTeamMemberName(supabase, nextTeamMemberId),
  ]);

  let operation: "assigned" | "changed" | "removed" | "created_without";
  if (isCreate) {
    operation = nextTeamMemberId ? "assigned" : "created_without";
  } else if (!previousTeamMemberId && nextTeamMemberId) {
    operation = "assigned";
  } else if (previousTeamMemberId && !nextTeamMemberId) {
    operation = "removed";
  } else {
    operation = "changed";
  }

  await logPatientResponsibleChange({
    patientId,
    operation,
    fromTeamMemberId: previousTeamMemberId,
    toTeamMemberId: nextTeamMemberId,
    fromTeamMemberName: fromName,
    toTeamMemberName: toName,
  });
}
