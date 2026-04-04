-- Perfil clínico / responsável em clientes PF + anexos de exames (Storage).

-- 1) Colunas opcionais em clients (uso semântico quando kind = 'pf')
alter table public.clients
  add column if not exists attended_full_name text,
  add column if not exists birth_date date,
  add column if not exists sex text,
  add column if not exists dietary_restrictions text,
  add column if not exists chronic_medications text,
  add column if not exists guardian_full_name text,
  add column if not exists guardian_document_id text,
  add column if not exists guardian_email text,
  add column if not exists guardian_phone text,
  add column if not exists guardian_relationship text;

alter table public.clients drop constraint if exists clients_sex_check;

alter table public.clients
  add constraint clients_sex_check check (
    sex is null or sex in ('female', 'male', 'other')
  );

-- 2) Metadados de ficheiros de exame
create table if not exists public.client_exam_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  category text not null,
  storage_path text not null,
  original_filename text not null,
  content_type text,
  file_size bigint,
  notes text,
  created_at timestamptz not null default now(),
  constraint client_exam_documents_category_check check (
    category in ('previous', 'scheduled')
  )
);

create index if not exists client_exam_documents_client_created_idx
  on public.client_exam_documents (client_id, created_at desc);

alter table public.client_exam_documents enable row level security;

create policy "client_exam_documents_select_own"
  on public.client_exam_documents for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create policy "client_exam_documents_insert_own"
  on public.client_exam_documents for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
  );

create policy "client_exam_documents_delete_own"
  on public.client_exam_documents for delete
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select auth.uid())
    )
  );

grant select, insert, delete on public.client_exam_documents to authenticated;

-- 3) Bucket privado para PDFs / imagens de exames
insert into storage.buckets (id, name, public)
values ('client-exams', 'client-exams', false)
on conflict (id) do nothing;

drop policy if exists "client_exams_insert_own" on storage.objects;
drop policy if exists "client_exams_select_own" on storage.objects;
drop policy if exists "client_exams_update_own" on storage.objects;
drop policy if exists "client_exams_delete_own" on storage.objects;

create policy "client_exams_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'client-exams'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );

create policy "client_exams_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-exams'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );

create policy "client_exams_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'client-exams'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'client-exams'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );

create policy "client_exams_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'client-exams'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );
