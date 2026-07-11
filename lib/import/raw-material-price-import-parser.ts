// Parser/validador client-side da atualização de preços em massa (planilha
// com ID, baixada a partir dos dados reais do tenant). Casamento sempre por
// ID — nunca por nome, já que o nome pode ter sido editado na planilha.

import type { ParsedRow, RowError } from "@/lib/types/import";
import {
  RAW_MATERIAL_PRICE_IMPORT_FIELDS,
  type RawMaterialPriceExistingSnapshot,
  type RawMaterialPriceImportRow,
} from "@/lib/types/raw-material-price-import";
import type {
  RawMaterialImportClientOption,
  RawMaterialImportEstablishmentOption,
} from "@/lib/types/raw-material-import";
import {
  normalizeText,
  parseDecimalPtBr,
  parsePriceUnit,
  rawMaterialScopeKey,
} from "@/lib/import/raw-material-import-parser";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RawMaterialPriceValidationResult = {
  valid: RawMaterialPriceImportRow[];
  validRowIndex: number[];
  errors: RowError[];
  /** Estado atual (antes da edição) de cada linha válida — para mostrar o diff. */
  existingByRow: Map<number, RawMaterialPriceExistingSnapshot>;
};

export function validateRawMaterialPriceRows(
  rows: ParsedRow[],
  /** ID → estado atual, só com itens deste tenant (carregado no servidor). */
  existingById: Map<string, RawMaterialPriceExistingSnapshot>,
  clientOptions: RawMaterialImportClientOption[] = [],
  establishmentOptions: RawMaterialImportEstablishmentOption[] = [],
): RawMaterialPriceValidationResult {
  const valid: RawMaterialPriceImportRow[] = [];
  const validRowIndex: number[] = [];
  const errors: RowError[] = [];

  const clientIndex = new Map<string, RawMaterialImportClientOption>();
  for (const c of clientOptions) {
    const key = normalizeText(c.label);
    if (!clientIndex.has(key)) clientIndex.set(key, c);
  }
  const establishmentIndex = new Map<string, RawMaterialImportEstablishmentOption>();
  for (const e of establishmentOptions) {
    const key = `${e.clientId}::${normalizeText(e.label)}`;
    if (!establishmentIndex.has(key)) establishmentIndex.set(key, e);
  }
  const establishmentLabelById = new Map(establishmentOptions.map((e) => [e.id, e.label]));

  rows.forEach((row, i) => {
    const id = (row.id ?? "").trim();
    if (!id || !UUID_RE.test(id)) {
      errors.push({
        rowIndex: i,
        message: "ID ausente ou inválido — esta linha não pode ser atualizada. Não apague nem edite a coluna ID.",
      });
      return;
    }

    const existing = existingById.get(id);
    if (!existing) {
      errors.push({
        rowIndex: i,
        message: "ID não encontrado — este item não existe (ou não pertence à sua conta).",
      });
      return;
    }

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

    const clientNameRaw = (row.client_name ?? "").trim();
    if (!clientNameRaw) {
      errors.push({ rowIndex: i, message: "Cliente é obrigatório." });
      return;
    }
    const client = clientIndex.get(normalizeText(clientNameRaw));
    if (!client) {
      errors.push({
        rowIndex: i,
        message: `Cliente não encontrado: "${clientNameRaw}". Confira o nome exato do cliente cadastrado.`,
      });
      return;
    }

    const establishmentNameRaw = (row.establishment_name ?? "").trim();
    let establishmentId: string | null = null;
    if (establishmentNameRaw) {
      const est = establishmentIndex.get(
        `${client.id}::${normalizeText(establishmentNameRaw)}`,
      );
      if (!est) {
        errors.push({
          rowIndex: i,
          message: `Estabelecimento não encontrado para ${client.label}: "${establishmentNameRaw}".`,
        });
        return;
      }
      establishmentId = est.id;
    }

    // Item já escopado: esta planilha nunca move de cliente/estabelecimento —
    // só serve para conferência. Mismatch = rejeita a linha (mover é uma
    // ação deliberada, fora deste fluxo, para nunca acontecer por acidente).
    if (existing.client_id) {
      if (
        existing.client_id !== client.id ||
        (existing.establishment_id ?? null) !== establishmentId
      ) {
        errors.push({
          rowIndex: i,
          message:
            "Cliente/estabelecimento não bate com o já cadastrado — esta planilha não move o item de cliente. Edite pela tela de matéria-prima se isso for intencional.",
        });
        return;
      }
    }

    valid.push({
      id,
      name,
      price_unit,
      unit_price_brl,
      client_id: client.id,
      client_label: client.label,
      establishment_id: establishmentId,
      establishment_label: establishmentId
        ? (establishmentLabelById.get(establishmentId) ?? null)
        : null,
      notes: (row.notes ?? "").trim() || null,
    });
    validRowIndex.push(i);
  });

  // ── ID duplicado dentro do próprio arquivo (linha copiada por engano) ──────
  const idGroups = new Map<string, number[]>();
  valid.forEach((r, vi) => {
    const list = idGroups.get(r.id) ?? [];
    list.push(vi);
    idGroups.set(r.id, list);
  });
  const excludedByDuplicateId = new Set<number>();
  for (const group of idGroups.values()) {
    if (group.length < 2) continue;
    const lineNumbers = group.map((vi) => validRowIndex[vi] + 1);
    for (const vi of group) {
      excludedByDuplicateId.add(vi);
      const otherLines = lineNumbers.filter((n) => n !== validRowIndex[vi] + 1);
      errors.push({
        rowIndex: validRowIndex[vi],
        message: `ID duplicado no arquivo — repete na${otherLines.length > 1 ? "s" : ""} linha${otherLines.length > 1 ? "s" : ""} ${otherLines.join(", ")}.`,
      });
    }
  }

  // ── Nome renomeado colide com outro item existente do MESMO âmbito ─────────
  // Escopado por cliente/estabelecimento — o mesmo nome em clientes diferentes
  // não é colisão (ver invariante do plano de isolamento por cliente).
  const scopeKeyToId = new Map<string, string>();
  for (const [id, snap] of existingById.entries()) {
    if (!snap.client_id) continue;
    scopeKeyToId.set(
      rawMaterialScopeKey(snap.client_id, snap.establishment_id, snap.name),
      id,
    );
  }
  valid.forEach((r, vi) => {
    if (excludedByDuplicateId.has(vi)) return;
    const collidingId = scopeKeyToId.get(
      rawMaterialScopeKey(r.client_id, r.establishment_id, r.name),
    );
    if (collidingId && collidingId !== r.id) {
      excludedByDuplicateId.add(vi);
      errors.push({
        rowIndex: validRowIndex[vi],
        message: `Já existe outra matéria-prima chamada "${r.name}" para ${r.client_label} — escolha um nome diferente.`,
      });
    }
  });

  const dedupedValid = valid.filter((_, vi) => !excludedByDuplicateId.has(vi));
  const dedupedValidRowIndex = validRowIndex.filter((_, vi) => !excludedByDuplicateId.has(vi));

  const existingByRow = new Map<number, RawMaterialPriceExistingSnapshot>();
  dedupedValid.forEach((r, vi) => {
    const snap = existingById.get(r.id);
    if (snap) existingByRow.set(dedupedValidRowIndex[vi], snap);
  });

  return {
    valid: dedupedValid,
    validRowIndex: dedupedValidRowIndex,
    errors,
    existingByRow,
  };
}

