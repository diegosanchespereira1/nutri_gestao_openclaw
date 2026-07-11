// Helpers puros do histórico de alterações de matéria-prima: cálculo do diff
// entre snapshot antigo/novo, rótulo de origem e frase-resumo em pt-BR.
// Mesmo padrão de lib/patients/responsible-history.ts.

import { RECIPE_LINE_UNIT_LABELS } from "@/lib/constants/recipe-line-units";
import type {
  RawMaterialChangeFields,
  RawMaterialChangeSource,
} from "@/lib/types/raw-material-history";

export type RawMaterialSnapshot = {
  name: string;
  price_unit: string;
  unit_price_brl: number;
  notes: string | null;
};

/** Compara dois snapshots e devolve só os campos que realmente mudaram. */
export function computeRawMaterialChangeFields(
  before: RawMaterialSnapshot,
  after: RawMaterialSnapshot,
): RawMaterialChangeFields {
  const fields: RawMaterialChangeFields = {};

  if (before.name.trim() !== after.name.trim()) {
    fields.name = { old: before.name, new: after.name };
  }
  if (before.price_unit !== after.price_unit) {
    fields.price_unit = { old: before.price_unit, new: after.price_unit };
  }
  if (before.unit_price_brl !== after.unit_price_brl) {
    fields.unit_price_brl = { old: before.unit_price_brl, new: after.unit_price_brl };
  }
  if ((before.notes ?? "") !== (after.notes ?? "")) {
    fields.notes = { old: before.notes, new: after.notes };
  }

  return fields;
}

export function hasRawMaterialChangeFields(fields: RawMaterialChangeFields): boolean {
  return Object.keys(fields).length > 0;
}

export const RAW_MATERIAL_CHANGE_SOURCE_LABELS: Record<RawMaterialChangeSource, string> = {
  manual_edit: "Edição manual",
  bulk_price_import: "Atualização de preços em massa",
  bulk_create_import: "Upload em massa",
};

function formatBrl(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function unitLabel(unit: string): string {
  return (RECIPE_LINE_UNIT_LABELS as Record<string, string>)[unit] ?? unit;
}

/** Constrói a frase-resumo pt-BR de um evento a partir dos campos alterados. */
export function buildRawMaterialChangeSummary(fields: RawMaterialChangeFields): string {
  const parts: string[] = [];

  if (fields.name) {
    parts.push(`nome de "${fields.name.old}" para "${fields.name.new}"`);
  }
  if (fields.unit_price_brl) {
    parts.push(`preço de ${formatBrl(fields.unit_price_brl.old)} para ${formatBrl(fields.unit_price_brl.new)}`);
  }
  if (fields.price_unit) {
    parts.push(`unidade de ${unitLabel(fields.price_unit.old)} para ${unitLabel(fields.price_unit.new)}`);
  }
  if (fields.notes) {
    parts.push("observações");
  }

  if (parts.length === 0) return "Alteração registrada.";
  if (parts.length === 1) return `Alterou ${parts[0]}.`;

  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1);
  return `Alterou ${rest.join(", ")} e ${last}.`;
}

export function formatRawMaterialChangeDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
