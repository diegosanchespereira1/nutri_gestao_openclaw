-- Histórico: esta migração tentava alterar `auth.users` (soft-delete, tokens).
-- Isso falha em `supabase db reset` local (migrações não são owner de `auth.users`)
-- e está obsoleto face ao modelo actual: bloqueio LGPD em `public.profiles` +
-- RPCs (ver `20260521100000_profiles_lgpd_block.sql`).
--
-- Mantido como no-op para não quebrar ordem nem repositórios que já registaram
-- esta versão em `schema_migrations`. Não executar DDL em `auth` aqui.

select 1;
