// Story 2.6: Parser client-side para CSV e Excel + validadores por entidade

import ExcelJS from "exceljs";
import Papa from "papaparse";

import type {
  ClientImportRow,
  EstablishmentImportRow,
  FieldMapping,
  ImportEntity,
  ParseResult,
  PatientImportRow,
  ParsedRow,
} from "@/lib/types/import";
import type { ClientKind } from "@/lib/types/clients";
import type { EstablishmentType } from "@/lib/types/establishments";

export const MAX_ROWS = 500;

// ── Leitura de arquivo ──────────────────────────────────────────────────────

/** Lê arquivo CSV e retorna array de arrays (primeira linha = cabeçalho). */
export function parseCsvFile(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      complete: (result: Papa.ParseResult<string[]>) =>
        resolve(result.data as string[][]),
      error: (err: Error) => reject(new Error(err.message)),
      skipEmptyLines: true,
    });
  });
}

function excelCellToString(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    if (typeof o.result === "string" || typeof o.result === "number") {
      return String(o.result);
    }
    if (o.result instanceof Date) return o.result.toISOString().slice(0, 10);
    if (Array.isArray(o.richText)) {
      return (o.richText as { text?: string }[])
        .map((t) => t.text ?? "")
        .join("");
    }
  }
  return "";
}

/** Lê arquivo Excel (.xlsx) e retorna array de arrays da primeira aba. */
export async function parseExcelFile(file: File): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error("Arquivo Excel não contém abas.");

  const data: string[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const out: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      while (out.length < colNumber - 1) {
        out.push("");
      }
      out[colNumber - 1] = excelCellToString(cell);
    });
    data.push(out);
  });

  if (data.length === 0) return [];

  const width = Math.max(...data.map((r) => r.length), 0);
  return data.map((r) => {
    const row = [...r];
    while (row.length < width) row.push("");
    return row;
  });
}

/** Detecta o tipo de arquivo e retorna as linhas brutas. */
export async function readFileRows(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsvFile(file);
  if (name.endsWith(".xlsx")) return parseExcelFile(file);
  if (name.endsWith(".xls")) {
    throw new Error(
      "Ficheiros .xls (Excel 97–2003) não são suportados. Guarde como .xlsx ou exporte CSV.",
    );
  }
  throw new Error("Formato não suportado. Use .csv ou .xlsx.");
}

// ── Aplicação de mapeamento ─────────────────────────────────────────────────

/**
 * Dado o raw (array de arrays) e os mapeamentos de coluna,
 * retorna array de objetos com os campos do sistema.
 */
export function applyMappings(
  rawRows: string[][],
  headers: string[],
  mappings: FieldMapping[],
): ParsedRow[] {
  // Índice de cada coluna de arquivo → campo do sistema
  const colMap: Map<number, string> = new Map();
  for (const mapping of mappings) {
    if (!mapping.systemField) continue;
    const idx = headers.indexOf(mapping.fileColumn);
    if (idx !== -1) colMap.set(idx, mapping.systemField);
  }

  return rawRows.map((row) => {
    const obj: ParsedRow = {};
    for (const [colIdx, field] of colMap.entries()) {
      obj[field] = (row[colIdx] ?? "").trim();
    }
    return obj;
  });
}

// ── Validadores por entidade ────────────────────────────────────────────────

