-- Página pública de exclusão de conta (Google Play + LGPD).
-- Fila de pedidos + RPCs para fluxo sem login.

create table if not exists public.account_closure_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  source text not null default 'public_web'
    check (source in ('public_web', 'in_app')),
  status text not null default 'received'
    check (status in (
      'received',
      'email_sent',
      'pending_confirmation',
      'confirmed',
      'cancelled',
      'expired',
      'not_found',
      'failed'
    )),
  notes text,
  ip_hash text,
  user_agent text,
  failure_reason text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_closure_requests_status_idx
  on public.account_closure_requests (status, requested_at desc);

create index if not exists account_closure_requests_email_idx
  on public.account_closure_requests (lower(trim(email)), requested_at desc);

create index if not exists account_closure_requests_user_id_idx
  on public.account_closure_requests (user_id)
  where user_id is not null;

comment on table public.account_closure_requests is
  'Pedidos de encerramento de conta recebidos via web pública ou app (Google Play / LGPD).';

alter table public.account_closure_requests enable row level security;

-- Leitura: admin e super_admin
create policy "account_closure_requests_admin_select"
  on public.account_closure_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );

-- Escrita apenas via service_role (server actions)

-- ── Lookup email → user_id (service role) ─────────────────────────────────────

create or replace function public.lgpd_lookup_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id
  from auth.users u
  where lower(trim(u.email)) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.lgpd_lookup_user_id_by_email(text) from public;
grant execute on function public.lgpd_lookup_user_id_by_email(text) to service_role;

-- ── Pedido pendente para user_id (service role — formulário público) ──────────

create or replace function public.lgpd_set_pending_closure_for_user(
  p_user_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_source text default 'public_web'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  if p_user_id is null then
    raise exception 'Utilizador inválido';
  end if;

  if p_token_hash is null or length(p_token_hash) < 32 then
    raise exception 'Token inválido';
  end if;

  select id into pid
  from public.profiles
  where user_id = p_user_id
  for update;

  if pid is null then
    raise exception 'Perfil não encontrado';
  end if;

  if public.profile_lgpd_is_actively_blocked(p_user_id) then
    raise exception 'Conta já está bloqueada';
  end if;

  update public.profiles
  set
    lgpd_cancel_token_hash = p_token_hash,
    lgpd_cancel_token_expires_at = p_expires_at,
    updated_at = now()
  where id = pid;

  perform public.lgpd_audit_event(
    p_user_id,
    pid,
    'ACCOUNT_CLOSURE_REQUESTED',
    jsonb_build_object(
      'expires_at', p_expires_at,
      'source', coalesce(p_source, 'public_web')
    )
  );

  return pid;
end;
$$;

revoke all on function public.lgpd_set_pending_closure_for_user(uuid, text, timestamptz, text) from public;
grant execute on function public.lgpd_set_pending_closure_for_user(uuid, text, timestamptz, text) to service_role;

-- ── Confirmar bloqueio por token (sem sessão — link do email) ───────────────

create or replace function public.lgpd_confirm_closure_by_token(p_token text)
returns uuid
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
    return null;
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
    return null;
  end if;

  update public.profiles
  set
    lgpd_blocked_at = now(),
    lgpd_blocked_reason = 'lgpd_account_closure',
    lgpd_blocked_until = now() + interval '10 years',
    lgpd_blocked_by = subj,
    lgpd_cancel_token_hash = null,
    lgpd_cancel_token_expires_at = null,
    updated_at = now()
  where id = pid;

  perform public.lgpd_audit_event(
    subj,
    pid,
    'ACCOUNT_BLOCKED_LGPD',
    jsonb_build_object(
      'via', 'email_token',
      'blocked_until',
      (select lgpd_blocked_until from public.profiles where id = pid)
    )
  );

  return subj;
end;
$$;

revoke all on function public.lgpd_confirm_closure_by_token(text) from public;
grant execute on function public.lgpd_confirm_closure_by_token(text) to anon;
grant execute on function public.lgpd_confirm_closure_by_token(text) to authenticated;
grant execute on function public.lgpd_confirm_closure_by_token(text) to service_role;

-- ── Sincronizar status da fila após confirm/cancel ────────────────────────────

create or replace function public.account_closure_request_sync_by_user(
  p_user_id uuid,
  p_status text,
  p_confirmed_at timestamptz default null,
  p_cancelled_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.account_closure_requests
  set
    status = p_status,
    confirmed_at = coalesce(p_confirmed_at, confirmed_at),
    cancelled_at = coalesce(p_cancelled_at, cancelled_at),
    processed_at = now(),
    updated_at = now()
  where user_id = p_user_id
    and status in ('received', 'email_sent', 'pending_confirmation')
    and id = (
      select acr.id
      from public.account_closure_requests acr
      where acr.user_id = p_user_id
        and acr.status in ('received', 'email_sent', 'pending_confirmation')
      order by acr.requested_at desc
      limit 1
    );
end;
$$;

revoke all on function public.account_closure_request_sync_by_user(uuid, text, timestamptz, timestamptz) from public;
grant execute on function public.account_closure_request_sync_by_user(uuid, text, timestamptz, timestamptz) to service_role;
