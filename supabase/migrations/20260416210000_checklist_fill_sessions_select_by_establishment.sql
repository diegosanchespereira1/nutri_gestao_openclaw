-- Story: Proteção de Navegação e Retomada de Sessão de Checklist (Task C.1)
-- Permite que o owner do cliente leia sessões de preenchimento iniciadas por qualquer
-- membro da equipe no mesmo estabelecimento, sem expor sessões de outros tenants.
--
-- A policy original "checklist_fill_sessions_select_own" permanece ativa.
-- O Supabase combina policies SELECT com OR lógico — sem remoção da proteção existente.

create policy "checklist_fill_sessions_select_establishment_owner"
  on public.checklist_fill_sessions for select
  to authenticated
  using (
    exists (
      select 1
      from public.establishments est
      join public.clients cl on cl.id = est.client_id
      where
        est.id = checklist_fill_sessions.establishment_id
        and cl.owner_user_id = (select auth.uid())
    )
  );
