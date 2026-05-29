-- Versionamento de modelos de checklist da equipe (paridade com checklist_templates.version).

alter table public.checklist_workspace_templates
  add column if not exists version integer not null default 1;

alter table public.checklist_workspace_templates
  drop constraint if exists checklist_workspace_templates_version_pos;

alter table public.checklist_workspace_templates
  add constraint checklist_workspace_templates_version_pos check (version >= 1);

comment on column public.checklist_workspace_templates.version is
  'Incrementa quando o modelo já foi usado em sessões e sofre alteração estrutural.';
