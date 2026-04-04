export type ClientExamCategory = "previous" | "scheduled";

export type ClientExamDocumentRow = {
  id: string;
  client_id: string;
  category: ClientExamCategory;
  storage_path: string;
  original_filename: string;
  content_type: string | null;
  file_size: number | null;
  notes: string | null;
  created_at: string;
};