const VALID_KINDS = new Set<ClientKind>(["pf", "pj"]);
const VALID_EST_TYPES = new Set<EstablishmentType>([
  "escola",
  "hospital",
  "clinica",
  "lar_idosos",
  "empresa",
]);
const VALID_SEX = new Set(["female", "male", "other"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function nullIfEmpty(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : null;
}

export function validateClientRows(rows: ParsedRow[]): ParseResult<ClientImportRow> {
  const valid: ClientImportRow[] = [];
  const errors: { rowIndex: number; message: string }[] = [];

  rows.forEach((row, i) => {
    const name = (row.legal_name ?? "").trim();
    const kind = (row.kind ?? "").trim().toLowerCase() as ClientKind;

    if (!name) {
      errors.push({ rowIndex: i, message: "Nome / Razão Social é obrigatório." });
      return;
    }
    if (!VALID_KINDS.has(kind)) {
      errors.push({
        rowIndex: i,
        message: `Tipo inválido: "${row.kind}". Use "pf" ou "pj".`,
      });
      return;
    }

    valid.push({
      legal_name: name,
      kind,
      document_id: nullIfEmpty(row.document_id),
      trade_name: nullIfEmpty(row.trade_name),
      email: nullIfEmpty(row.email),
      phone: nullIfEmpty(row.phone),
    });
  });

  return { valid, errors };
}

export function validateEstablishmentRows(
  rows: ParsedRow[],
): ParseResult<EstablishmentImportRow> {
  const valid: EstablishmentImportRow[] = [];
  const errors: { rowIndex: number; message: string }[] = [];

  rows.forEach((row, i) => {
    const name = (row.name ?? "").trim();
    const type = (row.establishment_type ?? "").trim().toLowerCase() as EstablishmentType;
    const address = (row.address_line1 ?? "").trim();

    if (!name) {
      errors.push({ rowIndex: i, message: "Nome do estabelecimento é obrigatório." });
      return;
    }
    if (!VALID_EST_TYPES.has(type)) {
      errors.push({
        rowIndex: i,
        message: `Tipo inválido: "${row.establishment_type}". Use: escola, hospital, clinica, lar_idosos, empresa.`,
      });
      return;
    }
    if (!address) {
      errors.push({ rowIndex: i, message: "Endereço é obrigatório." });
      return;
    }

    valid.push({
      name,
      establishment_type: type,
      address_line1: address,
      city: nullIfEmpty(row.city),
      state: nullIfEmpty(row.state),
      postal_code: nullIfEmpty(row.postal_code),
    });
  });

  return { valid, errors };
}

export function validatePatientRows(rows: ParsedRow[]): ParseResult<PatientImportRow> {
  const valid: PatientImportRow[] = [];
  const errors: { rowIndex: number; message: string }[] = [];

  rows.forEach((row, i) => {
    const name = (row.full_name ?? "").trim();
    if (!name) {
      errors.push({ rowIndex: i, message: "Nome completo é obrigatório." });
      return;
    }

    const birthDate = nullIfEmpty(row.birth_date);
    if (birthDate && !DATE_RE.test(birthDate)) {
      errors.push({
        rowIndex: i,
        message: `Data de nascimento inválida: "${row.birth_date}". Use o formato AAAA-MM-DD.`,
      });
      return;
    }

    const sexRaw = (row.sex ?? "").trim().toLowerCase();
    const sex =
      sexRaw && VALID_SEX.has(sexRaw)
        ? (sexRaw as "female" | "male" | "other")
        : null;

    if (sexRaw && !VALID_SEX.has(sexRaw)) {
      errors.push({
        rowIndex: i,
        message: `Sexo inválido: "${row.sex}". Use female, male ou other.`,
      });
      return;
    }

    valid.push({
      full_name: name,
      birth_date: birthDate,
      document_id: nullIfEmpty(row.document_id),
      sex,
      email: nullIfEmpty(row.email),
      phone: nullIfEmpty(row.phone),
    });
  });

  return { valid, errors };
}

export function validateRows(
  entity: ImportEntity,
  rows: ParsedRow[],
): ParseResult<ClientImportRow | EstablishmentImportRow | PatientImportRow> {
  switch (entity) {
    case "clientes": return validateClientRows(rows);
    case "estabelecimentos": return validateEstablishmentRows(rows);
    case "pacientes": return validatePatientRows(rows);
  }
}

// ── Templates CSV para download ─────────────────────────────────────────────

export const CSV_TEMPLATES: Record<ImportEntity, string> = {
  clientes:
    "legal_name,kind,document_id,trade_name,email,phone\n" +
    "João Silva,pf,12345678901,,joao@email.com,11999990000\n" +
    "Empresa LTDA,pj,12345678000199,Empresa Fantasia,contato@empresa.com,1133330000",
  estabelecimentos:
    "name,establishment_type,address_line1,city,state,postal_code\n" +
    "Escola Municipal,escola,Rua das Flores 100,São Paulo,SP,01310100\n" +
    "Hospital Regional,hospital,Av. Central 200,Campinas,SP,13010050",
  pacientes:
    "full_name,birth_date,document_id,sex,email,phone\n" +
    "Maria Santos,1985-03-15,98765432100,female,maria@email.com,11988880000\n" +
    "Pedro Oliveira,1990-07-22,,male,,",
};

export function downloadCsvTemplate(entity: ImportEntity): void {
  const csv = CSV_TEMPLATES[entity];
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `template-${entity}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
