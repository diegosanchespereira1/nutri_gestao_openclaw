-- Consentimentos: leitura/escrita por tenant do paciente (workspace), não só pelo autor.
-- consent_records.user_id continua a ser o profissional que registou (auditoria).

drop policy if exists "consent_select_own" on public.consent_records;
drop policy if exists "consent_insert_own" on public.consent_records;
drop policy if exists "consent_update_own" on public.consent_records;

create policy "consent_select_own"
  on public.consent_records for select
  to authenticated
  using (
    not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and exists (
      select 1
      from public.patients p
      where
        p.id = consent_records.patient_id
        and p.user_id = (select public.workspace_account_owner_id())
    )
  );

create policy "consent_insert_own"
  on public.consent_records for insert
  to authenticated
  with check (
    not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.patients p
      where
        p.id = patient_id
        and p.user_id = (select public.workspace_account_owner_id())
    )
  );

create policy "consent_update_own"
  on public.consent_records for update
  to authenticated
  using (
    not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and status = 'active'
    and exists (
      select 1
      from public.patients p
      where
        p.id = consent_records.patient_id
        and p.user_id = (select public.workspace_account_owner_id())
    )
  )
  with check (
    not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and (status = 'active' or status = 'revogado')
    and exists (
      select 1
      from public.patients p
      where
        p.id = patient_id
        and p.user_id = (select public.workspace_account_owner_id())
    )
  );

-- Parental: qualquer consentimento parental ativo do paciente (equipa) satisfaz o trigger.
create or replace function public.validate_parental_consent()
returns trigger
language plpgsql
as $$
declare
  patient_age int;
  existing_parental_consent boolean;
begin
  select
    extract(year from age(p.date_of_birth))::int,
    exists(
      select 1 from public.consent_records cr
      where cr.patient_id = new.patient_id
        and cr.is_parental_consent = true
        and cr.status = 'active'
        and cr.consent_type = new.consent_type
    )
  into patient_age, existing_parental_consent
  from public.patients p
  where p.id = new.patient_id;

  if patient_age < 18 and new.status = 'active' then
    if not new.is_parental_consent and not existing_parental_consent then
      raise exception 'Consentimento de responsável legal é obrigatório para pacientes menores de 18 anos';
    end if;
  end if;

  return new;
end;
$$;
