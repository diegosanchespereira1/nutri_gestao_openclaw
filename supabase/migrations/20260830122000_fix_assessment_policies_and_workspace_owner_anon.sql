-- Ajusta policies de avaliação que estavam TO public (inclui anon) e usam
-- workspace_account_owner_id(). Depois revoga anon dessa função RLS-helper.
--
-- Defensivo: só age se a tabela/função existir (ambientes DEV/PROD podem divergir).

-- ── patient_adult_nutrition_assessments ──────────────────────────────────────
do $$
begin
  if to_regclass('public.patient_adult_nutrition_assessments') is not null then
    drop policy if exists "owner via patient chain adult nutrition"
      on public.patient_adult_nutrition_assessments;

    create policy "owner via patient chain adult nutrition"
      on public.patient_adult_nutrition_assessments
      for all
      to authenticated
      using (
        patient_id in (
          select p.id
          from public.patients p
          where p.user_id = (select public.workspace_account_owner_id())
        )
      )
      with check (
        patient_id in (
          select p.id
          from public.patients p
          where p.user_id = (select public.workspace_account_owner_id())
        )
      );
  else
    raise notice 'Skipping: public.patient_adult_nutrition_assessments not found';
  end if;
end $$;

-- ── patient_geriatric_assessments ────────────────────────────────────────────
do $$
begin
  if to_regclass('public.patient_geriatric_assessments') is not null then
    drop policy if exists "owner via patient chain"
      on public.patient_geriatric_assessments;

    create policy "owner via patient chain"
      on public.patient_geriatric_assessments
      for all
      to authenticated
      using (
        patient_id in (
          select p.id
          from public.patients p
          where p.user_id = (select public.workspace_account_owner_id())
        )
      )
      with check (
        patient_id in (
          select p.id
          from public.patients p
          where p.user_id = (select public.workspace_account_owner_id())
        )
      );
  else
    raise notice 'Skipping: public.patient_geriatric_assessments not found';
  end if;
end $$;

-- ── Agora seguro revogar anon de workspace_account_owner_id (121 policies RLS) ─
do $$
begin
  if to_regprocedure('public.workspace_account_owner_id()') is not null then
    revoke execute on function public.workspace_account_owner_id() from public;
    revoke execute on function public.workspace_account_owner_id() from anon;
    grant execute on function public.workspace_account_owner_id() to authenticated;
  else
    raise notice 'Skipping: public.workspace_account_owner_id() not found';
  end if;
end $$;
