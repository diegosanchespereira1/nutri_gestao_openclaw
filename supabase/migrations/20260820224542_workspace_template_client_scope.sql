-- Vínculo opcional de modelo da equipe a um cliente PJ.
-- client_id NULL = disponível para todos os clientes do workspace.
-- client_id preenchido = só estabelecimentos daquele cliente.

alter table public.checklist_workspace_templates
  add column if not exists client_id uuid references public.clients (id) on delete restrict;

comment on column public.checklist_workspace_templates.client_id is
  'Cliente PJ opcional. NULL = todos os clientes; UUID = só este cliente.';

create index if not exists checklist_workspace_templates_owner_client_idx
  on public.checklist_workspace_templates (owner_user_id, client_id)
  where archived_at is null;

drop policy if exists "checklist_workspace_templates_insert"
  on public.checklist_workspace_templates;
drop policy if exists "checklist_workspace_templates_update"
  on public.checklist_workspace_templates;

create policy "checklist_workspace_templates_insert"
  on public.checklist_workspace_templates for insert
  to authenticated
  with check (
    owner_user_id = (select public.workspace_account_owner_id())
    and created_by_user_id = (select auth.uid())
    and (
      client_id is null
      or exists (
        select 1
        from public.clients c
        where
          c.id = client_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
          and c.kind = 'pj'
      )
    )
  );

create policy "checklist_workspace_templates_update"
  on public.checklist_workspace_templates for update
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()))
  with check (
    owner_user_id = (select public.workspace_account_owner_id())
    and (
      client_id is null
      or exists (
        select 1
        from public.clients c
        where
          c.id = client_id
          and c.owner_user_id = (select public.workspace_account_owner_id())
          and c.kind = 'pj'
      )
    )
  );

create or replace function public.audit_checklist_workspace_templates_row_json (
  t public.checklist_workspace_templates
)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'id', t.id,
    'owner_user_id', t.owner_user_id,
    'created_by_user_id', t.created_by_user_id,
    'name', t.name,
    'client_id', t.client_id,
    'archived_at', t.archived_at,
    'published_at', t.published_at,
    'version', t.version
  );
$$;
