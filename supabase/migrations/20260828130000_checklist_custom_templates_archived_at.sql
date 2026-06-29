-- Soft-delete para modelos personalizados por estabelecimento (mesmo padrão da equipe).

alter table public.checklist_custom_templates
  add column if not exists archived_at timestamptz;

comment on column public.checklist_custom_templates.archived_at is
  'Soft-delete: quando preenchido, o modelo deixa de aparecer na listagem mas sessões antigas continuam acessíveis.';

create index if not exists checklist_custom_templates_active_idx
  on public.checklist_custom_templates (establishment_id, archived_at, updated_at desc);
