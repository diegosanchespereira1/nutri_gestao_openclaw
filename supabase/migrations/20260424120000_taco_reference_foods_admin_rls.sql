-- Story 6.9: mutações no catálogo TACO apenas para admin / super_admin (RLS).
-- Timestamp após 20260423100000 para manter ordem linear com o histórico remoto.

grant insert, update, delete on public.taco_reference_foods to authenticated;

drop policy if exists "taco_reference_foods_insert_admin" on public.taco_reference_foods;
create policy "taco_reference_foods_insert_admin"
  on public.taco_reference_foods for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where
        p.user_id = (select auth.uid())
        and p.role in ('admin', 'super_admin')
    )
  );

drop policy if exists "taco_reference_foods_update_admin" on public.taco_reference_foods;
create policy "taco_reference_foods_update_admin"
  on public.taco_reference_foods for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where
        p.user_id = (select auth.uid())
        and p.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where
        p.user_id = (select auth.uid())
        and p.role in ('admin', 'super_admin')
    )
  );

drop policy if exists "taco_reference_foods_delete_admin" on public.taco_reference_foods;
create policy "taco_reference_foods_delete_admin"
  on public.taco_reference_foods for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where
        p.user_id = (select auth.uid())
        and p.role in ('admin', 'super_admin')
    )
  );
