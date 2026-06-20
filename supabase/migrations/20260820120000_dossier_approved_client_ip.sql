-- IP do dispositivo no momento da aprovação do dossiê (auditoria de assinatura eletrônica).
alter table public.checklist_fill_sessions
  add column if not exists dossier_approved_client_ip text;

comment on column public.checklist_fill_sessions.dossier_approved_client_ip is
  'Endereço IP do dispositivo que aprovou o dossiê (x-forwarded-for / x-real-ip no momento da assinatura).';
