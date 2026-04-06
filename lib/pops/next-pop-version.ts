/**
 * Próximo número de versão para um POP (histórico imutável).
 */
export function nextPopVersionNumber(existing: number[]): number {
  if (existing.length === 0) return 1;
  return Math.max(...existing) + 1;
}
