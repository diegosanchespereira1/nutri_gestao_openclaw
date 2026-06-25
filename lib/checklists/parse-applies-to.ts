import type { EstablishmentType } from "@/lib/types/establishments";

export function parseAppliesTo(raw: unknown): EstablishmentType[] {
  if (!Array.isArray(raw)) return [];
  const allowed: EstablishmentType[] = [
    "escola",
    "hospital",
    "clinica",
    "lar_idosos",
    "restaurante",
    "frigorifico",
    "mercado",
    "cozinha_industrial",
    "hotel",
    "empresa",
  ];
  return raw.filter(
    (x): x is EstablishmentType =>
      typeof x === "string" && allowed.includes(x as EstablishmentType),
  );
}
