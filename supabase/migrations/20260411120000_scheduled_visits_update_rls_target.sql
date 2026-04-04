-- Reforço RLS: UPDATE de scheduled_visits deve manter alvo (establishment/patient) no tenant do utilizador.

drop policy if exists "scheduled_visits_update_own" on public.scheduled_visits;

create policy "scheduled_visits_update_own"
  on public.scheduled_visits for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      (
        target_type = 'establishment'
        and exists (
          select 1
          from public.establishments e
          join public.clients c on c.id = e.client_id
          where
            e.id = establishment_id
            and c.owner_user_id = (select auth.uid())
        )
      )
      or (
        target_type = 'patient'
        and exists (
          select 1
          from public.patients p
          join public.clients c on c.id = p.client_id
          where
            p.id = patient_id
            and c.owner_user_id = (select auth.uid())
        )
      )
    )
  );
