/**
 * Colunas mínimas para a shell da página `/clientes/[id]/editar` (fase 1 +
 * cabeçalho). O resto do {@link ClientRow} só é pedido na aba Dados.
 */
export const CLIENT_EDIT_SHELL_SELECT =
  "id, kind, legal_name, lifecycle_status, logo_storage_path";

/**
 * Lista explícita de colunas `public.clients` para `.select()` no PostgREST.
 *
 * Usar quando a rota precisa de todas as colunas do {@link ClientRow} (ex.
 * `/clientes/[id]/editar` com {@link normalizeClientRow} após um único select).
 *
 * Ao adicionar coluna na tabela: atualizar {@link ClientRow} e este array.
 */
const CLIENT_ROW_FULL_COLUMNS = [
  "id",
  "owner_user_id",
  "kind",
  "legal_name",
  "trade_name",
  "document_id",
  "email",
  "phone",
  "notes",
  "lifecycle_status",
  "activated_at",
  "state_registration",
  "municipal_registration",
  "sanitary_license",
  "website_url",
  "social_links",
  "logo_storage_path",
  "legal_rep_full_name",
  "legal_rep_document_id",
  "legal_rep_role",
  "legal_rep_email",
  "legal_rep_phone",
  "technical_rep_full_name",
  "technical_rep_professional_id",
  "technical_rep_email",
  "technical_rep_phone",
  "attended_full_name",
  "birth_date",
  "sex",
  "dietary_restrictions",
  "chronic_medications",
  "guardian_full_name",
  "guardian_document_id",
  "guardian_email",
  "guardian_phone",
  "guardian_relationship",
  "business_segment",
  "responsible_team_member_id",
  "created_at",
  "updated_at",
] as const;

/** String para `supabase.from("clients").select(CLIENT_ROW_FULL_SELECT)` */
export const CLIENT_ROW_FULL_SELECT: string =
  CLIENT_ROW_FULL_COLUMNS.join(",");
