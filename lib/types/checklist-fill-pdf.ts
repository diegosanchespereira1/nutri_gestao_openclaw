export type ChecklistFillPdfExportStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed";

export type ChecklistFillPdfExportRow = {
  id: string;
  user_id: string;
  session_id: string;
  status: ChecklistFillPdfExportStatus;
  storage_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};
