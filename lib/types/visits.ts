export type VisitTargetType = "establishment" | "patient";

export type VisitPriority = "low" | "normal" | "high" | "urgent";

export type VisitStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

/** Tipo operacional da visita (independente do destino PJ/PF). */
export type VisitKind =
  | "patient_care"
  | "technical_compliance"
  | "follow_up"
  | "audit"
  | "training"
  | "other";

export type ScheduledVisitRow = {
  id: string;
  user_id: string;
  target_type: VisitTargetType;
  establishment_id: string | null;
  patient_id: string | null;
  scheduled_start: string;
  priority: VisitPriority;
  status: VisitStatus;
  visit_kind: VisitKind;
  assigned_team_member_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Listagem com nomes para UI (embed Supabase). */
export type ScheduledVisitWithTargets = ScheduledVisitRow & {
  establishments: { id: string; name: string; client_id: string } | null;
  patients: { id: string; full_name: string } | null;
  team_members: {
    id: string;
    full_name: string;
    job_role: string;
  } | null;
};
