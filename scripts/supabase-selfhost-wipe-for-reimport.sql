-- =============================================================================
-- APAGA DADOS / SCHEMA DE APLICAÇÃO PARA IMPORTAR schema.sql + data.sql DE NOVO
-- Homologação self-hosted Supabase — PostgreSQL 15.x
--
-- PERIGO: irreversível. Só correr na base que queres zerar (ex.: postgres homolog).
-- Correr como superuser / postgres.
--
-- Ordem sugerida depois deste script:
--   1) schema.sql
--   2) data.sql  (com transaction_timeout comentado em PG15)
--
-- ERRO 25P02 ("current transaction is aborted"):
--   Abre um editor SQL novo OU corre primeiro:  ROLLBACK;
--   (acontece quando algum comando falhou dentro da mesma transação — ex.: DBeaver
--    com "transaction mode" e um GRANT/TRUNCATE a falhar.)
--
-- Este ficheiro NÃO usa BEGIN/COMMIT global: cada comando fecha no próprio commit
-- (modo autocommit). No DBeaver desativa "Open separate connection per editor"
-- problemático só se agrupares tudo numa transação manual.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Schema da app (tudo em public some; estrutura volta com schema.sql)
-- -----------------------------------------------------------------------------
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Papéis Supabase — falham sem erro fatal se o papel não existir (42704)
DO $$
BEGIN
  GRANT USAGE ON SCHEMA public TO anon;
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Grant anon ignorado (papel inexistente).';
END $$;
DO $$
BEGIN
  GRANT USAGE ON SCHEMA public TO authenticated;
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Grant authenticated ignorado (papel inexistente).';
END $$;
DO $$
BEGIN
  GRANT USAGE ON SCHEMA public TO service_role;
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Grant service_role ignorado (papel inexistente).';
END $$;

COMMENT ON SCHEMA public IS 'standard public schema';

-- -----------------------------------------------------------------------------
-- 2) Auth — esvaziar tabelas (mantém DDL das tabelas criadas pela imagem Supabase)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'auth'
      AND tablename <> 'schema_migrations'
    ORDER BY tablename
  LOOP
    EXECUTE format('TRUNCATE TABLE auth.%I RESTART IDENTITY CASCADE', r.tablename);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3) Storage — metadados (ficheiros nos buckets não são apagados pelo SQL;
--     só linhas na base). Ajusta se não usares storage no dump.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    FOR r IN
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'storage'
      ORDER BY tablename
    LOOP
      EXECUTE format('TRUNCATE TABLE storage.%I RESTART IDENTITY CASCADE', r.tablename);
    END LOOP;
  END IF;
END $$;

-- =============================================================================
-- Opcional: histórico de migrações aplicadas pelo CLI (se existir e quiseres
-- “zero” também para supabase db push). DESCOMENTA só se souberes o impacto.
-- =============================================================================
-- TRUNCATE supabase_migrations.schema_migrations RESTART IDENTITY CASCADE;
