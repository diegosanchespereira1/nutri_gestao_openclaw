-- Story 11.7 — Bloqueio LGPD: retenção 10 anos, escrita bloqueada, leitura admin.
-- RPCs SECURITY DEFINER para não alargar grants perigosos em profiles.

create extension if not exists pgcrypto;

-- ── Colunas em profiles ───────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists lgpd_blocked_at timestamptz,
  add column if not exists lgpd_blocked_reason text,
  add column if not exists lgpd_blocked_until timestamptz,
  add column if not exists lgpd_blocked_by uuid references auth.users (id) on delete set null,
  add column if not exists lgpd_unblocked_at timestamptz,
  add column if not exists lgpd_unblocked_by uuid references auth.users (id) on delete set null,
  add column if not exists lgpd_cancel_token_hash text,
  add column if not exists lgpd_cancel_token_expires_at timestamptz;

create index if not exists profiles_lgpd_blocked_idx
  on public.profiles (user_id)
  where lgpd_blocked_at is not null and lgpd_unblocked_at is null;

comment on column public.profiles.lgpd_blocked_at is 'Bloqueio LGPD ativo: titular sem acesso; dados retidos (10 anos).';
comment on column public.profiles.lgpd_unblocked_at is 'Desbloqueio administrativo; escrita reposta.';

-- ── Função: tenant com bloqueio LGPD ativo ─────────────────────────────────────

create or replace function public.profile_lgpd_is_actively_blocked(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = p_user_id
      and p.lgpd_blocked_at is not null
      and p.lgpd_unblocked_at is null
  );
$$;

-- ── Auditoria LGPD (definer — não expõe insert em audit_log a authenticated) ───

create or replace function public.lgpd_audit_event(
  p_subject_user_id uuid,
  p_profile_id uuid,
  p_event text,
  p_payload jsonb default '{}'::jsonb
)
returns void
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
    status
  ) values (
    p_subject_user_id,
    'profiles',
    'UPDATE',
    p_profile_id,
    null,
    jsonb_build_object('event', p_event) || p_payload,
    'active'
  );
end;
$$;

-- ── Pedido pendente (email com token) ────────────────────────────────────────

