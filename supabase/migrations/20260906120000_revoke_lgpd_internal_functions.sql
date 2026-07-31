-- SEGURANCA (critico): revogar acesso publico a funcoes internas do fluxo LGPD.
--
-- VULNERABILIDADE CORRIGIDA
--   Tres funcoes SECURITY DEFINER estavam com EXECUTE concedido aos roles
--   `anon` (nao autenticado) e `authenticated`. Encadeadas, permitiam que
--   QUALQUER pessoa sem login bloqueasse a conta de outro usuario por 10 anos,
--   sabendo apenas o e-mail da vitima:
--
--     1. lgpd_lookup_user_id_by_email(email)
--        -> consulta auth.users e devolve o user_id. Enumeracao de usuarios.
--
--     2. lgpd_set_pending_closure_for_user(user_id, token_hash, expires_at)
--        -> grava lgpd_cancel_token_hash no perfil da VITIMA. Valida apenas
--           length(token_hash) >= 32; NAO verifica se quem chama e o dono da
--           conta. O atacante escolhe o hash.
--
--     3. lgpd_confirm_closure_by_token(token)
--        -> confere sha256(token) contra o hash gravado e aplica
--           lgpd_blocked_at = now(), lgpd_blocked_until = now() + 10 anos.
--
--   Impacto: o bloqueio e aplicado via RLS em INSERT/UPDATE/DELETE de
--   clients, patients, scheduled_visits, consent_records e
--   establishment_areas -- a vitima perde a escrita nos proprios dados.
--   Tambem contornava o rate limit da aplicacao (checkAccountClosureRequestRateLimit),
--   que so protege a server action, nao a RPC chamada diretamente.
--
-- POR QUE E SEGURO REVOGAR
--   Verificado no repositorio: as tres funcoes sao chamadas exclusivamente
--   via createServiceRoleClient() (server-side), nunca do browser:
--     - lgpd_set_pending_closure_for_user   lib/actions/account-deletion.ts (~394)
--     - account_closure_request_sync_by_user lib/actions/account-deletion.ts (~68)
--     - lgpd_lookup_user_id_by_email        lib/actions/public-account-closure-request.ts (~97)
--   service_role mantem o EXECUTE -- o fluxo legitimo continua funcionando.
--
-- O QUE PERMANECE PUBLICO (de proposito)
--   lgpd_confirm_closure_by_token e lgpd_cancel_pending_by_token continuam
--   acessiveis ao anon: sao o destino dos links enviados por e-mail e exigem
--   conhecer um token de 32+ caracteres. Ambas sao chamadas com
--   createAnonSupabaseClient() em lib/actions/account-deletion.ts (~268 e ~340).

-- ---------------------------------------------------------------------------
-- 1) Enumeracao de usuarios: so o backend pode resolver e-mail -> user_id
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.lgpd_lookup_user_id_by_email(text)
  FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Elo critico: injetar token de encerramento em perfil arbitrario
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.lgpd_set_pending_closure_for_user(
  uuid, text, timestamp with time zone, text
) FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Alterar status de pedido de encerramento de qualquer usuario
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.account_closure_request_sync_by_user(
  uuid, text, timestamp with time zone, timestamp with time zone
) FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Higiene: remover grant implicito a PUBLIC
-- ---------------------------------------------------------------------------
-- lgpd_cancel_pending_by_token e a unica das cinco com `=X/postgres` na ACL
-- (EXECUTE para PUBLIC). O anon tem grant EXPLICITO e continua funcionando;
-- isto apenas evita que roles futuras herdem acesso sem querer.
REVOKE EXECUTE ON FUNCTION public.lgpd_cancel_pending_by_token(text) FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
