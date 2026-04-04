-- Story 4.9: destinatários e estado de envio do dossiê por email (visita).

alter table public.scheduled_visits
  add column if not exists dossier_recipient_emails text[] not null default '{}',
  add column if not exists dossier_email_send_status text not null default 'not_sent'
    constraint scheduled_visits_dossier_email_send_status_check check (
      dossier_email_send_status in ('not_sent', 'sent', 'failed')
    ),
  add column if not exists dossier_email_last_error text,
  add column if not exists dossier_email_sent_at timestamptz;

comment on column public.scheduled_visits.dossier_recipient_emails is
  'Endereços para envio automático do PDF do dossiê após aprovação (máx. imposto na app).';

comment on column public.scheduled_visits.dossier_email_send_status is
  'Estado do último envio por email do dossiê (not_sent / sent / failed).';

comment on column public.scheduled_visits.dossier_email_last_error is
  'Mensagem curta do último falhanço de envio (para UI e reenvio).';

comment on column public.scheduled_visits.dossier_email_sent_at is
  'Quando o último envio por email foi concluído com sucesso.';
