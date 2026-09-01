/**
 * Parsers e ordenação puros extraídos de `lib/actions/patients.ts` (T0.4).
 *
 * `lib/actions/**` está fora do include do vitest, então estas regras — sexo,
 * data de nascimento, CPF do paciente e a ordem da lista por série escolar —
 * não tinham teste. Extração sem mudança de comportamento.
 */
import type { PatientInScope, PatientSex } from "@/lib/types/patients";
import { isValidCpf, onlyDigits } from "@/lib/validators/br-document";

export function parseSex(raw: unknown): PatientSex | null {
  if (raw === "female" || raw === "male" || raw === "other") return raw;
  if (raw === "" || raw == null) return null;
  return null;
}

export type ParsedField<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** Data de nascimento é obrigatória e tem de vir como ISO `YYYY-MM-DD`. */
export function parseOptionalBirthDate(raw: string): ParsedField<string> {
  const t = raw.trim();
  if (!t) return { ok: false, error: "Data de nascimento é obrigatória." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return { ok: false, error: "Data de nascimento inválida." };
  }
  return { ok: true, value: t };
}

/** Documento do PACIENTE é sempre CPF (nunca CNPJ) e é opcional. */
export function parsePatientDocument(raw: string): ParsedField<string | null> {
  const digits = onlyDigits(raw);
  if (digits.length === 0) return { ok: true, value: null };
  if (!isValidCpf(digits)) return { ok: false, error: "CPF inválido." };
  return { ok: true, value: digits };
}

/**
 * Ordem da lista de pacientes dentro de um escopo:
 * com série antes de sem série, depois por posição, nome da série e nome.
 */
export function comparePatientsInScope(
  a: PatientInScope,
  b: PatientInScope,
): number {
  const aHasGrade = a.school_grade_name != null;
  const bHasGrade = b.school_grade_name != null;
  if (aHasGrade !== bHasGrade) return aHasGrade ? -1 : 1;

  const posA = a.school_grade_position ?? 0;
  const posB = b.school_grade_position ?? 0;
  if (posA !== posB) return posA - posB;

  const gradeCmp = (a.school_grade_name ?? "").localeCompare(
    b.school_grade_name ?? "",
    "pt",
    { sensitivity: "base" },
  );
  if (gradeCmp !== 0) return gradeCmp;

  return a.full_name.localeCompare(b.full_name, "pt", { sensitivity: "base" });
}
