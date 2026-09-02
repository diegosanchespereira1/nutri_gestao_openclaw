import type { SignupIntentStatus } from "@/lib/signup/types";

export const CHECKOUT_TTL_SECONDS = 60 * 60;

export function checkoutExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + CHECKOUT_TTL_SECONDS * 1000);
}

export function checkoutExpiresAtUnix(from: Date = new Date()): number {
  return Math.floor(checkoutExpiresAt(from).getTime() / 1000);
}

/** Só notifica quem chegou no Stripe e a sessão expirou sem pagamento. */
export function shouldNotifyCheckoutAbandonment(intent: {
  status: SignupIntentStatus;
  notified_at: string | null;
  stripe_checkout_session_id: string | null;
}): boolean {
  return (
    intent.status === "checkout" &&
    !intent.notified_at &&
    Boolean(intent.stripe_checkout_session_id)
  );
}

export function isStaleCheckoutExpiration(input: {
  intentSessionId: string | null;
  expiredSessionId: string;
  status: SignupIntentStatus;
}): boolean {
  if (input.status === "pago" || input.status === "conta_criada") return true;
  if (!input.intentSessionId) return true;
  return input.intentSessionId !== input.expiredSessionId;
}

export function signupStatusLabel(status: SignupIntentStatus): string {
  switch (status) {
    case "dados":
      return "Dados";
    case "plano":
      return "Plano";
    case "checkout":
      return "Pagamento iniciado";
    case "abandonado":
      return "Abandonado no pagamento";
    case "pago":
      return "Pago";
    case "conta_criada":
      return "Conta criada";
  }
}
