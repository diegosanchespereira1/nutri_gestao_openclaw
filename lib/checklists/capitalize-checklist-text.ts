const FIRST_LETTER_RE = /^([^\p{L}]*)(\p{L})(.*)$/u;

/** Capitaliza a primeira letra alfabética (suporta acentuação pt-BR). */
export function capitalizeChecklistText(text: string): string {
  const match = text.match(FIRST_LETTER_RE);
  if (!match) return text;

  const [, prefix, firstLetter, rest] = match;
  return `${prefix}${firstLetter.toLocaleUpperCase("pt-BR")}${rest}`;
}

/** Aplica trim e capitaliza a primeira letra alfabética. */
export function normalizeChecklistText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return capitalizeChecklistText(trimmed);
}
