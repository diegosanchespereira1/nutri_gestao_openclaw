import { z } from "zod";

import { CLIENT_BUSINESS_SEGMENTS } from "@/lib/constants/client-business-segment";

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

const businessSegmentSchema = z.preprocess(
  emptyToNull,
  z.union([
    z.null(),
    z.enum(CLIENT_BUSINESS_SEGMENTS as [string, ...string[]]),
  ]),
);

const sexOrNull = z.preprocess(
  emptyToNull,
  z.union([z.null(), z.enum(["female", "male", "other"])]),
);

const emailOrNull = z.preprocess(
  emptyToNull,
  z.union([z.null(), z.string().email().max(320)]),
);

const optionalText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.union([z.null(), z.string().max(max)]),
  );

const birthDateOrNull = z.preprocess(
  emptyToNull,
  z.union([z.null(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
);

export const clientImportRowSchema = z.object({
  legal_name: z.string().min(1).max(2000),
  kind: clientKindSchema,
  document_id: optionalText(32),
  trade_name: optionalText(2000),
  email: emailOrNull,
  phone: optionalText(64),
  business_segment: businessSegmentSchema,
  attended_full_name: optionalText(500),
  birth_date: birthDateOrNull,
  sex: sexOrNull,
  dietary_restrictions: optionalText(2000),
  chronic_medications: optionalText(2000),
});

export const establishmentImportRowSchema = z.object({
  name: z.string().min(1).max(500),
  establishment_type: establishmentTypeSchema,
  /** Nullable desde a migração 20260420110000: address_line1 pode ser preenchido depois. */
  address_line1: optionalText(2000),
  city: optionalText(200),
  state: optionalText(8),
  postal_code: optionalText(32),
});

export const patientImportRowSchema = z.object({
  full_name: z.string().min(1).max(500),
  birth_date: birthDateOrNull,
  document_id: optionalText(32),
  sex: sexOrNull,
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
