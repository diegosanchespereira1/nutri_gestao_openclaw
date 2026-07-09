/**
 * Pedidos públicos de encerramento de conta (Google Play / LGPD).
 */

export const ACCOUNT_CLOSURE_SOURCES = ["public_web", "in_app"] as const;
export type AccountClosureSource = (typeof ACCOUNT_CLOSURE_SOURCES)[number];

export const ACCOUNT_CLOSURE_REQUEST_STATUSES = [
  "received",
  "email_sent",
  "pending_confirmation",
  "confirmed",
  "cancelled",
  "expired",
  "not_found",
  "failed",
] as const;

export type AccountClosureRequestStatus =
  (typeof ACCOUNT_CLOSURE_REQUEST_STATUSES)[number];

export const ACCOUNT_CLOSURE_STATUS_LABELS: Record<
  AccountClosureRequestStatus,
  string
> = {
  received: "Recebido",
  email_sent: "Email enviado",
  pending_confirmation: "Aguardando confirmação",
  confirmed: "Confirmado — conta bloqueada",
  cancelled: "Cancelado pelo titular",
  expired: "Expirado",
  not_found: "Email não cadastrado",
  failed: "Falha no processamento",
};

export type AccountClosureRequestRow = {
  id: string;
  email: string;
  user_id: string | null;
  profile_id: string | null;
  source: AccountClosureSource;
  status: AccountClosureRequestStatus;
  notes: string | null;
  failure_reason: string | null;
  requested_at: string;
  processed_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};

export type PublicAccountClosureSubmitInput = {
  email: string;
  notes?: string;
  confirmed: boolean;
};

export type PublicAccountClosureSubmitResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

export type PublicAccountClosureConfirmResponse = {
  success: boolean;
  message?: string;
  error?: string;
};
