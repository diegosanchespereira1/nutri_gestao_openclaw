-- A policy de UPDATE/INSERT consultava public.clients direto.
-- Esse EXISTS herda o RLS de clients e pode falhar com
-- "new row violates row-level security policy" ao gravar client_id,
-- mesmo quando o app já validou o cliente PJ do workspace.
-- Helper SECURITY DEFINER avalia o vínculo sem ser filtrado pelo RLS de clients.

create or replace function public.workspace_template_client_scope_allowed (
  p_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_client_id is null
    or exists (
      select 1
      from public.clients c
      where
        c.id = p_client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    );
$$;

comment on function public.workspace_template_client_scope_allowed(uuid) is
  'True se client_id é nulo (todos os clientes) ou um PJ do workspace autenticado.';

revoke all on function public.workspace_template_client_scope_allowed(uuid) from public;
grant execute on function public.workspace_template_client_scope_allowed(uuid)
  to authenticated;

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
    and (select public.workspace_template_client_scope_allowed(client_id))
  );

create policy "checklist_workspace_templates_update"
  on public.checklist_workspace_templates for update
  to authenticated
  using (owner_user_id = (select public.workspace_account_owner_id()))
  with check (
    owner_user_id = (select public.workspace_account_owner_id())
    and (select public.workspace_template_client_scope_allowed(client_id))
  );

notify pgrst, 'reload schema';
