/**
 * Types para Sistema de Exclusão de Conta (Story 11.7)
 * LGPD Art. 18 (Right to be Forgotten) com retenção legal
 */

// ============================================================================
// Deletion Status
// ============================================================================

export type DeletionStatus = 'none' | 'pending' | 'confirmed' | 'deleted';

export const DELETION_STATUS_LABELS: Record<DeletionStatus, string> = {
  none: 'Nenhuma solicitação',
  pending: 'Pendente de confirmação (24h)',
  confirmed: 'Confirmado - aguardando expiração',
  deleted: 'Conta deletada',
};

export const DELETION_STATUS_DESCRIPTIONS: Record<DeletionStatus, string> = {
  none: 'Sua conta está ativa',
  pending: 'Você solicitou exclusão. Confirme por email dentro de 24h.',
  confirmed: 'Sua conta será deletada após período de retenção legal (5 anos)',
  deleted: 'Sua conta foi deletada. Dados de saúde retidos conforme lei.',
};

// ============================================================================
// Deletion Request & State
// ============================================================================

export interface AccountDeletionState {
  status: DeletionStatus;
  deleted_at: string | null;
  deletion_confirmed_at: string | null;
  deletion_confirmed_token: string | null;
  deletion_confirmed_token_expires_at: string | null;
  hours_until_expiry?: number;
}

export interface DeleteAccountRequest {
  password: string;
  confirmed: boolean;
}

export interface ConfirmDeletionRequest {
  token: string;
}

export interface CancelDeletionRequest {
  token: string;
}

// ============================================================================
// API Responses
// ============================================================================

export interface DeleteAccountResponse {
  success: boolean;
  message?: string;
  token?: string;
  email?: string;
  expires_at?: string;
  error?: string;
}

export interface ConfirmDeletionResponse {
  success: boolean;
  message?: string;
  status?: DeletionStatus;
  error?: string;
}

export interface CancelDeletionResponse {
  success: boolean;
  message?: string;
  status?: DeletionStatus;
  error?: string;
}

export interface DeletionStatusResponse {
  success: boolean;
  status?: AccountDeletionState;
  error?: string;
}

// ============================================================================
// Email Context
// ============================================================================

export interface DeletionConfirmationEmailContext {
  recipientName: string;
  email: string;
  confirmationLink: string;
  expiresIn24h: string;
  cancelLink: string;
  retentionYears: number;
  immediateDelete: string[];
  retainedData: string[];
}

// ============================================================================
// Timeline Item
// ============================================================================

export interface DeletionTimelineItem {
  time: string;
  label: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  icon: string;
}

// ============================================================================
// Compliance & Audit
// ============================================================================

export interface DeletionAuditEvent {
  operation: 'ACCOUNT_DELETION_REQUESTED' | 'ACCOUNT_DELETION_CONFIRMED' | 'ACCOUNT_DELETION_CANCELLED';
  user_id: string;
  deleted_at?: string;
  deletion_confirmed_at?: string;
  timestamp: string;
  ip_address?: string;
}
