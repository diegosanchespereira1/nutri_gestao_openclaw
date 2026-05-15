-- Hash SHA-256 único por aprovação do dossiê.
-- Cada aprovação gera um hash irrepetível que identifica digitalmente o documento.
-- Ao reabrir, o hash é zerado na sessão e preservado no evento de reabertura.

-- ── Coluna de hash na sessão ──────────────────────────────────────────────
alter table public.checklist_fill_sessions
  add column if not exists document_hash text;

-- Unicidade: dois dossiês não podem ter o mesmo hash (proteção adicional além da entropia SHA-256)
create unique index if not exists checklist_fill_sessions_document_hash_unique
  on public.checklist_fill_sessions (document_hash)
  where document_hash is not null;

comment on column public.checklist_fill_sessions.document_hash is
  'SHA-256 hex do conteúdo do dossiê aprovado (session_id + approved_at + signatários + assinaturas). '
  'Nulo quando o dossiê ainda não foi aprovado ou foi reaberto.';

-- ── Hash cancelado no evento de reabertura ────────────────────────────────
alter table public.checklist_fill_session_reopen_events
  add column if not exists previous_document_hash text;

comment on column public.checklist_fill_session_reopen_events.previous_document_hash is
  'Hash SHA-256 que estava vigente no momento da reabertura. '
  'Preservado para auditoria — comprova que o documento original existiu.';
