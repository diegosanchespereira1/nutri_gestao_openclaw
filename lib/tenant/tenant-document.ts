/**
 * Documento fiscal do TENANT (a conta) — CPF ou CNPJ.
 *
 * Profissional autônomo sem CNPJ é caso válido, por isso os dois tipos são
 * aceitos. Diferente do documento de cliente e de paciente, este é **único na
 * plataforma** (índice `profiles_document_id_uidx`).
 *
 * Guardamos só dígitos; a máscara é da UI (lib/format/br-document.ts).
 * Aqui só há lógica pura — sem I/O, para poder ser testada sem banco.
 */
import { formatBrDocument } from "@/lib/format/br-document";
import { isValidCnpj, isValidCpf, onlyDigits } from "@/lib/validators/br-document";

export type TenantDocumentKind = "cpf" | "cnpj";

/** O que vai para `profiles`. Os dois campos andam juntos (check no banco). */
export type TenantDocumentFields = {
  document_kind: TenantDocumentKind | null;
  document_id: string | null;
};

export type ParseTenantDocumentResult =
  | { ok: true; value: TenantDocumentFields }
  | { ok: false; error: string };

export const TENANT_DOCUMENT_TAKEN_MESSAGE =
  "Este CPF/CNPJ já está em uso por outra conta da plataforma.";

export const TENANT_DOCUMENT_MEMBER_MESSAGE =
  "Só o titular da conta pode registar o CPF/CNPJ. Peça ao titular para preencher.";

export function parseTenantDocumentKind(raw: unknown): TenantDocumentKind | null {
  return raw === "cpf" || raw === "cnpj" ? raw : null;
}

/** Deduz o tipo pelo tamanho quando o formulário não mandou o campo. */
function inferKind(digits: string): TenantDocumentKind | null {
  if (digits.length === 11) return "cpf";
  if (digits.length === 14) return "cnpj";
  return null;
}

const EMPTY: TenantDocumentFields = { document_kind: null, document_id: null };

/**
 * @param required quando true, documento em branco é erro. Usado no cadastro
 * novo; no perfil de tenant antigo o campo pode continuar vazio até ser pedido.
 */
export function parseTenantDocument(
  kindRaw: unknown,
  documentRaw: unknown,
  opts: { required: boolean },
): ParseTenantDocumentResult {
  const digits = onlyDigits(String(documentRaw ?? ""));
  const kind = parseTenantDocumentKind(kindRaw) ?? inferKind(digits);

  if (digits.length === 0) {
    if (opts.required) {
      return { ok: false, error: "Informe o CPF ou o CNPJ da conta." };
    }
    return { ok: true, value: EMPTY };
  }

  if (!kind) {
    return {
      ok: false,
      error: "Selecione se o documento é CPF ou CNPJ.",
    };
  }

  if (kind === "cpf") {
    if (digits.length !== 11) {
      return { ok: false, error: "O CPF deve ter 11 dígitos." };
    }
    if (!isValidCpf(digits)) {
      return { ok: false, error: "CPF inválido. Confira os dígitos." };
    }
    return { ok: true, value: { document_kind: "cpf", document_id: digits } };
  }

  if (digits.length !== 14) {
    return { ok: false, error: "O CNPJ deve ter 14 dígitos." };
  }
  if (!isValidCnpj(digits)) {
    return { ok: false, error: "CNPJ inválido. Confira os dígitos." };
  }
  return { ok: true, value: { document_kind: "cnpj", document_id: digits } };
}

/** "CNPJ 12.345.678/0001-95" — para resumos e trilha de auditoria. */
export function tenantDocumentLabel(fields: TenantDocumentFields): string {
  if (!fields.document_kind || !fields.document_id) return "Não informado";
  const prefixo = fields.document_kind === "cpf" ? "CPF" : "CNPJ";
  return `${prefixo} ${formatBrDocument(fields.document_id)}`;
}

/** True quando o documento mudou de facto (evita evento de auditoria à toa). */
export function tenantDocumentChanged(
  before: TenantDocumentFields,
  after: TenantDocumentFields,
): boolean {
  return (
    (before.document_kind ?? null) !== (after.document_kind ?? null) ||
    (before.document_id ?? null) !== (after.document_id ?? null)
  );
}

type PgLikeError = { code?: string | null; message?: string | null } | null;

/**
 * Traduz a violação do índice único global e a do trigger que impede membro de
 * equipe registar documento de tenant. Devolve null quando o erro é outro.
 */
export function mapTenantDocumentDbError(error: PgLikeError): string | null {
  if (!error) return null;
  const message = String(error.message ?? "");

  if (message.includes("DOCUMENTO_SOMENTE_TITULAR")) {
    return TENANT_DOCUMENT_MEMBER_MESSAGE;
  }
  if (
    error.code === "23505" &&
    message.includes("profiles_document_id_uidx")
  ) {
    return TENANT_DOCUMENT_TAKEN_MESSAGE;
  }
  if (message.includes("profiles_document_pair_check")) {
    return "Documento incompleto: informe o tipo e o número.";
  }
  return null;
}
