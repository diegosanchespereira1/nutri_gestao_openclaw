// Revalidação server-side da atualização de preços em massa. A Server Action
// nunca confia no cliente: todo `id` é re-checado contra o tenant antes de
// qualquer update (lib/actions/import-raw-material-prices.ts). Linha sem ID
// válido do tenant é rejeitada, nunca vira criação de item novo.

import { z } from "zod";

import { RECIPE_LINE_UNITS } from "@/lib/constants/recipe-line-units";

export const MAX_RAW_MATERIAL_PRICE_IMPORT_ROWS = 500;

function emptyToNull(val: unknown) {
  if (val === "" || val === undefined) return null;
  return val;
}

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.union([z.null(), z.string().max(max)]));

export const rawMaterialPriceImportRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(300),
  price_unit: z.enum(RECIPE_LINE_UNITS),
  unit_price_brl: z.coerce.number().positive().max(1_000_000),
  notes: optionalText(2000),
});

export type RawMaterialPriceImportRowInput = z.infer<typeof rawMaterialPriceImportRowSchema>;

export function parseImportRawMaterialPricesPayload(rows: unknown) {
  const arr = z
    .array(rawMaterialPriceImportRowSchema)
    .max(MAX_RAW_MATERIAL_PRICE_IMPORT_ROWS)
    .safeParse(rows);
  if (!arr.success) {
    return { ok: false as const, error: "Dados de importação inválidos." };
  }
  return { ok: true as const, rows: arr.data };
}
