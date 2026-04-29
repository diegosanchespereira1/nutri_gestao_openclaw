export type ChecklistFillSessionReopenEventRow = {
  id: string;
  session_id: string;
  reopened_by_label: string;
  reopened_by_role: "owner" | "admin" | "gestao";
  justification: string;
  previous_approved_at: string;
  created_at: string;
};
