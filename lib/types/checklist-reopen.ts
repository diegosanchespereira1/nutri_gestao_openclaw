export type ChecklistFillSessionReopenEventRow = {
  id: string;
  session_id: string;
  reopened_by_label: string;
  reopened_by_role: "owner" | "admin" | "gestao";
  justification: string;
  previous_approved_at: string;
  /** Hash SHA-256 hex do dossiê que foi cancelado por esta reabertura. */
  previous_document_hash?: string | null;
  created_at: string;
};
