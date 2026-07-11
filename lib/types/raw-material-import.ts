// Upload em massa de matérias-primas — criação/atualização por nome exato.
// Ver lib/actions/import-raw-materials.ts e components/importar/raw-material-import-wizard.tsx.

import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import type { FieldDef } from "@/lib/types/import";

/** Linha validada no cliente, antes de qualquer decisão sobre conflito. */
export type RawMaterialImportRow = {
  name: string;
  price_unit: RecipeLineUnit;
  unit_price_brl: number;
  notes: string | null;
  /** Resolvido a partir da coluna "Cliente" (nome) — nunca aceito sem
   *  correspondência exata a um cliente PJ do tenant. */
  client_id: string;
  client_label: string;
  /** Resolvido a partir da coluna "Estabelecimento" (nome), quando informada.
   *  Vazio = repositório do cliente (todos os estabelecimentos dele). */
  establishment_id: string | null;
  establishment_label: string | null;
};

export const RAW_MATERIAL_IMPORT_FIELDS: FieldDef[] = [
  { key: "name", label: "Nome do produto", required: true },
  { key: "price_unit", label: "Unidade (g, kg, ml, l ou un)", required: true },
  { key: "unit_price_brl", label: "Preço unitário (R$)", required: true },
  { key: "client_name", label: "Cliente", required: true },
  {
    key: "establishment_name",
    label: "Estabelecimento (opcional — vazio = todos os estabelecimentos do cliente)",
    required: false,
  },
  { key: "notes", label: "Observações (opcional)", required: false },
];

/** O que fazer quando o nome da linha já existe cadastrado (exato, sem
 *  diferenciar maiúsculas/minúsculas ou espaços nas pontas). */
export type RawMaterialImportResolution =
  | "create" // sem conflito — cria normalmente
  | "overwrite" // sobrescreve o item existente com os dados da linha
  | "create_new" // cria um novo item, com sufixo "_1" (ou "_2"...) no nome
  | "ignore"; // não faz nada com esta linha

/** Linha pronta para envio à Server Action, já com a decisão do usuário. */
export type RawMaterialImportSubmitRow = RawMaterialImportRow & {
  resolution: RawMaterialImportResolution;
};

/** Cliente/estabelecimento disponíveis para resolver as colunas de nome da planilha. */
export type RawMaterialImportClientOption = { id: string; label: string };
export type RawMaterialImportEstablishmentOption = {
  id: string;
  label: string;
  clientId: string;
};

/** Conflito detectado na pré-visualização (nome já existe no tenant). */
export type RawMaterialImportConflict = {
  existingId: string;
  existingPriceUnit: RecipeLineUnit;
  existingUnitPriceBrl: number;
  existingNotes: string | null;
};

export type RawMaterialImportResult =
  | { ok: true; created: number; updated: number; ignored: number; skipped: number }
  | { ok: false; error: string };
