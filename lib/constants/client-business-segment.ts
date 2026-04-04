export type ClientBusinessSegment =
  | "padaria"
  | "mercado"
  | "escola"
  | "hospital"
  | "clinica"
  | "restaurante"
  | "hotel"
  | "industria_alimenticia"
  | "lar_idosos"
  | "empresa"
  | "outro";

export const CLIENT_BUSINESS_SEGMENTS: readonly ClientBusinessSegment[] = [
  "padaria",
  "mercado",
  "escola",
  "hospital",
  "clinica",
  "restaurante",
  "hotel",
  "industria_alimenticia",
  "lar_idosos",
  "empresa",
  "outro",
] as const;

export const clientBusinessSegmentLabel: Record<ClientBusinessSegment, string> =
  {
    padaria: "Padaria",
    mercado: "Mercado / minimercado",
    escola: "Escola",
    hospital: "Hospital",
    clinica: "Clínica",
    restaurante: "Restaurante / refeição coletiva",
    hotel: "Hotel / hospedagem",
    industria_alimenticia: "Indústria alimentícia",
    lar_idosos: "Lar / ILPI",
    empresa: "Empresa (outros setores)",
    outro: "Outro",
  };

export function isClientBusinessSegment(
  v: string,
): v is ClientBusinessSegment {
  return (CLIENT_BUSINESS_SEGMENTS as readonly string[]).includes(v);
}
