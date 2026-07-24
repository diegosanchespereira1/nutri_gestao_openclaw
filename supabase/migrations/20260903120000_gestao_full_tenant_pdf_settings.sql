-- Gestão (e admin/super_admin de plataforma) podem gravar checklist_pdf_settings
-- do workspace, alinhado a canManageTenantFully na app.
-- O workspace_owner_id continua sendo o titular (workspace_account_owner_id()).

create or replace function public.set_checklist_client_signature_required(p_required boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := public.workspace_account_owner_id();
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  if v_owner is null then
    raise exception 'workspace owner not resolved';
  end if;

  if not (
    (select auth.uid()) = v_owner
    or public.is_workspace_gestao_member()
    or exists (
      select 1
      from public.profiles pr
      where pr.user_id = (select auth.uid())
        and pr.role in ('admin', 'super_admin')
    )
  ) then
    raise exception 'not allowed to update checklist pdf settings';
  end if;

  insert into public.checklist_pdf_settings (
    workspace_owner_id,
    client_signature_required
  )
  values (v_owner, coalesce(p_required, true))
  on conflict (workspace_owner_id) do update
  set client_signature_required = excluded.client_signature_required,
      updated_at = now();
end;
$$;

revoke all on function public.set_checklist_client_signature_required(boolean) from public;
revoke all on function public.set_checklist_client_signature_required(boolean) from anon;
grant execute on function public.set_checklist_client_signature_required(boolean) to authenticated;
grant execute on function public.set_checklist_client_signature_required(boolean) to service_role;

comment on function public.set_checklist_client_signature_required(boolean) is
  'Atualiza a flag de assinatura obrigatória do cliente no dossiê do workspace '
  '(titular, Gestão ou admin/super_admin de plataforma).';

drop policy if exists "owner_upsert_pdf_settings" on public.checklist_pdf_settings;
drop policy if exists "owner_update_pdf_settings" on public.checklist_pdf_settings;
drop policy if exists "gestao_upsert_pdf_settings" on public.checklist_pdf_settings;
drop policy if exists "gestao_update_pdf_settings" on public.checklist_pdf_settings;

create policy "tenant_managers_upsert_pdf_settings"
  on public.checklist_pdf_settings
  for insert
  to authenticated
  with check (
    workspace_owner_id = (select public.workspace_account_owner_id())
    and (
      (select auth.uid()) = (select public.workspace_account_owner_id())
      or (select public.is_workspace_gestao_member())
      or exists (
        select 1
        from public.profiles pr
        where pr.user_id = (select auth.uid())
          and pr.role in ('admin', 'super_admin')
      )
    )
  );

create policy "tenant_managers_update_pdf_settings"
  on public.checklist_pdf_settings
  for update
  to authenticated
  using (
    workspace_owner_id = (select public.workspace_account_owner_id())
    and (
      (select auth.uid()) = (select public.workspace_account_owner_id())
      or (select public.is_workspace_gestao_member())
      or exists (
        select 1
        from public.profiles pr
        where pr.user_id = (select auth.uid())
          and pr.role in ('admin', 'super_admin')
      )
    )
  )
  with check (
    workspace_owner_id = (select public.workspace_account_owner_id())
    and (
      (select auth.uid()) = (select public.workspace_account_owner_id())
      or (select public.is_workspace_gestao_member())
      or exists (
        select 1
        from public.profiles pr
        where pr.user_id = (select auth.uid())
          and pr.role in ('admin', 'super_admin')
      )
    )
  );
