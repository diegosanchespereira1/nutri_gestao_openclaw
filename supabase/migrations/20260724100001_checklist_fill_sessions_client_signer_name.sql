-- Migration: adiciona nome do signatário do cliente (digitado no momento da assinatura)
alter table public.checklist_fill_sessions
  add column if not exists client_signer_name text;

comment on column public.checklist_fill_sessions.client_signer_name is
  'Nome da pessoa que assinou pelo cliente/estabelecimento, digitado no momento da aprovação do dossiê.';
