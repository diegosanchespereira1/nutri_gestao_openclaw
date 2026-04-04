/** Opções de fuso para a UI; valores são identificadores IANA. */
export const APP_TIME_ZONE_OPTIONS: {
  group: string;
  zones: { value: string; label: string }[];
}[] = [
  {
    group: "Brasil",
    zones: [
      { value: "America/Sao_Paulo", label: "Brasil — São Paulo, Brasília, Curitiba" },
      { value: "America/Manaus", label: "Brasil — Manaus (AM)" },
      { value: "America/Belem", label: "Brasil — Belém (PA)" },
      { value: "America/Fortaleza", label: "Brasil — Fortaleza (CE)" },
      { value: "America/Recife", label: "Brasil — Recife (PE)" },
      { value: "America/Noronha", label: "Brasil — Fernando de Noronha" },
    ],
  },
  {
    group: "Portugal e vizinhos",
    zones: [
      { value: "Europe/Lisbon", label: "Portugal — continente" },
      { value: "Atlantic/Madeira", label: "Portugal — Madeira" },
      { value: "Atlantic/Azores", label: "Portugal — Açores" },
      { value: "Europe/Madrid", label: "Espanha" },
    ],
  },
  {
    group: "Outras Américas",
    zones: [
      { value: "America/New_York", label: "EUA — Este" },
      { value: "America/Chicago", label: "EUA — Centro" },
      { value: "America/Denver", label: "EUA — Montanhas" },
      { value: "America/Los_Angeles", label: "EUA — Pacífico" },
      { value: "America/Mexico_City", label: "México" },
      { value: "America/Argentina/Buenos_Aires", label: "Argentina" },
    ],
  },
  {
    group: "Europa e África",
    zones: [
      { value: "Europe/London", label: "Reino Unido" },
      { value: "Europe/Paris", label: "França" },
      { value: "Europe/Berlin", label: "Alemanha" },
      { value: "Europe/Rome", label: "Itália" },
      { value: "Africa/Luanda", label: "Angola" },
      { value: "Africa/Maputo", label: "Moçambique" },
    ],
  },
];

export const ALLOWED_APP_TIME_ZONES = new Set(
  APP_TIME_ZONE_OPTIONS.flatMap((g) => g.zones.map((z) => z.value)),
);

/** Alinhado ao default da coluna em `profiles` (comportamento anterior). */
export const DEFAULT_PROFILE_TIME_ZONE = "Europe/Lisbon";

export function normalizeAppTimeZone(raw: string | null | undefined): string {
  if (raw && ALLOWED_APP_TIME_ZONES.has(raw)) return raw;
  return DEFAULT_PROFILE_TIME_ZONE;
}
