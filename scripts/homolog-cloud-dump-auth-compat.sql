-- Rodar UMA VEZ no Postgres da homologação (DBeaver ou psql) ANTES de importar data.sql,
-- quando o dump veio do Supabase Cloud mais novo que o schema auth do self-hosted.
--
-- Erro típico sem isto: column "invite_token" of relation "flow_state" does not exist

ALTER TABLE auth.flow_state
  ADD COLUMN IF NOT EXISTS invite_token text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS oauth_client_state_id uuid,
  ADD COLUMN IF NOT EXISTS linking_target_id text,
  ADD COLUMN IF NOT EXISTS email_optional boolean NOT NULL DEFAULT false;

-- Próximo erro comum na mesma importação (sessions da cloud mais novo):
ALTER TABLE auth.sessions
  ADD COLUMN IF NOT EXISTS oauth_client_id uuid,
  ADD COLUMN IF NOT EXISTS refresh_token_hmac_key text,
  ADD COLUMN IF NOT EXISTS refresh_token_counter bigint,
  ADD COLUMN IF NOT EXISTS scopes text;
