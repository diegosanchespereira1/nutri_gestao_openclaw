/**
 * Types para Sistema de Notificações (Story 11.6)
 * Multi-channel (push + email), LGPD compliant, com audit trail
 */

// ============================================================================
// Event Types (tipos de evento que disparam notificações)
// ============================================================================

export type NotificationEventType =
  | 'visit_scheduled'
  | 'visit_reminder'
  | 'financial_alert'
  | 'portaria_updated'
  | 'checklist_expiring'
  | 'consent_revoked'
  | 'patient_new'
  | 'dsar_request_completed';

// Mapa de labels em português
export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventType, string> = {
  visit_scheduled: 'Visita agendada',
  visit_reminder: 'Lembrete de visita',
  financial_alert: 'Alerta financeiro',
  portaria_updated: 'Portaria atualizada',
  checklist_expiring: 'Checklist vencendo',
  consent_revoked: 'Consentimento revogado',
  patient_new: 'Novo paciente',
  dsar_request_completed: 'DSAR pronto',
};

// Descrições para exibição
export const NOTIFICATION_EVENT_DESCRIPTIONS: Record<NotificationEventType, string> = {
  visit_scheduled: 'Você agendou uma nova visita técnica',
  visit_reminder: 'Lembrete: você tem uma visita hoje',
  financial_alert: 'Um pagamento está vencido ou próximo de vencer',
  portaria_updated: 'Uma portaria foi atualizada, afetando um dos seus checklists',
  checklist_expiring: 'Um de seus checklists está próximo de vencer',
  consent_revoked: 'Um paciente revogou consentimento',
  patient_new: 'Um novo paciente foi adicionado',
  dsar_request_completed: 'A solicitação de DSAR foi processada',
};

// ============================================================================
// Channel Types
// ============================================================================

export type NotificationChannel = 'push' | 'email' | 'both';

// ============================================================================
// Status & Urgency
// ============================================================================

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export type UrgencyLevel = 1 | 2 | 3;
export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  1: 'Normal',
  2: 'Urgente',
  3: 'Crítico',
};

// ============================================================================
// Notification Entity
// ============================================================================

export interface Notification {
  id: string;
  user_id: string;
  event_type: NotificationEventType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data: Record<string, unknown>;
  status: NotificationStatus;
  created_at: string;
  sent_at: string | null;
  read_at: string | null;
  error_message: string | null;
}

// Para criação de notificações
export interface CreateNotificationInput {
  user_id: string;
  event_type: NotificationEventType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Para listagem com filtros
export interface NotificationListFilter {
  event_type?: NotificationEventType;
  status?: NotificationStatus;
  read?: boolean; // true = lido, false = não lido
  days?: 7 | 14 | 30; // últimos N dias
}

// ============================================================================
// NotificationPreference Entity
// ============================================================================

export interface NotificationPreference {
  id: string;
  user_id: string;
  event_type: NotificationEventType;
  enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  urgency_level: UrgencyLevel;
  quiet_hours_start: string | null; // "22:00"
  quiet_hours_end: string | null; // "08:00"
  created_at: string;
  updated_at: string;
}

// Para atualizar preferência
export interface UpdateNotificationPreferenceInput {
  enabled?: boolean;
  push_enabled?: boolean;
  email_enabled?: boolean;
  urgency_level?: UrgencyLevel;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
}

// ============================================================================
// FCM Token Entity (Firebase Cloud Messaging)
// ============================================================================

export interface FcmToken {
  id: string;
  user_id: string;
  token: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string;
}

export interface RegisterFcmTokenInput {
  token: string;
  device_name?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface NotificationResponse {
  success: boolean;
  message?: string;
  notification?: Notification;
  error?: string;
}

export interface NotificationListResponse {
  success: boolean;
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
}

export interface PreferenceResponse {
  success: boolean;
  preference?: NotificationPreference;
  error?: string;
}

export interface PreferenceListResponse {
  success: boolean;
  preferences: NotificationPreference[];
  error?: string;
}

// ============================================================================
// Email Template Context
// ============================================================================

export interface NotificationEmailContext {
  recipientName: string;
  title: string;
  body: string;
  eventType: NotificationEventType;
  notificationCenterUrl: string;
  data: Record<string, unknown>;
}

// ============================================================================
// Daily Summary (Sumário Matinal)
// ============================================================================

export interface DailySummary {
  date: string; // "2026-03-30"
  agenda: DailySummaryItem[];
  alerts: DailySummaryItem[];
  financial: DailySummaryItem[];
  updates: DailySummaryItem[];
  generatedAt: string;
}

export interface DailySummaryItem {
  title: string;
  description: string;
  icon: string; // emoji
  eventType: NotificationEventType;
  data: Record<string, unknown>;
}

// ============================================================================
// Audit & Compliance
// ============================================================================

export interface NotificationAuditEvent {
  operation: 'NOTIFICATION_SENT' | 'NOTIFICATION_OPENED' | 'NOTIFICATION_PREFERENCE_CHANGED';
  table_name: 'notifications' | 'notification_preferences';
  record_id: string;
  user_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  change_reason?: string;
  timestamp: string;
}
