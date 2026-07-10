-- Restringe escrita (insert/update/delete) de séries de escola apenas ao
-- titular do workspace. Membros da equipe continuam podendo ler (para o
-- seletor no cadastro do paciente), mas não podem criar/editar/remover
-- séries — mesmo padrão já aplicado a clients/establishments em
-- 20260725100001_restrict_clients_establishments_edit_delete_to_owner.sql
-- (lá "auth.uid() = workspace_account_owner_id()" é falso para membros da
-- equipe, já que workspace_account_owner_id() devolve o ID do titular).

drop policy if exists "client_school_grades_insert_own" on public.client_school_grades;
drop policy if exists "client_school_grades_update_own" on public.client_school_grades;
drop policy if exists "client_school_grades_delete_own" on public.client_school_grades;

create policy "client_school_grades_insert_own"
  on public.client_school_grades for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
    and (select auth.uid()) = (select public.workspace_account_owner_id())
  );

create policy "client_school_grades_update_own"
  on public.client_school_grades for update
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
    and (select auth.uid()) = (select public.workspace_account_owner_id())
  )
  with check (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
        and c.kind = 'pj'
    )
    and (select auth.uid()) = (select public.workspace_account_owner_id())
  );

create policy "client_school_grades_delete_own"
  on public.client_school_grades for delete
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where
        c.id = client_id
        and c.owner_user_id = (select public.workspace_account_owner_id())
    )
    and (select auth.uid()) = (select public.workspace_account_owner_id())
  );
