import { z } from "zod";

export const MAX_IMPORT_ROWS = 500;

function emptyToNull(val: unknown) {
  if (val === "" || val === undefined) return null;
  return val;
}

const clientKindSchema = z.enum(["pf", "pj"]);

const establishmentTypeSchema = z.enum([
  "escola",
  "hospital",
  "clinica",
  "lar_idosos",
  "empresa",
]);

const patientSexSchema = z
  .enum(["female", "male", "other"])
  .nullable()
  .optional();

const emailOrNull = z.preprocess(
  emptyToNull,
  z.union([z.null(), z.string().email().max(320)]),
);

const optionalText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.union([z.null(), z.string().max(max)]),
  );

export const clientImportRowSchema = z.object({
  legal_name: z.string().min(1).max(2000),
  kind: clientKindSchema,
  document_id: optionalText(32),
  trade_name: optionalText(2000),
  email: emailOrNull,
  phone: optionalText(64),
});

export const establishmentImportRowSchema = z.object({
  name: z.string().min(1).max(500),
  establishment_type: establishmentTypeSchema,
  address_line1: z.string().min(1).max(2000),
  city: optionalText(200),
  state: optionalText(8),
  postal_code: optionalText(32),
});

const birthDateOrNull = z.preprocess(
  emptyToNull,
  z.union([z.null(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
);

export const patientImportRowSchema = z.object({
  full_name: z.string().min(1).max(500),
  birth_date: birthDateOrNull,
  document_id: optionalText(32),
  sex: patientSexSchema,
  email: emailOrNull,
  phone: optionalText(64),
});

export const clientIdSchema = z.string().uuid();

export function parseImportClientsPayload(rows: unknown) {
  const arr = z
    .array(clientImportRowSchema)
    .max(MAX_IMPORT_ROWS)
    .safeParse(rows);
  if (!arr.success) {
    return { ok: false as const, error: "Dados de importação inválidos." };
  }
  return { ok: true as const, rows: arr.data };
}

export function parseImportEstablishmentsPayload(
  rows: unknown,
  clientId: unknown,
) {
  const idParsed = clientIdSchema.safeParse(clientId);
  if (!idParsed.success) {
    return { ok: false as const, error: "Cliente inválido." };
  }
  const arr = z
    .array(establishmentImportRowSchema)
    .max(MAX_IMPORT_ROWS)
    .safeParse(rows);
  if (!arr.success) {
    return { ok: false as const, error: "Dados de importação inválidos." };
  }
  return { ok: true as const, rows: arr.data, clientId: idParsed.data };
}

export function parseImportPatientsPayload(rows: unknown, clientId: unknown) {
  const idParsed = clientIdSchema.safeParse(clientId);
  if (!idParsed.success) {
    return { ok: false as const, error: "Cliente inválido." };
  }
  const arr = z
    .array(patientImportRowSchema)
    .max(MAX_IMPORT_ROWS)
    .safeParse(rows);
  if (!arr.success) {
    return { ok: false as const, error: "Dados de importação inválidos." };
  }
  return { ok: true as const, rows: arr.data, clientId: idParsed.data };
}
