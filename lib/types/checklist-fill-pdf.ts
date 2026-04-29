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
  /** Número sequencial do PDF dentro da sessão (1-based). */
  version_number: number;
  /** Quando não nulo, o PDF deixou de ser o vigente. */
  superseded_at: string | null;
  /** Versão do PDF que substituiu este ficheiro. */
  superseded_by_version: number | null;
};
