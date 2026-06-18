-- Imagem da receita na ficha técnica (upload pelo profissional).

alter table public.technical_recipes
  add column if not exists image_storage_path text;

comment on column public.technical_recipes.image_storage_path is
  'Path no bucket technical-recipe-images da foto da receita/prato.';

insert into storage.buckets (id, name, public)
values ('technical-recipe-images', 'technical-recipe-images', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "technical_recipe_images_storage_insert" on storage.objects;
drop policy if exists "technical_recipe_images_storage_select" on storage.objects;
drop policy if exists "technical_recipe_images_storage_update" on storage.objects;
drop policy if exists "technical_recipe_images_storage_delete" on storage.objects;

create policy "technical_recipe_images_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'technical-recipe-images'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "technical_recipe_images_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'technical-recipe-images'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "technical_recipe_images_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'technical-recipe-images'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  )
  with check (
    bucket_id = 'technical-recipe-images'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  );

create policy "technical_recipe_images_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'technical-recipe-images'
    and (storage.foldername(name))[1] = (select public.workspace_account_owner_id())::text
  );

notify pgrst, 'reload schema';
