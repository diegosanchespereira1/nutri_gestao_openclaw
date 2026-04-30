-- Permite que membros da equipa gerenciem logo do tenant e atualizem
-- seus próprios dados espelhados em team_members (nome/telefone/CRN).

-- 1) Storage tenant-logos: escrita por qualquer membro do workspace
--    na pasta do titular (owner_user_id).
drop policy if exists "tenant_logos_insert_own" on storage.objects;
drop policy if exists "tenant_logos_update_own" on storage.objects;
drop policy if exists "tenant_logos_delete_own" on storage.objects;
drop policy if exists "tenant_logos_insert_workspace" on storage.objects;
drop policy if exists "tenant_logos_update_workspace" on storage.objects;
drop policy if exists "tenant_logos_delete_workspace" on storage.objects;

create policy "tenant_logos_insert_workspace"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "tenant_logos_update_workspace"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  )
  with check (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "tenant_logos_delete_workspace"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  );

-- 2) RPC security definer para persistir path do logo no perfil do titular.
create or replace function public.set_workspace_tenant_logo_storage_path(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    tenant_logo_storage_path = nullif(trim(coalesce(p_path, '')), ''),
    updated_at = now()
  where user_id = public.workspace_account_owner_id();
end;
$$;

grant execute on function public.set_workspace_tenant_logo_storage_path(text) to authenticated;

-- 3) team_members: permitir que cada membro atualize os próprios dados
--    espelhados para CRN/nome/telefone sem depender do titular.
drop policy if exists "team_members_update_self_profile_sync" on public.team_members;

create policy "team_members_update_self_profile_sync"
  on public.team_members for update
  to authenticated
  using (
    member_user_id = (select auth.uid())
    and owner_user_id = (select public.workspace_account_owner_id())
  )
  with check (
    member_user_id = (select auth.uid())
    and owner_user_id = (select public.workspace_account_owner_id())
  );

-- Restringe UPDATE para self-sync a colunas permitidas.
revoke update on public.team_members from authenticated;
grant update (
  full_name,
  email,
  phone,
  professional_area,
  job_role,
  crn,
  notes,
  member_user_id,
  updated_at
) on public.team_members to authenticated;
