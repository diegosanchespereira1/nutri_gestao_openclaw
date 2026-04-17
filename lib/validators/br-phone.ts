import { onlyDigits } from "@/lib/validators/br-document";

function stripBrazilCountryCode(digits: string): string {
  if (digits.length > 11 && digits.startsWith("55")) {
    return digits.slice(2);
  }
  return digits;
}

export function formatBrazilPhoneInput(raw: string): string {
  const normalized = stripBrazilCountryCode(onlyDigits(raw)).slice(0, 11);
  if (!normalized) return "";

  if (normalized.length <= 2) {
    return `(${normalized}`;
  }

  const ddd = normalized.slice(0, 2);
  const local = normalized.slice(2);

  if (!local) {
    return `(${ddd})`;
  }

  if (normalized.length <= 10) {
    if (local.length <= 4) return `(${ddd}) ${local}`;
    return `(${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
  }

  if (local.length <= 5) return `(${ddd}) ${local}`;
  return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
}

export function normalizeBrazilPhone(raw: string):
  | { ok: true; value: string | null }
  | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };

  const digits = stripBrazilCountryCode(onlyDigits(trimmed));
  if (digits.length !== 10 && digits.length !== 11) {
    return { ok: false, error: "Telefone inválido. Use DDD + número (fixo ou celular)." };
  }

  const ddd = Number(digits.slice(0, 2));
  if (!Number.isInteger(ddd) || ddd < 11 || ddd > 99) {
    return { ok: false, error: "DDD inválido no telefone." };
  }

  return { ok: true, value: formatBrazilPhoneInput(digits) };
}
