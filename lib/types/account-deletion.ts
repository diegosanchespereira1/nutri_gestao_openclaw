/**
 * Types — encerramento de acesso à conta (Story 11.7, LGPD).
 * Modelo: bloqueio + retenção 10 anos; dados clínicos não são apagados de imediato.
 */

export const LGPD_RETENTION_YEARS = 10;

export type ClosureStatus = "none" | "pending" | "blocked";

export const CLOSURE_STATUS_LABELS: Record<ClosureStatus, string> = {
  none: "Nenhum pedido ativo",
  pending: "Pedido pendente — confirme por email (24h)",
  blocked: "Acesso encerrado (retenção legal)",
};

export const CLOSURE_STATUS_DESCRIPTIONS: Record<ClosureStatus, string> = {
  none: "A sua conta está ativa.",
  pending:
    "Recebeu um email com links para confirmar o encerramento do acesso ou cancelar dentro de 24 horas.",
  blocked:
    "O seu acesso à plataforma foi encerrado. Os dados clínicos permanecem retidos pelo período legal.",
};

export interface AccountClosureState {
  status: ClosureStatus;
  lgpd_blocked_at: string | null;
  lgpd_blocked_until: string | null;
  lgpd_cancel_token_expires_at: string | null;
  hours_until_expiry?: number;
}

export interface DeleteAccountRequest {
  password: string;
  confirmed: boolean;
}

export interface DeleteAccountResponse {
  success: boolean;
  message?: string;
  email?: string;
  expires_at?: string;
  error?: string;
}

export interface ConfirmClosureResponse {
  success: boolean;
  message?: string;
  status?: ClosureStatus;
  error?: string;
}

export interface CancelClosureResponse {
  success: boolean;
  message?: string;
  status?: ClosureStatus;
  error?: string;
}

export interface ClosureStatusResponse {
  success: boolean;
  status?: AccountClosureState;
  error?: string;
}
