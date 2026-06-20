-- Auditoria focada: profissional responsável pelo paciente (acompanhamento/atendimento).
-- Substitui triggers genéricos em patients por payload enxuto e UPDATE só quando o responsável muda.

create or replace function public.audit_patients_row_json (p public.patients)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'responsible_team_member_id', p.responsible_team_member_id
  );
$$;

create or replace function public.audit_patients_ai ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    expires_at,
    actor_user_id
  ) values (
    new.user_id,
    'patients',
    'INSERT',
    new.id,
    null,
    public.audit_patients_row_json(new),
    now() + interval '12 months',
    auth.uid()
  );
  return new;
end;
$$;

create or replace function public.audit_patients_au ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.responsible_team_member_id is not distinct from new.responsible_team_member_id then
    return new;
  end if;

  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    expires_at,
    actor_user_id
  ) values (
    new.user_id,
    'patients',
    'UPDATE',
    new.id,
    public.audit_patients_row_json(old),
    public.audit_patients_row_json(new),
    now() + interval '12 months',
    auth.uid()
  );
  return new;
end;
$$;

create or replace function public.audit_patients_ad ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (
    user_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    expires_at,
    actor_user_id
  ) values (
    old.user_id,
    'patients',
    'DELETE',
    old.id,
    public.audit_patients_row_json(old),
    null,
    now() + interval '12 months',
    auth.uid()
  );
  return old;
end;
$$;

drop trigger if exists audit_patients_ai on public.patients;
create trigger audit_patients_ai
after insert on public.patients
for each row
execute function public.audit_patients_ai ();

drop trigger if exists audit_patients_au on public.patients;
create trigger audit_patients_au
after update on public.patients
for each row
execute function public.audit_patients_au ();

drop trigger if exists audit_patients_ad on public.patients;
create trigger audit_patients_ad
after delete on public.patients
for each row
execute function public.audit_patients_ad ();

notify pgrst, 'reload schema';
