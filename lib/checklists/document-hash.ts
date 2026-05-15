import { createHash } from "crypto";

/* ── Tipos ────────────────────────────────────────────────────────────── */

export type DocumentHashInput = {
  /** ID UUID da sessão de preenchimento. */
  sessionId: string;
  /** ISO 8601 do momento de aprovação (ex: "2026-05-14T13:32:00.000Z"). */
  approvedAtIso: string;
  /** Nome completo da profissional conforme cadastro. */
  professionalName: string;
  /** CRN da profissional. */
  crn: string;
  /** Nome digitado pelo signatário do cliente. */
  clientSignerName: string | null;
  /** Data URL PNG da assinatura da profissional. */
  professionalSignatureDataUrl: string | null;
  /** Data URL PNG da assinatura do cliente. */
  clientSignatureDataUrl: string | null;
};

/* ── Geração ─────────────────────────────────────────────────────────── */

/**
 * Gera um hash SHA-256 determinístico e único para o dossiê aprovado.
 *
 * Combina: ID da sessão, timestamp de aprovação, identidade dos signatários
 * e os dados brutos das assinaturas digitais desenhadas.
 *
 * Separador \x00 (null-byte) garante que os campos não possam ser "concatenados"
 * de formas diferentes que produzam o mesmo hash (length-extension).
 */
export function generateDocumentHash(input: DocumentHashInput): string {
  const content = [
    input.sessionId,
    input.approvedAtIso,
    input.professionalName.trim(),
    input.crn.trim(),
    input.clientSignerName?.trim() ?? "",
    input.professionalSignatureDataUrl ?? "",
    input.clientSignatureDataUrl ?? "",
  ].join("\x00");

  return createHash("sha256").update(content, "utf8").digest("hex");
}

/* ── Formatação para exibição ────────────────────────────────────────── */

/**
 * Formata 64 chars hex em grupos de 8 separados por espaço (8 grupos × 8):
 *   "a1b2c3d4 e5f6g7h8 i9j0k1l2 m3n4o5p6 q1r2s3t4 u5v6w7x8 y9z0a1b2 c3d4e5f6"
 */
export function formatDocumentHash(hex: string): string {
  return hex.match(/.{1,8}/g)?.join(" ") ?? hex;
}

/**
 * Formata em 2 linhas de 4 grupos (estilo DocuSign / Adobe Sign):
 *   "a1b2c3d4 e5f6g7h8 i9j0k1l2 m3n4o5p6"
 *   "q1r2s3t4 u5v6w7x8 y9z0a1b2 c3d4e5f6"
 */
export function formatDocumentHashLines(hex: string): [string, string] {
  const groups = hex.match(/.{1,8}/g) ?? [];
  return [
    groups.slice(0, 4).join(" "),
    groups.slice(4, 8).join(" "),
  ];
}
