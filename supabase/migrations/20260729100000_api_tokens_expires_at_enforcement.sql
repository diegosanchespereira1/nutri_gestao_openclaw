-- Tokens API: exigir expires_at e preencher tokens legados sem data de expiração.

alter table public.api_tokens
  alter column expires_at set default (now() + interval '365 days');

update public.api_tokens
set expires_at = created_at + interval '365 days'
where expires_at is null
  and revoked_at is null;

create index if not exists api_tokens_expires_idx
  on public.api_tokens (expires_at)
  where revoked_at is null;

comment on column public.api_tokens.expires_at is
  'Data de expiração do token; tokens sem expires_at ou expirados são rejeitados na validação.';