create or replace function public.lgpd_set_pending_closure(
  p_token_hash text,
  p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
begin
  if uid is null then
    raise exception 'Sessão necessária';
  end if;

  if p_token_hash is null or length(p_token_hash) < 32 then
    raise exception 'Token inválido';
  end if;

  select id into pid
  from public.profiles
  where user_id = uid
  for update;

  if pid is null then
    raise exception 'Perfil não encontrado';
  end if;

  if public.profile_lgpd_is_actively_blocked(uid) then
    raise exception 'Conta já está bloqueada';
  end if;

  update public.profiles
  set
    lgpd_cancel_token_hash = p_token_hash,
    lgpd_cancel_token_expires_at = p_expires_at,
    updated_at = now()
  where id = pid;

  perform public.lgpd_audit_event(
    uid,
    pid,
    'ACCOUNT_CLOSURE_REQUESTED',
    jsonb_build_object('expires_at', p_expires_at)
  );
end;
$$;

-- ── Confirmar bloqueio (sessão + token do email) ──────────────────────────────

create or replace function public.lgpd_confirm_closure(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  v_hash text;
begin
  if uid is null then
    raise exception 'Sessão necessária';
  end if;

  if p_token is null or length(p_token) < 32 then
    raise exception 'Token inválido';
  end if;

  v_hash := encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  select id into pid
  from public.profiles
  where user_id = uid
    and lgpd_cancel_token_hash = v_hash
    and lgpd_cancel_token_expires_at is not null
    and lgpd_cancel_token_expires_at > now()
    and lgpd_blocked_at is null
  for update;

  if pid is null then
    raise exception 'Token inválido ou expirado';
  end if;

  update public.profiles
  set
    lgpd_blocked_at = now(),
    lgpd_blocked_reason = 'lgpd_account_closure',
    lgpd_blocked_until = now() + interval '10 years',
    lgpd_blocked_by = uid,
    lgpd_cancel_token_hash = null,
    lgpd_cancel_token_expires_at = null,
    updated_at = now()
  where id = pid;

  perform public.lgpd_audit_event(
    uid,
    pid,
    'ACCOUNT_BLOCKED_LGPD',
    jsonb_build_object(
      'blocked_until',
      (select lgpd_blocked_until from public.profiles where id = pid)
    )
  );
end;
$$;

-- ── Cancelar pedido (sessão) ─────────────────────────────────────────────────────

create or replace function public.lgpd_cancel_pending_closure()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
begin
  if uid is null then
    raise exception 'Sessão necessária';
  end if;

  select id into pid
  from public.profiles
  where user_id = uid
    and lgpd_blocked_at is null
    and lgpd_cancel_token_hash is not null
  for update;

  if pid is null then
    raise exception 'Nenhum pedido pendente';
  end if;

  update public.profiles
  set
    lgpd_cancel_token_hash = null,
    lgpd_cancel_token_expires_at = null,
    updated_at = now()
  where id = pid;

  perform public.lgpd_audit_event(
    uid,
    pid,
    'ACCOUNT_CLOSURE_CANCELLED',
    '{}'::jsonb
  );
end;
$$;

-- ── Cancelar pedido (link sem sessão — anon) ───────────────────────────────────

create or replace function public.lgpd_cancel_pending_by_token(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  pid uuid;
  subj uuid;
begin
  if p_token is null or length(p_token) < 32 then
    return false;
  end if;

  v_hash := encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  select id, user_id into pid, subj
  from public.profiles
  where lgpd_cancel_token_hash = v_hash
    and lgpd_cancel_token_expires_at is not null
    and lgpd_cancel_token_expires_at > now()
    and lgpd_blocked_at is null
  for update;

  if pid is null then
    return false;
  end if;

  update public.profiles
  set
    lgpd_cancel_token_hash = null,
    lgpd_cancel_token_expires_at = null,
    updated_at = now()
  where id = pid;

  perform public.lgpd_audit_event(
    subj,
    pid,
    'ACCOUNT_CLOSURE_CANCELLED',
    jsonb_build_object('via', 'email_token')
  );

  return true;
end;
$$;

-- ── Desbloqueio administrativo ─────────────────────────────────────────────────

create or replace function public.lgpd_admin_unblock_profile(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  caller_role text;
  target_user uuid;
  pid uuid;
begin
  if uid is null then
    raise exception 'Sessão necessária';
  end if;

  select role into caller_role
  from public.profiles
  where user_id = uid;

  if caller_role is null or caller_role not in ('admin', 'super_admin') then
    raise exception 'Acesso negado';
  end if;

  select user_id, id into target_user, pid
  from public.profiles
  where id = p_profile_id;

  if target_user is null then
    raise exception 'Perfil não encontrado';
  end if;

  if not public.profile_lgpd_is_actively_blocked(target_user) then
    raise exception 'Conta não está bloqueada por LGPD';
  end if;

  update public.profiles
  set
    lgpd_unblocked_at = now(),
    lgpd_unblocked_by = uid,
    updated_at = now()
  where id = p_profile_id;

  perform public.lgpd_audit_event(
    target_user,
    p_profile_id,
    'ACCOUNT_UNBLOCKED',
    jsonb_build_object('unblocked_by_admin', uid)
  );

  return jsonb_build_object('user_id', target_user, 'profile_id', p_profile_id);
end;
$$;

grant execute on function public.lgpd_set_pending_closure(text, timestamptz) to authenticated;
grant execute on function public.lgpd_confirm_closure(text) to authenticated;
grant execute on function public.lgpd_cancel_pending_closure() to authenticated;
grant execute on function public.lgpd_cancel_pending_by_token(text) to anon;
grant execute on function public.lgpd_cancel_pending_by_token(text) to authenticated;
grant execute on function public.lgpd_admin_unblock_profile(uuid) to authenticated;

revoke all on function public.lgpd_audit_event(uuid, uuid, text, jsonb) from public;

-- ── RLS: clients ─────────────────────────────────────────────────────────────

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own"
  on public.clients for insert
  to authenticated
  with check (
    owner_user_id = (select auth.uid())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own"
  on public.clients for update
  to authenticated
  using (
    owner_user_id = (select auth.uid())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  )
  with check (
    owner_user_id = (select auth.uid())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own"
  on public.clients for delete
  to authenticated
  using (
    owner_user_id = (select auth.uid())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

drop policy if exists "clients_select_admin" on public.clients;
create policy "clients_select_admin"
  on public.clients for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles pr
      where pr.user_id = (select auth.uid())
        and pr.role in ('admin', 'super_admin')
    )
  );

-- ── RLS: patients (user_id — Story 2.1b) ─────────────────────────────────────

drop policy if exists "patients_insert_own" on public.patients;
create policy "patients_insert_own"
  on public.patients for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

drop policy if exists "patients_update_own" on public.patients;
create policy "patients_update_own"
  on public.patients for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

drop policy if exists "patients_delete_own" on public.patients;
create policy "patients_delete_own"
  on public.patients for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

drop policy if exists "patients_select_admin" on public.patients;
create policy "patients_select_admin"
  on public.patients for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles pr
      where pr.user_id = (select auth.uid())
        and pr.role in ('admin', 'super_admin')
    )
  );

-- ── RLS: scheduled_visits (inclui regras de alvo + team member) ────────────────

drop policy if exists "scheduled_visits_insert_own" on public.scheduled_visits;
create policy "scheduled_visits_insert_own"
  on public.scheduled_visits for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and (
      assigned_team_member_id is null
      or exists (
        select 1
        from public.team_members tm
        where
          tm.id = assigned_team_member_id
          and tm.owner_user_id = (select auth.uid())
      )
    )
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

drop policy if exists "scheduled_visits_update_own" on public.scheduled_visits;
create policy "scheduled_visits_update_own"
  on public.scheduled_visits for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
    and (
      assigned_team_member_id is null
      or exists (
        select 1
        from public.team_members tm
        where
          tm.id = assigned_team_member_id
          and tm.owner_user_id = (select auth.uid())
      )
    )
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

drop policy if exists "scheduled_visits_delete_own" on public.scheduled_visits;
create policy "scheduled_visits_delete_own"
  on public.scheduled_visits for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and not public.profile_lgpd_is_actively_blocked((select auth.uid()))
  );

drop policy if exists "scheduled_visits_select_admin" on public.scheduled_visits;
create policy "scheduled_visits_select_admin"
  on public.scheduled_visits for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles pr
      where pr.user_id = (select auth.uid())
        and pr.role in ('admin', 'super_admin')
    )
  );
