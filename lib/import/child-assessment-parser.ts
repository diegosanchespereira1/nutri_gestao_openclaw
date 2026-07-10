// Parser/validador client-side para a importação em massa de avaliações infantis.
// Segue o mesmo padrão de lib/import/parser.ts (Story 2.6), mas com regras próprias:
// datas aceitam formato brasileiro, decimais aceitam vírgula, estatura em metros é
// normalizada para centímetros.

import type { ParsedRow, ParseResult, RowError } from "@/lib/types/import";
import {
  CHILD_ASSESSMENT_FIELDS,
  type ChildAssessmentImportRow,
} from "@/lib/types/child-assessment-import";
import type { ChildSex } from "@/lib/nutrition/child/types";
import { matchChildKey } from "@/lib/import/child-assessment-match";

/** Minúsculas + sem acento, para comparar cabeçalhos de forma tolerante. */
function normalizeHeader(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BR_DATE_RE = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

/** Aceita AAAA-MM-DD ou DD/MM/AAAA (formato comum em planilhas brasileiras). */
export function parseFlexibleDateToISO(raw: string | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (ISO_DATE_RE.test(s)) return s;

  const m = s.match(BR_DATE_RE);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dd = d.padStart(2, "0");
  const mm = mo.padStart(2, "0");
  const dn = Number(dd);
  const mn = Number(mm);
  if (mn < 1 || mn > 12 || dn < 1 || dn > 31) return null;
  return `${y}-${mm}-${dd}`;
}

/** Aceita "14,3" ou "14.3"; devolve null se não for um número > 0. */
function parseDecimalPtBr(raw: string | undefined): number | null {
  const s = (raw ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Estatura pode vir em metros (ex.: "0,95") ou centímetros (ex.: "95"). Normaliza para cm. */
function normalizeHeightToCm(n: number): number {
  return n < 3 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10;
}

function parseSexFlexible(raw: string | undefined): ChildSex | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (["f", "female", "feminino"].includes(s)) return "female";
  if (["m", "male", "masculino"].includes(s)) return "male";
  return null;
}

export function validateChildAssessmentRows(
  rows: ParsedRow[],
  /** Datas (AAAA-MM-DD) já registradas por paciente existente — chave via matchChildKey.
   *  Usado para bloquear reenvio da mesma pesagem sem criar nada (nem paciente, nem avaliação). */
  existingAssessmentDates: Record<string, string[]> = {},
): ParseResult<ChildAssessmentImportRow> {
  const valid: ChildAssessmentImportRow[] = [];
  /** Índice original (em `rows`) de cada item de `valid`, na mesma posição. */
  const validRowIndex: number[] = [];
  const errors: RowError[] = [];

  rows.forEach((row, i) => {
    const full_name = (row.full_name ?? "").trim();
    if (!full_name) {
      errors.push({ rowIndex: i, message: "Nome completo é obrigatório." });
      return;
    }

    const birth_date = parseFlexibleDateToISO(row.birth_date);
    if (!birth_date) {
      errors.push({
        rowIndex: i,
        message: `Data de nascimento inválida: "${row.birth_date ?? ""}". Use AAAA-MM-DD ou DD/MM/AAAA.`,
      });
      return;
    }

    const recorded_at = parseFlexibleDateToISO(row.recorded_at);
    if (!recorded_at) {
      errors.push({
        rowIndex: i,
        message: `Data da pesagem inválida: "${row.recorded_at ?? ""}". Use AAAA-MM-DD ou DD/MM/AAAA.`,
      });
      return;
    }

    if (recorded_at < birth_date) {
      errors.push({ rowIndex: i, message: "Data da pesagem é anterior à data de nascimento." });
      return;
    }

    const sex = parseSexFlexible(row.sex);
    if (!sex) {
      errors.push({
        rowIndex: i,
        message: `Sexo inválido: "${row.sex ?? ""}". Use F/Feminino ou M/Masculino.`,
      });
      return;
    }

    const weight_kg = parseDecimalPtBr(row.weight_kg);
    if (weight_kg == null || weight_kg < 1 || weight_kg > 150) {
      errors.push({
        rowIndex: i,
        message: `Peso inválido: "${row.weight_kg ?? ""}". Informe um valor em kg entre 1 e 150.`,
      });
      return;
    }

    const heightRaw = parseDecimalPtBr(row.height_cm);
    if (heightRaw == null) {
      errors.push({ rowIndex: i, message: `Estatura inválida: "${row.height_cm ?? ""}".` });
      return;
    }
    const height_cm = normalizeHeightToCm(heightRaw);
    if (height_cm < 30 || height_cm > 200) {
      errors.push({
        rowIndex: i,
        message: `Estatura fora da faixa esperada (${height_cm} cm). Verifique se está em metros ou centímetros.`,
      });
      return;
    }

    valid.push({
      full_name,
      birth_date,
      recorded_at,
      sex,
      weight_kg,
      height_cm,
      clinical_notes: (row.clinical_notes ?? "").trim() || null,
    });
    validRowIndex.push(i);
  });

  // ── Duplicados dentro do próprio arquivo (mesmo nome + nascimento) ─────────
  // Não importamos automaticamente: o profissional precisa corrigir a planilha
  // e reenviar, já que não há como saber qual das linhas repetidas está certa.
  const groups = new Map<string, number[]>();
  valid.forEach((r, vi) => {
    const key = matchChildKey(r.full_name, r.birth_date);
    const list = groups.get(key) ?? [];
    list.push(vi);
    groups.set(key, list);
  });

  const excludedValidIndexes = new Set<number>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const lineNumbers = group.map((vi) => validRowIndex[vi] + 1);
    for (const vi of group) {
      excludedValidIndexes.add(vi);
      const otherLines = lineNumbers.filter((n) => n !== validRowIndex[vi] + 1);
      errors.push({
        rowIndex: validRowIndex[vi],
        message: `Duplicado no arquivo (mesmo nome e nascimento) — repete na${otherLines.length > 1 ? "s" : ""} linha${otherLines.length > 1 ? "s" : ""} ${otherLines.join(", ")}.`,
      });
    }
  }

  // ── Reenvio da mesma pesagem para um paciente já existente ─────────────────
  // Se o paciente já existe e já tem uma avaliação nessa data exata, não importa
  // nada para essa linha (nem cria paciente, nem grava avaliação) — provável reenvio
  // acidental do mesmo arquivo.
  valid.forEach((r, vi) => {
    if (excludedValidIndexes.has(vi)) return; // já é duplicado no arquivo, não duplica o aviso
    const key = matchChildKey(r.full_name, r.birth_date);
    const knownDates = existingAssessmentDates[key];
    if (knownDates?.includes(r.recorded_at)) {
      excludedValidIndexes.add(vi);
      errors.push({
        rowIndex: validRowIndex[vi],
        message: `Este paciente já tem uma avaliação registrada em ${r.recorded_at.split("-").reverse().join("/")} — pesagem duplicada, não será importada.`,
      });
    }
  });

  const dedupedValid = valid.filter((_, vi) => !excludedValidIndexes.has(vi));

  return { valid: dedupedValid, errors };
}

// ── Cabeçalhos em português (template + auto-mapeamento) ────────────────────
// O template baixado usa estes títulos em PT-BR; o mapeamento automático da
// etapa 2 reconhece exatamente estes textos (além do campo/label em inglês,
// para quem reaproveita um arquivo próprio já mapeado de outra forma).

export const CHILD_ASSESSMENT_TEMPLATE_HEADERS: { key: string; header: string }[] = [
  { key: "full_name", header: "Nome completo" },
  { key: "birth_date", header: "Data de nascimento" },
  { key: "recorded_at", header: "Data da pesagem" },
  { key: "sex", header: "Sexo (F ou M)" },
  { key: "weight_kg", header: "Peso (kg)" },
  { key: "height_cm", header: "Estatura (cm ou m)" },
  { key: "clinical_notes", header: "Observações" },
];

/** Casa uma coluna do arquivo com o campo do sistema (usado no auto-mapeamento). */
export function matchChildAssessmentColumn(fileColumn: string): string | null {
  const norm = normalizeHeader(fileColumn);

  const byTemplateHeader = CHILD_ASSESSMENT_TEMPLATE_HEADERS.find(
    (h) => normalizeHeader(h.header) === norm,
  );
  if (byTemplateHeader) return byTemplateHeader.key;

  const byKey = CHILD_ASSESSMENT_FIELDS.find((f) => f.key === norm);
  if (byKey) return byKey.key;

  const byLabelPrefix = CHILD_ASSESSMENT_FIELDS.find((f) =>
    normalizeHeader(f.label).startsWith(norm),
  );
  return byLabelPrefix?.key ?? null;
}

// ── Template Excel (.xlsx) para download ────────────────────────────────────
// Planilha em vez de CSV: o usuário final não precisa saber exportar/salvar em
// CSV corretamente (separador, codificação) — só preenche e reenvia o .xlsx.

const CHILD_ASSESSMENT_TEMPLATE_ROWS: (string | number)[][] = [
  ["Benjamim Dias Butturini", "2022-07-29", "2026-02-24", "M", 14.3, 0.95, ""],
  ["Helena Meloni Omuro", "2023-03-11", "2026-02-24", "F", 15.9, 0.99, ""],
];

export async function downloadChildAssessmentXlsxTemplate(): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Avaliações infantis");

  sheet.addRow(CHILD_ASSESSMENT_TEMPLATE_HEADERS.map((h) => h.header));
  sheet.getRow(1).font = { bold: true };
  for (const row of CHILD_ASSESSMENT_TEMPLATE_ROWS) sheet.addRow(row);
  sheet.columns.forEach((col) => {
    col.width = 24;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template-avaliacoes-infantis.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
