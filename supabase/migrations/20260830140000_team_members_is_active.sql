-- Ativar/desativar acesso de um membro da equipe pelo cockpit administrativo
-- (super_admin). Campo próprio em team_members, alternado apenas via
-- lib/actions/admin-platform.ts (toggleTeamMemberActiveAction):
--   - desativar: is_active=false + ban do usuário em auth.users (banned_until,
--     mesmo mecanismo do bloqueio LGPD em lib/actions/account-deletion.ts) —
--     a senha atual deixa de funcionar.
--   - reativar: is_active=true + unban + senha aleatória + email de
--     redefinição de senha (sendPasswordRecoveryViaSupabase) — a senha antiga
--     não volta a funcionar, só o link do email.

alter table public.team_members
  add column if not exists is_active boolean not null default true;

comment on column public.team_members.is_active is
  'Acesso do membro liberado/bloqueado pelo super_admin no cockpit administrativo. '
  'Ver toggleTeamMemberActiveAction em lib/actions/admin-platform.ts.';

-- UPDATE por admin/super_admin (profiles.role), além das policies já
-- existentes (titular/equipe do próprio workspace). Mesmo padrão já aplicado
-- ao DELETE em 20260630120000_team_members_delete_by_owner_gestao_or_platform_admin.sql.
drop policy if exists "team_members_update_platform_admin" on public.team_members;

create policy "team_members_update_platform_admin"
  on public.team_members for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles pr
      where
        pr.user_id = (select auth.uid())
        and pr.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles pr
      where
        pr.user_id = (select auth.uid())
        and pr.role in ('admin', 'super_admin')
    )
  );
