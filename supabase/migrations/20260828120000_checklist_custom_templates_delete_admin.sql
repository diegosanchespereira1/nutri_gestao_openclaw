-- Restringe DELETE de modelos personalizados por estabelecimento ao titular do workspace
-- ou perfis admin / super_admin (mesmo padrão de remoção de membros da equipe).

drop policy if exists "checklist_custom_templates_own" on public.checklist_custom_templates;

create policy "checklist_custom_templates_select"
  on public.checklist_custom_templates for select
  to authenticated
  using (user_id in (select public.workspace_member_user_ids()));

create policy "checklist_custom_templates_insert"
  on public.checklist_custom_templates for insert
  to authenticated
  with check (user_id in (select public.workspace_member_user_ids()));

create policy "checklist_custom_templates_update"
  on public.checklist_custom_templates for update
  to authenticated
  using (user_id in (select public.workspace_member_user_ids()))
  with check (user_id in (select public.workspace_member_user_ids()));

create policy "checklist_custom_templates_delete"
  on public.checklist_custom_templates for delete
  to authenticated
  using (
    user_id in (select public.workspace_member_user_ids())
    and (
      (select auth.uid()) = (select public.workspace_account_owner_id())
      or exists (
        select 1
        from public.profiles pr
        where pr.user_id = (select auth.uid())
          and pr.role = any (array['admin', 'super_admin'])
      )
    )
  );
