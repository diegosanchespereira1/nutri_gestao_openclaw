/**
 * Detecção e conversão HEIC/HEIF no browser (fotos iPhone).
 * Usa `heic-to/csp` (libheif 1.21+) — compatível com CSP de produção sem `unsafe-eval`.
 * Importar apenas de componentes com `"use client"`.
 */

const HEIC_MIME_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

function isHeicByNameOrMime(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (HEIC_MIME_TYPES.has(type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "heic" || ext === "heif";
}

/** Blob com MIME explícito quando o SO não preenche `file.type` (comum no iOS). */
async function blobForHeicDecode(file: File): Promise<Blob> {
  if (file.type) return file;
  const buf = await file.arrayBuffer();
  return new Blob([buf], { type: "image/heic" });
}

/**
 * Deteta HEIC por extensão/MIME ou assinatura do ficheiro (magic bytes via heic-to).
 */
export async function fileLooksLikeHeic(file: File): Promise<boolean> {
  if (isHeicByNameOrMime(file)) return true;
  const { isHeic } = await import("heic-to/csp");
  try {
    return await isHeic(file);
  } catch {
    return false;
  }
}

/** Converte HEIC/HEIF para JPEG. Lança se a conversão falhar. */
export async function convertHeicToJpegFile(
  file: File,
  quality = 0.9,
): Promise<File> {
  const { heicTo } = await import("heic-to/csp");
  const blob = await blobForHeicDecode(file);
  const jpegBlob = await heicTo({
    blob,
    type: "image/jpeg",
    quality,
  });
  const baseName = (file.name.replace(/\.[^.]+$/, "") || "foto").slice(0, 120);
  return new File([jpegBlob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}
