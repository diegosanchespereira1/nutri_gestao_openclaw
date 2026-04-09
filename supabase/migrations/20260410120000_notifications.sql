-- Migration for Story 11.6: Notificações Push/Email Transversais
-- Tables: notifications, notification_preferences, fcm_tokens
-- Features: Event pipeline, multi-channel delivery, preference management, audit trail

-- ============================================================================
-- 1. NOTIFICATIONS TABLE
-- ============================================================================
-- Armazena todas as notificações enviadas/pendentes ao profissional
-- Registra histórico completo para compliance e replay

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tipo de evento que gerou a notificação
  event_type VARCHAR NOT NULL,

  -- Canal de entrega
  channel VARCHAR NOT NULL CHECK (channel IN ('push', 'email', 'both')),

  -- Conteúdo da notificação
  title VARCHAR NOT NULL,
  body TEXT NOT NULL,

  -- Dados contextuais em JSON (ex: { visit_id, patient_id, amount, etc })
  data JSONB DEFAULT '{}',

  -- Estado de entrega
  status VARCHAR NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Log de erro se falha na entrega
  error_message TEXT,

  -- Índices para queries frequentes
  CONSTRAINT valid_read_at CHECK (read_at IS NULL OR read_at >= created_at),
  CONSTRAINT valid_sent_at CHECK (sent_at IS NULL OR sent_at >= created_at)
);

CREATE INDEX idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_status_user
  ON notifications(status, user_id);
CREATE INDEX idx_notifications_event_type
  ON notifications(event_type, user_id);

-- RLS Policies para notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_own" ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. NOTIFICATION_PREFERENCES TABLE
-- ============================================================================
-- Preferences por evento: quais tipos o profissional quer receber
-- Controla: enabled (geral), push/email separados, quiet hours, urgency

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tipo de evento (visit_scheduled, financial_alert, etc)
  event_type VARCHAR NOT NULL,

  -- Controle geral
  enabled BOOLEAN NOT NULL DEFAULT true,

  -- Canais
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Urgência: 1=normal, 2=urgente, 3=crítico
  urgency_level INT NOT NULL DEFAULT 1
    CHECK (urgency_level BETWEEN 1 AND 3),

  -- Quiet hours (horário silencioso): não enviar entre start e end
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: um profissional, um tipo de evento
  UNIQUE(user_id, event_type)
);

CREATE INDEX idx_notification_preferences_user
  ON notification_preferences(user_id);

-- RLS Policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_select_own" ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences_insert_own" ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_preferences_update_own" ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences_delete_own" ON notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.notification_preferences_touch_updated_at ()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_preferences_update_timestamp ON notification_preferences;

CREATE TRIGGER notification_preferences_update_timestamp
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.notification_preferences_touch_updated_at ();

-- ============================================================================
-- 3. FCM_TOKENS TABLE
-- ============================================================================
-- Armazena Firebase Cloud Messaging tokens para envio de push web
-- Um profissional pode ter múltiplos devices (browser, dispositivos diferentes)

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- FCM token (longo)
  token TEXT NOT NULL UNIQUE,

  -- Identificação do device
  device_name VARCHAR,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fcm_tokens_user
  ON fcm_tokens(user_id);
CREATE INDEX idx_fcm_tokens_last_used
  ON fcm_tokens(last_used_at DESC);

-- RLS Policies
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fcm_tokens_select_own" ON fcm_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "fcm_tokens_insert_own" ON fcm_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fcm_tokens_update_own" ON fcm_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "fcm_tokens_delete_own" ON fcm_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. AUDIT LOGGING — Triggers
-- ============================================================================
-- Todos os eventos de notificação são registados em audit_log para compliance

