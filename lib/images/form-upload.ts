/** Extrai um upload de imagem do FormData (File ou Blob no servidor). */
export function getFormDataImageUpload(
  formData: FormData,
  key: string,
): { blob: Blob; fileName: string } | null {
  const entry = formData.get(key);
  if (entry == null || typeof entry === "string") return null;
  if (!(entry instanceof Blob) || entry.size === 0) return null;

  const fileName =
    "name" in entry && typeof (entry as File).name === "string"
      ? (entry as File).name
      : "upload.jpg";

  return { blob: entry, fileName };
}
