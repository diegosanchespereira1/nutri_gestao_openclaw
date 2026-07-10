// Revalidação server-side da importação em massa de avaliações infantis.
// Segue o padrão de lib/validators/import-rows.ts (Story 2.6): a Server Action nunca
// confia nos dados do cliente — revalida forma e limites antes de qualquer insert.

import { z } from "zod";

export const MAX_CHILD_ASSESSMENT_IMPORT_ROWS = 500;

function emptyToNull(val: unknown) {
  if (val === "" || val === undefined) return null;
  return val;
}

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.union([z.null(), z.string().max(max)]));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const childAssessmentImportRowSchema = z.object({
  full_name: z.string().min(1).max(500),
  birth_date: isoDate,
  recorded_at: isoDate,
  sex: z.enum(["female", "male"]),
  weight_kg: z.number().positive().max(300),
  height_cm: z.number().positive().max(250),
  clinical_notes: optionalText(2000),
});

export type ChildAssessmentImportRowInput = z.infer<typeof childAssessmentImportRowSchema>;

const linkedSchema = z.object({
  kind: z.literal("linked"),
  clientId: z.string().uuid(),
  establishmentId: z.union([z.string().uuid(), z.null()]),
  schoolGradeId: z.union([z.string().uuid(), z.null()]).optional(),
});

const independentSchema = z.object({ kind: z.literal("independent") });

export const childAssessmentImportLinkSchema = z.union([linkedSchema, independentSchema]);

export type ChildAssessmentImportLinkInput = z.infer<typeof childAssessmentImportLinkSchema>;

export function parseImportChildAssessmentsPayload(rows: unknown, link: unknown) {
  const linkParsed = childAssessmentImportLinkSchema.safeParse(link);
  if (!linkParsed.success) {
    return { ok: false as const, error: "Vínculo de importação inválido." };
  }

  const arr = z
    .array(childAssessmentImportRowSchema)
    .max(MAX_CHILD_ASSESSMENT_IMPORT_ROWS)
    .safeParse(rows);
  if (!arr.success) {
    return { ok: false as const, error: "Dados de importação inválidos." };
  }

  return { ok: true as const, rows: arr.data, link: linkParsed.data };
}
