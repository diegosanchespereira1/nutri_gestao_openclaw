-- Migração: corrige clientes com owner_user_id incorreto (UID de membro da equipe).
--
-- Contexto: antes da implementação do suporte multi-workspace, alguns Server Actions
-- usavam `user.id` (auth.uid do utilizador logado) diretamente como owner_user_id.
-- Se um membro de equipe criou clientes nesse período, esses registros ficaram com
-- owner_user_id = team_member.member_user_id em vez de team_member.owner_user_id.
-- Com o RLS atual (workspace_account_owner_id()), esses clientes são invisíveis
-- tanto para o titular quanto para os membros da equipe.
--
-- Correção: reatribui esses clientes ao owner_user_id correto do workspace.

-- Diagnóstico (execute antes para ver quais serão afetados):
-- SELECT c.id, c.legal_name, c.owner_user_id, tm.owner_user_id AS correct_owner
-- FROM public.clients c
-- JOIN public.team_members tm ON tm.member_user_id = c.owner_user_id
-- WHERE tm.member_user_id IS NOT NULL;

update public.clients c
set
  owner_user_id = tm.owner_user_id,
  updated_at    = now()
from public.team_members tm
where tm.member_user_id = c.owner_user_id
  and tm.member_user_id is not null;
