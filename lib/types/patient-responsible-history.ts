export type PatientResponsibleHistoryEvent = {
  id: string;
  occurred_at: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  /** Profissional que passou a ser responsável (null = removido ou nunca atribuído). */
  to_team_member_id: string | null;
  to_team_member_name: string | null;
  /** Profissional anterior (null na criação ou quando não havia responsável). */
  from_team_member_id: string | null;
  from_team_member_name: string | null;
  /** Utilizador que registou a alteração. */
  actor_user_id: string | null;
  actor_full_name: string | null;
  summary: string;
};