// ── Cabeçalhos (template baixado com dados reais + auto-mapeamento) ────────

export const RAW_MATERIAL_PRICE_TEMPLATE_HEADERS: { key: string; header: string }[] = [
  { key: "id", header: "ID" },
  { key: "name", header: "Nome do produto" },
  { key: "price_unit", header: "Unidade (g, kg, ml, l ou un)" },
  { key: "unit_price_brl", header: "Preço unitário (R$)" },
  { key: "client_name", header: "Cliente" },
  { key: "establishment_name", header: "Estabelecimento (opcional)" },
  { key: "notes", header: "Observações" },
];

export function matchRawMaterialPriceColumn(fileColumn: string): string | null {
  const norm = normalizeText(fileColumn);

  const byTemplateHeader = RAW_MATERIAL_PRICE_TEMPLATE_HEADERS.find(
    (h) => normalizeText(h.header) === norm,
  );
  if (byTemplateHeader) return byTemplateHeader.key;

  const byKey = RAW_MATERIAL_PRICE_IMPORT_FIELDS.find((f) => f.key === norm);
  if (byKey) return byKey.key;

  const byLabelPrefix = RAW_MATERIAL_PRICE_IMPORT_FIELDS.find((f) =>
    normalizeText(f.label).startsWith(norm),
  );
  return byLabelPrefix?.key ?? null;
}

// ── Planilha (.xlsx) para download, já com os dados reais do tenant ────────

export async function downloadRawMaterialPriceXlsx(
  rows: {
    id: string;
    name: string;
    price_unit: string;
    unit_price_brl: number;
    notes: string | null;
    /** Nome do cliente já cadastrado — vazio para itens legados (ainda sem
     *  cliente), forçando o usuário a preencher para migrar o item. */
    client_name: string;
    establishment_name: string;
  }[],
  /** Segunda aba com os nomes exatos aceitos — evita erro de digitação,
   *  principalmente para os itens legados que precisam de preenchimento. */
  reference?: {
    clientOptions: RawMaterialImportClientOption[];
    establishmentOptions: RawMaterialImportEstablishmentOption[];
  },
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Matérias-primas");

  sheet.addRow(RAW_MATERIAL_PRICE_TEMPLATE_HEADERS.map((h) => h.header));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const r of rows) {
    sheet.addRow([
      r.id,
      r.name,
      r.price_unit,
      r.unit_price_brl,
      r.client_name,
      r.establishment_name,
      r.notes ?? "",
    ]);
  }

  sheet.getColumn(1).width = 38;
  sheet.getColumn(1).font = { color: { argb: "FF888888" }, size: 9 };
  sheet.getColumn(2).width = 32;
  sheet.getColumn(3).width = 16;
  sheet.getColumn(4).width = 18;
  sheet.getColumn(5).width = 28;
  sheet.getColumn(6).width = 28;
  sheet.getColumn(7).width = 30;

  if (reference && reference.clientOptions.length > 0) {
    const refSheet = workbook.addWorksheet("Clientes e estabelecimentos");
    refSheet.addRow(["Cliente", "Estabelecimento"]);
    refSheet.getRow(1).font = { bold: true };
    refSheet.columns.forEach((col) => {
      col.width = 32;
    });
    for (const c of reference.clientOptions) {
      refSheet.addRow([c.label, ""]);
      const ests = reference.establishmentOptions.filter((e) => e.clientId === c.id);
      for (const e of ests) {
        refSheet.addRow([c.label, e.label]);
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "materias-primas-precos.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
