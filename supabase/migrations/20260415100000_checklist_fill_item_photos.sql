-- Fotos por item em sessões de checklist (Story 4.3 — FR19).
-- Storage: bucket privado; path `{user_id}/{session_id}/{object_name}`.

create table if not exists public.checklist_fill_item_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.checklist_fill_sessions (id) on delete cascade,
  template_item_id uuid references public.checklist_template_items (id) on delete cascade,
  custom_item_id uuid references public.checklist_custom_items (id) on delete cascade,
  storage_path text not null,
  original_filename text,
  content_type text,
  file_size bigint,
  taken_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  constraint checklist_fill_item_photos_one_item check (
    (
      template_item_id is not null
      and custom_item_id is null
    )
    or (
      template_item_id is null
      and custom_item_id is not null
    )
  )
);

create index if not exists checklist_fill_item_photos_session_idx
  on public.checklist_fill_item_photos (session_id, created_at desc);

alter table public.checklist_fill_item_photos enable row level security;

create policy "checklist_fill_item_photos_select_own"
  on public.checklist_fill_item_photos for select
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id = (select auth.uid())
    )
  );

create policy "checklist_fill_item_photos_insert_own"
  on public.checklist_fill_item_photos for insert
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

create policy "checklist_fill_item_photos_delete_own"
  on public.checklist_fill_item_photos for delete
  to authenticated
  using (
    exists (
      select 1
      from public.checklist_fill_sessions s
      where
        s.id = session_id
        and s.user_id = (select auth.uid())
    )
  );

grant select, insert, delete on public.checklist_fill_item_photos to authenticated;

insert into storage.buckets (id, name, public)
values ('checklist-fill-photos', 'checklist-fill-photos', false)
on conflict (id) do nothing;

drop policy if exists "checklist_fill_photos_storage_insert" on storage.objects;
drop policy if exists "checklist_fill_photos_storage_select" on storage.objects;
drop policy if exists "checklist_fill_photos_storage_update" on storage.objects;
drop policy if exists "checklist_fill_photos_storage_delete" on storage.objects;

create policy "checklist_fill_photos_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'checklist-fill-photos'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );

create policy "checklist_fill_photos_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'checklist-fill-photos'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );

create policy "checklist_fill_photos_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'checklist-fill-photos'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'checklist-fill-photos'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );

create policy "checklist_fill_photos_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'checklist-fill-photos'
    and (storage.foldername (name))[1] = (select auth.uid())::text
  );