CREATE OR REPLACE FUNCTION log_notification_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Log quando notificação é enviada (status muda de pending para sent)
  IF TG_OP = 'UPDATE' AND NEW.status = 'sent' AND OLD.status != 'sent' THEN
    INSERT INTO audit_log (
      operation,
      table_name,
      record_id,
      user_id,
      new_values,
      change_reason
    ) VALUES (
      'NOTIFICATION_SENT',
      'notifications',
      NEW.id::text,
      NEW.user_id,
      jsonb_build_object(
        'event_type', NEW.event_type,
        'channel', NEW.channel,
        'title', NEW.title
      ),
      'Sistema enviou notificação ao profissional'
    );
  END IF;

  -- Log quando notificação é marcada como lida
  IF TG_OP = 'UPDATE' AND NEW.read_at IS NOT NULL AND OLD.read_at IS NULL THEN
    INSERT INTO audit_log (
      operation,
      table_name,
      record_id,
      user_id,
      change_reason
    ) VALUES (
      'NOTIFICATION_OPENED',
      'notifications',
      NEW.id::text,
      NEW.user_id,
      'Profissional abriu notificação'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notifications_audit_trigger ON notifications;
CREATE TRIGGER notifications_audit_trigger
  AFTER UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION log_notification_event();

-- Log para mudanças em preferências
CREATE OR REPLACE FUNCTION log_notification_preference_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (
      operation,
      table_name,
      record_id,
      user_id,
      old_values,
      new_values,
      change_reason
    ) VALUES (
      'NOTIFICATION_PREFERENCE_CHANGED',
      'notification_preferences',
      NEW.id::text,
      NEW.user_id,
      jsonb_build_object(
        'enabled', OLD.enabled,
        'push_enabled', OLD.push_enabled,
        'email_enabled', OLD.email_enabled,
        'urgency_level', OLD.urgency_level
      ),
      jsonb_build_object(
        'enabled', NEW.enabled,
        'push_enabled', NEW.push_enabled,
        'email_enabled', NEW.email_enabled,
        'urgency_level', NEW.urgency_level
      ),
      'Profissional alterou preferências de notificação para ' || NEW.event_type
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_preferences_audit_trigger ON notification_preferences;
CREATE TRIGGER notification_preferences_audit_trigger
  AFTER UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION log_notification_preference_change();

-- ============================================================================
-- 5. INITIALIZATION — Default Preferences
-- ============================================================================
-- Função para inicializar preferências padrão para novo profissional
-- Chamada após registro na tabela users (via trigger em stories futuros)

CREATE OR REPLACE FUNCTION init_default_notification_preferences(p_user_id UUID)
RETURNS void AS $$
DECLARE
  event_types VARCHAR[] := ARRAY[
    'visit_scheduled',
    'visit_reminder',
    'financial_alert',
    'portaria_updated',
    'checklist_expiring',
    'consent_revoked',
    'patient_new',
    'dsar_request_completed'
  ];
  event_type VARCHAR;
BEGIN
  -- Inserir preferências padrão para cada tipo de evento
  FOREACH event_type IN ARRAY event_types LOOP
    INSERT INTO notification_preferences (
      user_id,
      event_type,
      enabled,
      push_enabled,
      email_enabled,
      urgency_level,
      quiet_hours_start,
      quiet_hours_end
    ) VALUES (
      p_user_id,
      event_type,
      true,
      true,
      true,
      CASE
        WHEN event_type IN ('portaria_updated', 'consent_revoked') THEN 3
        WHEN event_type IN ('financial_alert', 'checklist_expiring') THEN 2
        ELSE 1
      END,
      '22:00'::TIME,
      '08:00'::TIME
    ) ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. HELPER FUNCTION — Check if notification should be sent
-- ============================================================================
-- Verifica se uma notificação para um evento deve ser enviada (baseado em preferências + quiet hours)

CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_event_type VARCHAR,
  p_channel VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_preference RECORD;
  v_current_time TIME;
  v_is_in_quiet_hours BOOLEAN;
BEGIN
  -- Buscar preferência para este evento
  SELECT * INTO v_preference
  FROM notification_preferences
  WHERE user_id = p_user_id AND event_type = p_event_type;

  -- Se não há preferência, considerar desabilitado
  IF v_preference IS NULL THEN
    RETURN false;
  END IF;

  -- Se preferência global está desabilitada
  IF NOT v_preference.enabled THEN
    RETURN false;
  END IF;

  -- Verificar canal específico
  IF p_channel = 'push' AND NOT v_preference.push_enabled THEN
    RETURN false;
  END IF;

  IF p_channel = 'email' AND NOT v_preference.email_enabled THEN
    RETURN false;
  END IF;

  -- Verificar quiet hours
  IF v_preference.quiet_hours_start IS NOT NULL AND v_preference.quiet_hours_end IS NOT NULL THEN
    v_current_time := CURRENT_TIME::TIME;

    -- Se start > end (ex: 22:00 > 08:00), quiet hours cruzam meia-noite
    IF v_preference.quiet_hours_start > v_preference.quiet_hours_end THEN
      v_is_in_quiet_hours := v_current_time >= v_preference.quiet_hours_start
                          OR v_current_time < v_preference.quiet_hours_end;
    ELSE
      v_is_in_quiet_hours := v_current_time >= v_preference.quiet_hours_start
                          AND v_current_time < v_preference.quiet_hours_end;
    END IF;

    -- Se está em quiet hours, não enviar
    IF v_is_in_quiet_hours THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;
