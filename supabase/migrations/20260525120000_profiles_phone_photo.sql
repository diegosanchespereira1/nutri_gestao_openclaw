-- Perfil profissional: telefone e foto no perfil (página /perfil).

alter table public.profiles
  add column if not exists phone text,
  add column if not exists photo_storage_path text;

revoke update on public.profiles from authenticated;
grant update (
  full_name,
  crn,
  phone,
  photo_storage_path,
  timezone,
  updated_at,
  work_context,
  onboarding_completed_at
) on public.profiles to authenticated;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "profile_photos_storage_insert" on storage.objects;
drop policy if exists "profile_photos_storage_select" on storage.objects;
drop policy if exists "profile_photos_storage_update" on storage.objects;
drop policy if exists "profile_photos_storage_delete" on storage.objects;

create policy "profile_photos_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "profile_photos_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "profile_photos_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "profile_photos_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
