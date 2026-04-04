-- Story 4.8: exportação PDF do dossié (histórico de jobs + storage privado).

create table if not exists public.checklist_fill_pdf_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.checklist_fill_sessions (id) on delete cascade,
  status text not null default 'pending',
  storage_path text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checklist_fill_pdf_exports_status_check check (
    status in ('pending', 'processing', 'ready', 'failed')
  )
);

create index if not exists checklist_fill_pdf_exports_session_created_idx
  on public.checklist_fill_pdf_exports (session_id, created_at desc);

alter table public.checklist_fill_pdf_exports enable row level security;

create policy "checklist_fill_pdf_exports_select_own"
  on public.checklist_fill_pdf_exports for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "checklist_fill_pdf_exports_insert_own"
  on public.checklist_fill_pdf_exports for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id = (select auth.uid())
    )
  );

create policy "checklist_fill_pdf_exports_update_own"
  on public.checklist_fill_pdf_exports for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.checklist_fill_pdf_exports to authenticated;

create or replace function public.checklist_fill_pdf_exports_touch_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists checklist_fill_pdf_exports_set_updated_at
  on public.checklist_fill_pdf_exports;

create trigger checklist_fill_pdf_exports_set_updated_at
before update on public.checklist_fill_pdf_exports
for each row
execute function public.checklist_fill_pdf_exports_touch_updated_at ();

insert into storage.buckets (id, name, public)
values ('checklist-dossier-pdfs', 'checklist-dossier-pdfs', false)
on conflict (id) do nothing;

drop policy if exists "checklist_dossier_pdfs_storage_insert" on storage.objects;
drop policy if exists "checklist_dossier_pdfs_storage_select" on storage.objects;
drop policy if exists "checklist_dossier_pdfs_storage_delete" on storage.objects;

create policy "checklist_dossier_pdfs_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'checklist-dossier-pdfs'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );

create policy "checklist_dossier_pdfs_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'checklist-dossier-pdfs'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );

create policy "checklist_dossier_pdfs_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'checklist-dossier-pdfs'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );
