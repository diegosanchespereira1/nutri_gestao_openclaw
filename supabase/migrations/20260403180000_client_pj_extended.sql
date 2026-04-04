-- Cliente PJ estendido: estado do contrato, fiscal, web, logo, responsáveis.
-- Regra: inativo e finalizado bloqueiam novas visitas até reativação (lifecycle_status = ativo).

alter table public.clients
  add column if not exists lifecycle_status text not null default 'ativo',
  add column if not exists activated_at date,
  add column if not exists state_registration text,
  add column if not exists municipal_registration text,
  add column if not exists sanitary_license text,
  add column if not exists website_url text,
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists logo_storage_path text,
  add column if not exists legal_rep_full_name text,
  add column if not exists legal_rep_document_id text,
  add column if not exists legal_rep_role text,
  add column if not exists legal_rep_email text,
  add column if not exists legal_rep_phone text,
  add column if not exists technical_rep_full_name text,
  add column if not exists technical_rep_professional_id text,
  add column if not exists technical_rep_email text,
  add column if not exists technical_rep_phone text;

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'clients'
      and c.conname = 'clients_lifecycle_status_check'
  ) then
    alter table public.clients drop constraint clients_lifecycle_status_check;
  end if;
end $$;

alter table public.clients
  add constraint clients_lifecycle_status_check check (
    lifecycle_status in ('ativo', 'inativo', 'finalizado')
  );

create index if not exists clients_owner_lifecycle_idx
  on public.clients (owner_user_id, lifecycle_status);

-- Bucket de logos (privado; path = user_id/client_id/...)
insert into storage.buckets (id, name, public)
values ('client-logos', 'client-logos', false)
on conflict (id) do nothing;

do $$
declare
  pol text;
begin
  foreach pol in array ARRAY[
    'client_logos_insert_own',
    'client_logos_select_own',
    'client_logos_update_own',
    'client_logos_delete_own'
  ]
  loop
    if exists (
      select 1
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where p.polname = pol
        and n.nspname = 'storage'
        and c.relname = 'objects'
    ) then
      execute format('drop policy %I on storage.objects', pol);
    end if;
  end loop;
end $$;

create policy "client_logos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'client-logos'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );

create policy "client_logos_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-logos'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );

create policy "client_logos_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'client-logos'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'client-logos'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );

create policy "client_logos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'client-logos'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );
