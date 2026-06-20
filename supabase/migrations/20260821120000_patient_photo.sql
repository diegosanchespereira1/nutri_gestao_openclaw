-- Foto do paciente (cadastro e listagem).

alter table public.patients
  add column if not exists photo_storage_path text;

comment on column public.patients.photo_storage_path is
  'Path no bucket patient-photos da foto do paciente.';

insert into storage.buckets (id, name, public)
values ('patient-photos', 'patient-photos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "patient_photos_storage_insert" on storage.objects;
drop policy if exists "patient_photos_storage_select" on storage.objects;
drop policy if exists "patient_photos_storage_update" on storage.objects;
drop policy if exists "patient_photos_storage_delete" on storage.objects;

create policy "patient_photos_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'patient-photos'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "patient_photos_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'patient-photos'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "patient_photos_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'patient-photos'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  )
  with check (
    bucket_id = 'patient-photos'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "patient_photos_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'patient-photos'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  );

notify pgrst, 'reload schema';
