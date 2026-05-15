-- Migration: adiciona colunas de assinatura digital ao dossiê de checklist
-- professional_signature_data_url: assinatura da nutricionista/profissional que realizou o checklist
-- client_signature_data_url: assinatura do responsável/cliente pelo estabelecimento

alter table public.checklist_fill_sessions
  add column if not exists professional_signature_data_url text,
  add column if not exists client_signature_data_url        text;

comment on column public.checklist_fill_sessions.professional_signature_data_url is
  'Data URL (PNG base64) da assinatura da profissional que realizou o checklist. Capturada no momento da aprovação do dossiê.';

comment on column public.checklist_fill_sessions.client_signature_data_url is
  'Data URL (PNG base64) da assinatura do cliente/responsável pelo estabelecimento. Capturada no momento da aprovação do dossiê.';
