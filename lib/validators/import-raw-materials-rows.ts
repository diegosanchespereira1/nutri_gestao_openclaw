// Revalidação server-side do upload em massa de matérias-primas.
// Mesmo padrão de lib/validators/import-child-assessment-rows.ts: a Server
// Action nunca confia nos dados do cliente — revalida forma e limites antes
// de qualquer insert/update. A resolução de conflito por nome também é
// sempre re-checada no servidor (lib/actions/import-raw-materials.ts), nunca
// aceita o `existingId` que o cliente eventualmente tenha enviado.

import { z } from "zod";

import { RECIPE_LINE_UNITS } from "@/lib/constants/recipe-line-units";

export const MAX_RAW_MATERIAL_IMPORT_ROWS = 500;

function emptyToNull(val: unknown) {
  if (val === "" || val === undefined) return null;
  return val;
}

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.union([z.null(), z.string().max(max)]));

export const rawMaterialImportRowSchema = z.object({
  name: z.string().min(1).max(300),
  price_unit: z.enum(RECIPE_LINE_UNITS),
  unit_price_brl: z.coerce.number().positive().max(1_000_000),
  notes: optionalText(2000),
  resolution: z.enum(["create", "overwrite", "create_new", "ignore"]),
  // Resolvidos client-side a partir do nome na planilha — a Server Action
  // sempre revalida posse/tipo antes de usar (nunca confia cegamente).
  client_id: z.string().uuid(),
  establishment_id: z.string().uuid().nullable().optional(),
});

export type RawMaterialImportRowInput = z.infer<typeof rawMaterialImportRowSchema>;

export function parseImportRawMaterialsPayload(rows: unknown) {
  const arr = z
    .array(rawMaterialImportRowSchema)
    .max(MAX_RAW_MATERIAL_IMPORT_ROWS)
    .safeParse(rows);
  if (!arr.success) {
    return { ok: false as const, error: "Dados de importação inválidos." };
  }
  return { ok: true as const, rows: arr.data };
}
