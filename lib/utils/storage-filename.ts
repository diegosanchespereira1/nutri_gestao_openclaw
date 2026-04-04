/** Nome seguro para segmento de path em Storage (sem path traversal). */
export function sanitizeStorageFilename(name: string): string {
  const base = name
    .replace(/^.*[/\\]/, "")
    .replace(/[^\w.\-()\s\u00C0-\u024F]/gi, "_");
  const trimmed = base.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 200) : "ficheiro";
}
