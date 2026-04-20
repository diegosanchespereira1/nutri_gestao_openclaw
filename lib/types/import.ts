// Story 2.6: Importação CSV/Excel — tipos para o wizard de importação

import type { ClientBusinessSegment } from "@/lib/constants/client-business-segment";
import type { ClientKind } from "@/lib/types/clients";
import type { PatientSex } from "@/lib/types/patients";
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
  /** PJ: categoria do negócio (usada para derivar establishment_type automaticamente). */
  business_segment: ClientBusinessSegment | null;
  /** PF: nome da pessoa atendida se diferente do titular. */
  attended_full_name: string | null;
  /** PF: data de nascimento (AAAA-MM-DD). */
  birth_date: string | null;
  /** PF: sexo biológico. */
  sex: PatientSex | null;
  /** PF: restrições alimentares. */
  dietary_restrictions: string | null;
  /** PF: medicamentos em uso contínuo. */
  chronic_medications: string | null;
};

export type EstablishmentImportRow = {
  name: string;
  establishment_type: EstablishmentType;
  /** Nullable desde a migração 20260420110000 — preenchimento posterior é permitido. */
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
};

export type PatientImportRow = {
  full_name: string;
  birth_date: string | null;
  document_id: string | null;
  sex: PatientSex | null;
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
  { key: "trade_name", label: "Nome Fantasia (PJ)", required: false },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Telefone", required: false },
  {
    key: "business_segment",
    label: "Categoria do negócio (PJ: padaria/mercado/escola/hospital/clinica/restaurante/hotel/industria_alimenticia/lar_idosos/empresa/outro)",
    required: false,
  },
  { key: "attended_full_name", label: "Nome do atendido (PF, se diferente do titular)", required: false },
  { key: "birth_date", label: "Data de nascimento (PF, AAAA-MM-DD)", required: false },
  { key: "sex", label: "Sexo (PF: female/male/other)", required: false },
  { key: "dietary_restrictions", label: "Restrições alimentares (PF)", required: false },
  { key: "chronic_medications", label: "Medicamentos crônicos (PF)", required: false },
];

export const ESTABLISHMENT_FIELDS: FieldDef[] = [
  { key: "name", label: "Nome do Estabelecimento", required: true },
  {
    key: "establishment_type",
    label: "Tipo (escola/hospital/clinica/lar_idosos/empresa)",
    required: true,
  },
  { key: "address_line1", label: "Endereço (opcional)", required: false },
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
