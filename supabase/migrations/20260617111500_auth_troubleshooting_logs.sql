-- Logs técnicos de autenticação para troubleshooting (sem dados de senha).

create table if not exists public.auth_troubleshooting_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,
  event text not null,
  step text,
  outcome text,
  email text,
  user_id uuid references auth.users (id) on delete set null,
  error_code text,
  error_message text,
  next_path text,
  has_session boolean,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists auth_troubleshooting_logs_created_idx
  on public.auth_troubleshooting_logs (created_at desc);

create index if not exists auth_troubleshooting_logs_email_created_idx
  on public.auth_troubleshooting_logs (email, created_at desc)
  where email is not null;

create index if not exists auth_troubleshooting_logs_request_idx
  on public.auth_troubleshooting_logs (request_id, created_at desc)
  where request_id is not null;

alter table public.auth_troubleshooting_logs enable row level security;

-- Sem policies para utilizadores comuns: leitura/escrita apenas via service role.
grant insert, select on public.auth_troubleshooting_logs to service_role;
