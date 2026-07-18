-- Defesa em profundidade: membros DESATIVADOS (team_members.is_active=false)
-- deixam de resolver o workspace e de passar nas políticas RLS.
--
-- Antes, o bloqueio acontecia apenas no login (ban em auth.users). Uma sessão
-- ainda válida de um membro recém-desativado continuava passando em
-- workspace_account_owner_id() / workspace_member_user_ids() e, portanto, nas
-- políticas de clients/patients/etc.
--
-- Também torna a resolução do workspace DETERMINÍSTICA: o `limit 1` original
-- não tinha `order by`, então um usuário vinculado a mais de um workspace
-- podia resolver ora um dono, ora outro (edições falhando de forma
-- intermitente). Passa a valer o vínculo ativo mais antigo.

create or replace function public.workspace_account_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select tm.owner_user_id
      from public.team_members tm
      where
        tm.member_user_id = (select auth.uid())
        and tm.is_active
      order by tm.created_at, tm.id
      limit 1
    ),
    (select auth.uid())
  );
$$;

create or replace function public.workspace_member_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.workspace_account_owner_id()
  union
  select tm.member_user_id
  from public.team_members tm
  where
    tm.owner_user_id = public.workspace_account_owner_id()
    and tm.member_user_id is not null
    and tm.is_active;
$$;

comment on function public.workspace_account_owner_id() is
  'Dono do workspace do usuário autenticado. Considera apenas vínculos ativos '
  '(is_active) e resolve deterministicamente pelo vínculo mais antigo.';

comment on function public.workspace_member_user_ids() is
  'Dono + membros ATIVOS do workspace corrente. Membros desativados são '
  'excluídos das políticas RLS além do ban de login.';

-- DELETE de dados mestres: cargo Gestão só conta se o vínculo estiver ativo.
create or replace function public.workspace_can_delete_master_data()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    (select auth.uid()) = (select public.workspace_account_owner_id())
    or exists (
      select 1
      from public.team_members tm
      where
        tm.owner_user_id = (select public.workspace_account_owner_id())
        and tm.member_user_id = (select auth.uid())
        and tm.job_role = 'gestao'
        and tm.is_active
    )
    or exists (
      select 1
      from public.profiles pr
      where
        pr.user_id = (select auth.uid())
        and pr.role in ('admin', 'super_admin')
    );
$$;

comment on function public.workspace_can_delete_master_data() is
  'Titular, membro ATIVO com job_role=gestao ou admin/super_admin da plataforma.';
