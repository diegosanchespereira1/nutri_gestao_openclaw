// Parser/validador client-side para o upload em massa de matérias-primas.
// Segue o mesmo padrão de lib/import/child-assessment-parser.ts: cabeçalhos
// em PT-BR tolerantes a acento/maiúsculas, decimais aceitam vírgula.
// Diferença: aqui também detectamos conflito de nome contra o que já existe
// no tenant, para a etapa de resolução (sobrescrever / criar novo / ignorar).

import type { ParsedRow, RowError } from "@/lib/types/import";
import {
  RAW_MATERIAL_IMPORT_FIELDS,
  type RawMaterialImportConflict,
  type RawMaterialImportRow,
} from "@/lib/types/raw-material-import";
import {
  RECIPE_LINE_UNITS,
  type RecipeLineUnit,
} from "@/lib/constants/recipe-line-units";

/** Minúsculas + sem acento, para comparar cabeçalhos/valores de forma tolerante. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

/** Chave de comparação de nome — mesma regra do índice único no banco
 *  (lower(btrim(name))), aqui sem remover acentos (nomes diferentes só por
 *  acento continuam sendo nomes diferentes; só normalizamos caixa e espaços). */
export function rawMaterialNameKey(name: string): string {
  return name.trim().toLowerCase();
}

const UNIT_SYNONYMS: Record<string, RecipeLineUnit> = {
  g: "g",
  grama: "g",
  gramas: "g",
  kg: "kg",
  quilo: "kg",
  quilos: "kg",
  quilograma: "kg",
  quilogramas: "kg",
  ml: "ml",
  mililitro: "ml",
  mililitros: "ml",
  l: "l",
  litro: "l",
  litros: "l",
  un: "un",
  und: "un",
  unidade: "un",
  unidades: "un",
};

export function parsePriceUnit(raw: string | undefined): RecipeLineUnit | null {
  const norm = normalizeText(raw ?? "");
  if (!norm) return null;
  if ((RECIPE_LINE_UNITS as readonly string[]).includes(norm)) {
    return norm as RecipeLineUnit;
  }
  return UNIT_SYNONYMS[norm] ?? null;
}

/** Aceita "3,50" ou "3.50"; devolve null se não for número positivo. */
export function parseDecimalPtBr(raw: string | undefined): number | null {
  const s = (raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type RawMaterialValidationResult = {
  valid: RawMaterialImportRow[];
  /** Índice original (em `rows`) de cada item de `valid`, na mesma posição. */
  validRowIndex: number[];
  errors: RowError[];
  /** Conflitos de nome (índice original → dados do item já cadastrado). */
  conflictsByRow: Map<number, RawMaterialImportConflict>;
};

export function validateRawMaterialRows(
  rows: ParsedRow[],
  /** Chave = rawMaterialNameKey(nome existente) → dados do item já cadastrado. */
  existingByNameKey: Map<string, RawMaterialImportConflict>,
): RawMaterialValidationResult {
  const valid: RawMaterialImportRow[] = [];
  const validRowIndex: number[] = [];
  const errors: RowError[] = [];

  rows.forEach((row, i) => {
    const name = (row.name ?? "").trim();
    if (!name) {
      errors.push({ rowIndex: i, message: "Nome do produto é obrigatório." });
      return;
    }
    if (name.length > 300) {
      errors.push({ rowIndex: i, message: "Nome muito longo (máx. 300 caracteres)." });
      return;
    }

    const price_unit = parsePriceUnit(row.price_unit);
    if (!price_unit) {
      errors.push({
        rowIndex: i,
        message: `Unidade inválida: "${row.price_unit ?? ""}". Use g, kg, ml, l ou un.`,
      });
      return;
    }

    const unit_price_brl = parseDecimalPtBr(row.unit_price_brl);
    if (unit_price_brl == null) {
      errors.push({
        rowIndex: i,
        message: `Preço inválido: "${row.unit_price_brl ?? ""}". Informe um valor maior que zero.`,
      });
      return;
    }

    valid.push({
      name,
      price_unit,
      unit_price_brl,
      notes: (row.notes ?? "").trim() || null,
    });
    validRowIndex.push(i);
  });

  // ── Duplicados dentro do próprio arquivo (mesmo nome) ──────────────────────
  // Igual à importação de avaliações infantis: não decidimos sozinhos qual
  // linha repetida está certa — o usuário corrige a planilha e reenvia.
  const groups = new Map<string, number[]>();
  valid.forEach((r, vi) => {
    const key = rawMaterialNameKey(r.name);
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
        message: `Nome duplicado no arquivo — repete na${otherLines.length > 1 ? "s" : ""} linha${otherLines.length > 1 ? "s" : ""} ${otherLines.join(", ")}.`,
      });
    }
  }

  const dedupedValid = valid.filter((_, vi) => !excludedValidIndexes.has(vi));
  const dedupedValidRowIndex = validRowIndex.filter((_, vi) => !excludedValidIndexes.has(vi));

  // ── Conflitos: nome já existe cadastrado no tenant ─────────────────────────
  const conflictsByRow = new Map<number, RawMaterialImportConflict>();
  dedupedValid.forEach((r, vi) => {
    const conflict = existingByNameKey.get(rawMaterialNameKey(r.name));
    if (conflict) {
      conflictsByRow.set(dedupedValidRowIndex[vi], conflict);
    }
  });

  return {
    valid: dedupedValid,
    validRowIndex: dedupedValidRowIndex,
    errors,
    conflictsByRow,
  };
}

// ── Cabeçalhos em português (template + auto-mapeamento) ────────────────────

export const RAW_MATERIAL_TEMPLATE_HEADERS: { key: string; header: string }[] = [
  { key: "name", header: "Nome do produto" },
  { key: "price_unit", header: "Unidade (g, kg, ml, l ou un)" },
  { key: "unit_price_brl", header: "Preço unitário (R$)" },
  { key: "notes", header: "Observações" },
];

export function matchRawMaterialColumn(fileColumn: string): string | null {
  const norm = normalizeText(fileColumn);

  const byTemplateHeader = RAW_MATERIAL_TEMPLATE_HEADERS.find(
    (h) => normalizeText(h.header) === norm,
  );
  if (byTemplateHeader) return byTemplateHeader.key;

  const byKey = RAW_MATERIAL_IMPORT_FIELDS.find((f) => f.key === norm);
  if (byKey) return byKey.key;

  const byLabelPrefix = RAW_MATERIAL_IMPORT_FIELDS.find((f) =>
    normalizeText(f.label).startsWith(norm),
  );
  return byLabelPrefix?.key ?? null;
}

// ── Template Excel (.xlsx) para download ────────────────────────────────────
// Só cabeçalhos — sem linhas de exemplo pré-preenchidas, para não confundir o
// usuário sobre o que é dado real e o que é só ilustração. As instruções de
// preenchimento ficam no tooltip da página (não dentro do arquivo).

export async function downloadRawMaterialXlsxTemplate(): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Matérias-primas");

  sheet.addRow(RAW_MATERIAL_TEMPLATE_HEADERS.map((h) => h.header));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns.forEach((col) => {
    col.width = 28;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template-materias-primas.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
