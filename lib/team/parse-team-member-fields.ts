/**
 * Lógica pura extraída de `lib/actions/team-members.ts` (T0.4).
 *
 * `lib/actions/**` está fora do include do vitest, então estas decisões — política
 * de senha e tradução dos erros do serviço de autenticação — não tinham teste.
 * Extração sem mudança de comportamento.
 */
import type { ProfessionalArea } from "@/lib/types/team-members";

export function parseProfessionalArea(raw: unknown): ProfessionalArea | null {
  if (raw === "nutrition" || raw === "other") return raw;
  return null;
}

/** Política de senha do membro: pelo menos 1 caractere não alfanumérico. */
export function hasSpecialCharacter(value: string): boolean {
  return /[^A-Za-z0-9]/.test(value);
}

/** Erro do GoTrue → parâmetro `?err=` usado pela página. */
export function mapCreateAuthErrorToParam(errorMessage: string): string {
  const message = errorMessage.toLowerCase();
  const isDuplicate =
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists") ||
    message.includes("user already");
  if (isDuplicate) return "email_exists";

  const isWeakPassword =
    message.includes("password") &&
    (message.includes("short") ||
      message.includes("weak") ||
      message.includes("least") ||
      message.includes("minimum") ||
      message.includes("special") ||
      message.includes("complex"));
  if (isWeakPassword) return "password_policy";

  if (message.includes("email") && message.includes("invalid")) {
    return "email_invalid";
  }

  return "auth_create";
}

/** Erro do GoTrue → mensagem em pt-BR mostrada ao utilizador. */
export function mapCreateAuthErrorReason(errorMessage: string): string {
  const message = errorMessage.toLowerCase();
  if (message.includes("already") || message.includes("registered")) {
    return "Esse e-mail já está cadastrado.";
  }
  if (message.includes("email") && message.includes("invalid")) {
    return "O e-mail informado é inválido.";
  }
  if (message.includes("password") && message.includes("special")) {
    return "A senha precisa conter pelo menos 1 caractere especial.";
  }
  if (message.includes("password") && message.includes("short")) {
    return "A senha informada é muito curta.";
  }
  return "Não foi possível validar os dados junto ao serviço de autenticação.";
}
