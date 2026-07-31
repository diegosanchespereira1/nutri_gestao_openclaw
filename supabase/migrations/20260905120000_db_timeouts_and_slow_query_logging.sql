-- Hardening de disponibilidade: timeouts de sessao + log de queries lentas.
--
-- MOTIVACAO
--   Analise dos advisors do Supabase (30/07/2026) nao encontrou nenhum gargalo
--   critico de performance: 62 "unused_index" somam apenas 1,1 MB (8% do espaco
--   de indices) e as 11 "multiple_permissive_policies" usam predicados que nao
--   referenciam a linha (o planner avalia uma vez, como InitPlan). O padrao
--   (SELECT auth.uid()) ja esta aplicado -- nenhum auth_rls_initplan reportado.
--
--   Os riscos reais de indisponibilidade estao FORA dos advisors: sao os
--   limites de sessao que hoje nao existem. Com apenas 60 conexoes diretas
--   (compute Micro), sessoes presas consomem slots e podem derrubar a app.
--
-- ESTADO ANTES (medido em 30/07/2026)
--   idle_in_transaction_session_timeout = 0      (desabilitado, global)
--   statement_timeout global               = 120s
--   role authenticator                     = statement_timeout 8s, lock_timeout 8s
--   role authenticated                     = statement_timeout 8s
--   role anon                              = statement_timeout 3s
--   role service_role                      = (nenhuma config)
--   log_min_duration_statement             = -1  (desligado)
--
-- ESCOPO: apenas parametros de sessao. Nao altera schema, dados, funcoes,
-- policies nem indices. Totalmente reversivel (ver secao de rollback no .md).

-- ---------------------------------------------------------------------------
-- 1) idle_in_transaction_session_timeout no nivel do BANCO
-- ---------------------------------------------------------------------------
-- Rede de seguranca contra sessao que abre transacao e trava, segurando locks
-- e um slot de conexao indefinidamente. A aplicacao usa somente supabase-js
-- (PostgREST), que faz transacoes curtas por request -- entao o alvo real aqui
-- sao sessoes manuais: psql, SQL editor do Studio, scripts de manutencao.
--
-- 60s e folgado para qualquer transacao legitima da app e ainda assim impede
-- que uma sessao esquecida segure recursos para sempre.
--
-- Usa DO/format para funcionar em qualquer nome de banco (prod usa "postgres",
-- ambientes self-hosted podem diferir).
DO $$
BEGIN
  EXECUTE format(
    'ALTER DATABASE %I SET idle_in_transaction_session_timeout = %L',
    current_database(), '60s'
  );
END
$$;

-- ---------------------------------------------------------------------------
-- 2) statement_timeout explicito para service_role
-- ---------------------------------------------------------------------------
-- service_role tem BYPASSRLS: suas queries nao sao restringidas por policy e
-- podem varrer a base inteira. Hoje ela nao tem statement_timeout proprio.
--
-- O valor efetivo atual e INCERTO: o PostgREST conecta como "authenticator"
-- (que tem 8s) e depois faz SET ROLE service_role. Nao foi possivel medir por
-- aqui se, apos o SET ROLE, prevalece o 8s do authenticator ou o 120s global.
-- Definir explicitamente elimina a ambiguidade -- e a validacao no .md mostra
-- como medir o valor efetivo real depois de aplicar.
--
-- 15s > 8s do authenticated de proposito: rotinas administrativas (relatorios,
-- exportacoes) sao naturalmente mais pesadas que um request de usuario.
ALTER ROLE service_role SET statement_timeout = '15s';
ALTER ROLE service_role SET idle_in_transaction_session_timeout = '30s';

-- ---------------------------------------------------------------------------
-- 3) Log de queries lentas — NAO aplicavel no Supabase hosted
-- ---------------------------------------------------------------------------
-- Em projetos hosted, o role postgres NAO tem permissao para
-- ALTER DATABASE ... SET log_min_duration_statement (erro 42501).
-- Esse parametro e controlado pela plataforma / Dashboard.
-- Mantido aqui como documentacao do intent; nao executar.
