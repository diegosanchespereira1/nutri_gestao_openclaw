-- Logo do tenant (empresa/titular do workspace).
-- O logo é único por workspace e fica no profile do titular (owner).
-- Utilizado em PDFs, emails e demais comunicações que exibam marca.

-- 1) Coluna no profiles para guardar o path do objeto em Storage.
alter table public.profiles
  add column if not exists tenant_logo_storage_path text;

comment on column public.profiles.tenant_logo_storage_path is
  'Path em storage (bucket tenant-logos) do logotipo da empresa/tenant. Apenas preenchido no profile do titular do workspace.';

-- 2) Permitir que o titular atualize o próprio logo.
revoke update on public.profiles from authenticated;
grant update (
  full_name,
  crn,
  phone,
  photo_storage_path,
  tenant_logo_storage_path,
  timezone,
  updated_at,
  work_context,
  onboarding_completed_at
) on public.profiles to authenticated;

-- 3) Função security definer: expõe apenas o path do logo do titular
--    para qualquer membro autenticado do workspace (evita ampliar
--    o SELECT em public.profiles para membros da equipa).
create or replace function public.workspace_tenant_logo_storage_path()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.tenant_logo_storage_path
  from public.profiles p
  where p.user_id = (select public.workspace_account_owner_id())
  limit 1;
$$;

grant execute on function public.workspace_tenant_logo_storage_path() to authenticated;

-- 4) Bucket de Storage para logos de tenant (privado).
--    Limite de 200 MB por arquivo (209715200 bytes) e MIME types restritos
--    para imagens (PNG/JPEG/WebP) — mesma lista validada no servidor.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'tenant-logos',
  'tenant-logos',
  false,
  209715200,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 5) Policies de storage: pasta = UUID do titular do workspace,
--    mesmo padrão adotado em `client-logos` (a equipa inteira lê,
--    mas só o próprio titular escreve).
drop policy if exists "tenant_logos_insert_own" on storage.objects;
drop policy if exists "tenant_logos_select_own" on storage.objects;
drop policy if exists "tenant_logos_update_own" on storage.objects;
drop policy if exists "tenant_logos_delete_own" on storage.objects;

create policy "tenant_logos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select auth.uid()) = (select public.workspace_account_owner_id())
  );

create policy "tenant_logos_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "tenant_logos_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select auth.uid()) = (select public.workspace_account_owner_id())
  )
  with check (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select auth.uid()) = (select public.workspace_account_owner_id())
  );

create policy "tenant_logos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'tenant-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select auth.uid()) = (select public.workspace_account_owner_id())
  );
