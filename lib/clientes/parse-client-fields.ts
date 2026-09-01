/**
 * Parsers puros extraídos de `lib/actions/clients.ts` (T0.4).
 *
 * Motivo: `lib/actions/**` está fora do include do vitest e da cobertura, então
 * toda a lógica de decisão dessas Server Actions ficava sem teste. Aqui ela fica
 * em `lib/`, que a configuração já cobre.
 *
 * Extração sem mudança de comportamento — os testes fixam o que já existia.
 */
import type { ClientKind } from "@/lib/types/clients";
import {
  isValidCnpj,
  isValidCpf,
  onlyDigits,
} from "@/lib/validators/br-document";

/** 'pf' | 'pj' vindo do formulário; qualquer outra coisa é inválida. */
export function parseClientKind(raw: unknown): ClientKind | null {
  if (raw === "pf" || raw === "pj") return raw;
  return null;
}

export type ParsedDocument =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

/**
 * Documento do CLIENTE: CPF quando pf, CNPJ quando pj. Vazio é permitido
 * (documento é opcional no cadastro de cliente) e vira `null`.
 */
export function parseClientDocument(
  kind: ClientKind,
  raw: string,
): ParsedDocument {
  const digits = onlyDigits(raw);
  if (digits.length === 0) return { ok: true, value: null };
  if (kind === "pf") {
    if (!isValidCpf(digits)) return { ok: false, error: "CPF inválido." };
    return { ok: true, value: digits };
  }
  if (!isValidCnpj(digits)) return { ok: false, error: "CNPJ inválido." };
  return { ok: true, value: digits };
}

/**
 * Remove curingas do termo de busca antes de montar o padrão ILIKE.
 * Sem isto, um `%` digitado pelo utilizador vira curinga na query.
 */
export function sanitizeSearchWildcards(q: string): string {
  return q.replace(/[%_\\]/g, "").replace(/,/g, " ");
}

/** Escapa aspas duplas no valor que vai dentro de `.or("col.ilike.\"...\"")`. */
export function escapeIlikeValue(s: string): string {
  return s.replace(/"/g, '""');
}
