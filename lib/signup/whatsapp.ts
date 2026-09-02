import { onlyDigits } from "@/lib/validators/br-document";

/**
 * Normaliza telefone para wa.me: só dígitos, com DDI 55 se for BR (10–11 dígitos).
 */
export function normalizeWhatsAppPhone(raw: string):
  | { ok: true; value: string | null }
  | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };

  let digits = onlyDigits(trimmed);
  if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  // DDI + DDD + número: tipicamente 12–13 dígitos (55 + 10/11)
  if (digits.length < 12 || digits.length > 15) {
    return {
      ok: false,
      error:
        "WhatsApp inválido. Use DDI + DDD + número (ex.: 5511999999999).",
    };
  }

  return { ok: true, value: digits };
}

export function buildWhatsAppWebUrl(input: {
  phoneDigits: string;
  message?: string;
}): string {
  const base = `https://wa.me/${input.phoneDigits}`;
  const message = input.message?.trim();
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export const ENTERPRISE_WHATSAPP_DEFAULT_MESSAGE =
  "Olá! Tenho interesse no plano Enterprise da NutriGestão.";
