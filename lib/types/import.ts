// Story 2.6: Importação CSV/Excel — tipos para o wizard de importação

import type { ClientKind } from "@/lib/types/clients";
import type { EstablishmentType } from "@/lib/types/establishments";

/** Entidade alvo da importação. */
export type ImportEntity = "clientes" | "estabelecimentos" | "pacientes";

/** Uma linha parseada do arquivo, após mapeamento de colunas. */
export type ParsedRow = Record<string, string>;

/** Erro associado a uma linha específica do arquivo. */
export type RowError = {
  /** Índice da linha (0 = primeira linha de dados, não o cabeçalho). */
  rowIndex: number;
  /** Mensagem legível em PT-BR. */
  message: string;
};

/** Mapeamento de uma coluna do arquivo para um campo do sistema. */
export type FieldMapping = {
  /** Nome exato da coluna detectada no arquivo. */
  fileColumn: string;
  /** Campo do sistema, ou null se a coluna for ignorada. */
  systemField: string | null;
};

// ── Payloads validados para cada entidade ──────────────────────────────────

export type ClientImportRow = {
  legal_name: string;
  kind: ClientKind;
  document_id: string | null;
  trade_name: string | null;
  email: string | null;
  phone: string | null;
};

export type EstablishmentImportRow = {
  name: string;
  establishment_type: EstablishmentType;
  address_line1: string;
  city: string | null;
  state: string | null;
  postal_code: string | null;
};

export type PatientImportRow = {
  full_name: string;
  birth_date: string | null;
  document_id: string | null;
  sex: "female" | "male" | "other" | null;
  email: string | null;
  phone: string | null;
};

// ── Resultado da validação/parse ────────────────────────────────────────────

export type ParseResult<T> = {
  valid: T[];
  errors: RowError[];
};

// ── Resultado da importação (retornado pela Server Action) ──────────────────

export type ImportResult =
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string };

// ── Definição de campos mapeáveis por entidade ─────────────────────────────

export type FieldDef = {
  key: string;
  label: string;
  required: boolean;
};

export const CLIENT_FIELDS: FieldDef[] = [
  { key: "legal_name", label: "Nome / Razão Social", required: true },
  { key: "kind", label: "Tipo (pf ou pj)", required: true },
  { key: "document_id", label: "CPF / CNPJ", required: false },
  { key: "trade_name", label: "Nome Fantasia", required: false },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Telefone", required: false },
];

export const ESTABLISHMENT_FIELDS: FieldDef[] = [
  { key: "name", label: "Nome do Estabelecimento", required: true },
  {
    key: "establishment_type",
    label: "Tipo (escola/hospital/clinica/lar_idosos/empresa)",
    required: true,
  },
  { key: "address_line1", label: "Endereço", required: true },
  { key: "city", label: "Cidade", required: false },
  { key: "state", label: "Estado (UF)", required: false },
  { key: "postal_code", label: "CEP", required: false },
];

export const PATIENT_FIELDS: FieldDef[] = [
  { key: "full_name", label: "Nome completo", required: true },
  { key: "birth_date", label: "Data de nascimento (AAAA-MM-DD)", required: false },
  { key: "document_id", label: "CPF", required: false },
  { key: "sex", label: "Sexo (female/male/other)", required: false },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Telefone", required: false },
];

export function getFieldsForEntity(entity: ImportEntity): FieldDef[] {
  switch (entity) {
    case "clientes": return CLIENT_FIELDS;
    case "estabelecimentos": return ESTABLISHMENT_FIELDS;
    case "pacientes": return PATIENT_FIELDS;
  }
}
