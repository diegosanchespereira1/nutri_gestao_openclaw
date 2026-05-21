-- Permite ao titular do workspace exigir ou dispensar a assinatura do cliente na aprovação do dossiê.
alter table public.checklist_pdf_settings
  add column if not exists client_signature_required boolean not null default true;

comment on column public.checklist_pdf_settings.client_signature_required is
  'Quando true, a assinatura do responsável pelo cliente/estabelecimento é obrigatória ao aprovar o dossiê.';
