-- Assinatura digitalizada do profissional (por usuário).
-- Capturada nas configurações do perfil e reutilizada em documentos/PDFs que
-- exigem a assinatura do responsável técnico (ex.: relatório de avaliação).

-- 1) Coluna no profiles para guardar o path do objeto em Storage.
alter table public.profiles
  add column if not exists signature_storage_path text;

comment on column public.profiles.signature_storage_path is
  'Path em storage (bucket professional-signatures) da assinatura digitalizada do profissional.';

-- 2) Permitir que o profissional atualize a própria assinatura.
--    Grant aditivo a nível de coluna (não revoga os grants já existentes).
grant update (signature_storage_path) on public.profiles to authenticated;

-- 3) Bucket de Storage para assinaturas (privado). PNG/JPEG/WebP, até 2 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'professional-signatures',
  'professional-signatures',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 4) Policies de storage: pasta = UUID do próprio usuário (cada profissional
--    gere apenas a própria assinatura).
drop policy if exists "professional_signatures_insert" on storage.objects;
drop policy if exists "professional_signatures_select" on storage.objects;
drop policy if exists "professional_signatures_update" on storage.objects;
drop policy if exists "professional_signatures_delete" on storage.objects;

create policy "professional_signatures_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'professional-signatures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "professional_signatures_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'professional-signatures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "professional_signatures_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'professional-signatures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'professional-signatures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "professional_signatures_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'professional-signatures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
