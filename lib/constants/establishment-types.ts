import type { ClientBusinessSegment } from "@/lib/constants/client-business-segment";
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

/** Deriva o tipo de estabelecimento a partir da categoria do negócio do cliente PJ. */
export function establishmentTypeFromSegment(
  segment: ClientBusinessSegment | string | null | undefined,
): EstablishmentType {
  switch (segment) {
    case "escola":
      return "escola";
    case "hospital":
      return "hospital";
    case "clinica":
      return "clinica";
    case "lar_idosos":
      return "lar_idosos";
    default:
      return "empresa";
  }
}
