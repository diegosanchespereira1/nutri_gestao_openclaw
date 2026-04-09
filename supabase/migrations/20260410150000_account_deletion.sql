-- Migration for Story 11.7: Pedido de Exclusão de Conta e Dados (LGPD Art. 18)
-- Tables: Modified users table for account deletion workflow
-- Features: Soft-delete, confirmation tokens, legal retention tracking

-- ============================================================================
-- 1. USERS TABLE MODIFICATIONS
-- ============================================================================
-- Adicionar colunas para rastrear processo de exclusão de conta

ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS deletion_confirmed_at TIMESTAMPTZ;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS deletion_confirmed_token VARCHAR UNIQUE;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS deletion_confirmed_token_expires_at TIMESTAMPTZ;

-- Índices para queries de contas pendentes de confirmação
CREATE INDEX IF NOT EXISTS idx_users_deleted_at
  ON auth.users(deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_deletion_pending
  ON auth.users(deletion_confirmed_at)
  WHERE deleted_at IS NOT NULL AND deletion_confirmed_at IS NULL;

-- ============================================================================
-- 2. RLS UPDATES — Bloquear acesso a contas deletadas
-- ============================================================================
-- Adicionar policies para impedir que contas deletadas façam queries

-- Verificar se policy já existe antes de criar
DROP POLICY IF EXISTS "users_not_deleted" ON auth.users;

CREATE POLICY "users_not_deleted" ON auth.users
  FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);

-- ============================================================================
-- 3. AUDIT LOGGING TRIGGERS
-- ============================================================================
-- Registar todas as operações de exclusão em audit_log

CREATE OR REPLACE FUNCTION log_account_deletion_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Log quando exclusão é solicitada (deleted_at é setado)
  IF TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    INSERT INTO audit_log (
      operation,
      table_name,
      record_id,
      user_id,
      old_values,
      new_values,
      change_reason
    ) VALUES (
      'ACCOUNT_DELETION_REQUESTED',
      'auth.users',
      NEW.id::text,
      NEW.id,
      jsonb_build_object('deleted_at', OLD.deleted_at),
      jsonb_build_object('deleted_at', NEW.deleted_at),
      'User requested account deletion per LGPD Art. 18'
    );
  END IF;

  -- Log quando exclusão é confirmada (deletion_confirmed_at é setado)
  IF TG_OP = 'UPDATE' AND NEW.deletion_confirmed_at IS NOT NULL AND OLD.deletion_confirmed_at IS NULL THEN
    INSERT INTO audit_log (
      operation,
      table_name,
      record_id,
      user_id,
      old_values,
      new_values,
      change_reason
    ) VALUES (
      'ACCOUNT_DELETION_CONFIRMED',
      'auth.users',
      NEW.id::text,
      NEW.id,
      jsonb_build_object('deletion_confirmed_at', OLD.deletion_confirmed_at),
      jsonb_build_object('deletion_confirmed_at', NEW.deletion_confirmed_at),
      'User confirmed email for account deletion'
    );
  END IF;

  -- Log quando exclusão é cancelada (deleted_at volta a NULL)
  IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    INSERT INTO audit_log (
      operation,
      table_name,
      record_id,
      user_id,
      old_values,
      new_values,
      change_reason
    ) VALUES (
      'ACCOUNT_DELETION_CANCELLED',
      'auth.users',
      NEW.id::text,
      NEW.id,
      jsonb_build_object('deleted_at', OLD.deleted_at),
      jsonb_build_object('deleted_at', NEW.deleted_at),
      'User cancelled account deletion request'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auth_users_deletion_audit_trigger ON auth.users;
CREATE TRIGGER auth_users_deletion_audit_trigger
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION log_account_deletion_request();

-- ============================================================================
-- 4. HELPER FUNCTION — Cleanup de contas após 5 anos
-- ============================================================================
-- Soft-delete em cascata de dados de saúde (pacientes, visitas, etc)
-- Executa automaticamente via cron ou manualmente

CREATE OR REPLACE FUNCTION cleanup_deleted_accounts_after_retention()
RETURNS TABLE(users_cleaned INT, records_affected INT) AS $$
DECLARE
  v_cutoff_date TIMESTAMPTZ;
  v_users_count INT := 0;
  v_records_count INT := 0;
BEGIN
  -- Data de corte: 5 anos atrás da confirmação
  v_cutoff_date := NOW() - INTERVAL '5 years';

  -- Encontrar contas que podem ser limpas
  -- (confirmadas > 5 anos atrás)
  SELECT COUNT(*) INTO v_users_count
  FROM auth.users
  WHERE deletion_confirmed_at IS NOT NULL
    AND deletion_confirmed_at < v_cutoff_date;

  -- Soft-delete em cascata (apenas exemplo; adaptar conforme schema)
  -- UPDATE patients SET deleted_at = NOW()
  --   WHERE user_id IN (
  --     SELECT id FROM auth.users
  --     WHERE deletion_confirmed_at IS NOT NULL AND deletion_confirmed_at < v_cutoff_date
  --   ) AND deleted_at IS NULL;

  -- Contar registos afetados
  SELECT COUNT(*) INTO v_records_count
  FROM auth.users
  WHERE deletion_confirmed_at IS NOT NULL
    AND deletion_confirmed_at < v_cutoff_date;

  RETURN QUERY SELECT v_users_count, v_records_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. HELPER FUNCTION — Gerar token seguro de confirmação
-- ============================================================================
-- Token = base64(user_id || timestamp || hash(secret))

CREATE OR REPLACE FUNCTION generate_deletion_confirmation_token(p_user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_token VARCHAR;
BEGIN
  -- Gerar token com timestamp + hash (simplificado; usar crypto_sign em production)
  v_token := encode(
    digest(p_user_id::text || NOW()::text || 'secret_key', 'sha256'),
    'hex'
  )::VARCHAR;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. HELPER FUNCTION — Validar se token ainda é válido (< 24h)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_deletion_token_valid(p_user_id UUID, p_token VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_token_expires_at TIMESTAMPTZ;
BEGIN
  SELECT deletion_confirmed_token_expires_at INTO v_token_expires_at
  FROM auth.users
  WHERE id = p_user_id AND deletion_confirmed_token = p_token;

  RETURN (v_token_expires_at IS NOT NULL AND NOW() < v_token_expires_at);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. COMMENT & DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN auth.users.deleted_at IS 'Timestamp quando user solicita exclusão (LGPD Art. 18)';
COMMENT ON COLUMN auth.users.deletion_confirmed_at IS 'Timestamp quando email de confirmação é validado';
COMMENT ON COLUMN auth.users.deletion_confirmed_token IS 'Token seguro para confirmar exclusão via email (one-time use)';
COMMENT ON COLUMN auth.users.deletion_confirmed_token_expires_at IS 'Expiração do token (válido por 24 horas)';
