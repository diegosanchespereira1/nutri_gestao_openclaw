/** Normaliza quebras de linha para comparação estável entre rascunho e versão guardada. */
export function normalizePopBodyForCompare(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Indica se o rascunho é igual à última versão (sem criar versão duplicada ao guardar).
 */
export function isPopDraftUnchanged(
  latestTitle: string,
  latestBody: string,
  draftTitle: string,
  draftBody: string,
): boolean {
  const t1 = latestTitle.trim();
  const t2 = draftTitle.trim();
  const b1 = normalizePopBodyForCompare(latestBody);
  const b2 = normalizePopBodyForCompare(draftBody);
  return t1 === t2 && b1 === b2;
}
