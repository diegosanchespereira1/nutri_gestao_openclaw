// Atualização em massa de matérias-primas via planilha com ID — baixar,
// editar (preço e, se quiser, nome/unidade/observações) e reenviar.
// O casamento é sempre por ID, nunca por nome — por isso o usuário pode
// renomear o item na planilha que o nome muda também no banco (a linha
// certa é sempre a mesma, o ID não muda).
// Ver lib/actions/import-raw-material-prices.ts e
// components/importar/raw-material-price-import-wizard.tsx.

import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import type { FieldDef } from "@/lib/types/import";

export type RawMaterialPriceImportRow = {
  id: string;
  name: string;
  price_unit: RecipeLineUnit;
  unit_price_brl: number;
  notes: string | null;
  /** Resolvido a partir da coluna "Cliente". Para item já escopado, precisa
   *  bater exatamente com o cliente já cadastrado (esta planilha nunca move
   *  matéria-prima de cliente). Para item legado (ainda sem cliente), vira a
   *  primeira atribuição. */
  client_id: string;
  client_label: string;
  establishment_id: string | null;
  establishment_label: string | null;
};

export const RAW_MATERIAL_PRICE_IMPORT_FIELDS: FieldDef[] = [
  { key: "id", label: "ID (não editar nem apagar)", required: true },
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

/** Estado atual (antes da edição) de um item — usado para mostrar o "de → para". */
export type RawMaterialPriceExistingSnapshot = {
  name: string;
  price_unit: RecipeLineUnit;
  unit_price_brl: number;
  notes: string | null;
  /** NULL = item legado, ainda não migrado — a planilha pode atribuir o
   *  cliente pela primeira vez. Não-nulo = âmbito já definido e imutável por
   *  esta planilha (só serve para conferência, não para mover de cliente). */
  client_id: string | null;
  establishment_id: string | null;
};

export type RawMaterialPriceImportResult =
  | { ok: true; updated: number; skipped: number; affectedRecipes: number }
  | { ok: false; error: string };
