import type { EstablishmentType } from "@/lib/types/establishments";

/** Valores persistidos em `establishments.establishment_type` (PRD FR7). */
export const ESTABLISHMENT_TYPES: readonly EstablishmentType[] = [
  "escola",
  "hospital",
  "clinica",
  "lar_idosos",
  "empresa",
] as const;

export const establishmentTypeLabel: Record<EstablishmentType, string> = {
  escola: "Escola",
  hospital: "Hospital",
  clinica: "Clínica",
  lar_idosos: "Lar de idosos",
  empresa: "Empresa",
};

export function parseEstablishmentType(
  raw: unknown,
): EstablishmentType | null {
  if (typeof raw !== "string") return null;
  return ESTABLISHMENT_TYPES.includes(raw as EstablishmentType)
    ? (raw as EstablishmentType)
    : null;
}
