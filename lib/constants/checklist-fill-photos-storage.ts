/** Bucket Supabase Storage para fotos de itens em preenchimento de checklist (visita / rascunho). */
export const CHECKLIST_FILL_PHOTOS_BUCKET = "checklist-fill-photos";

/** Limite por ficheiro (bytes). */
export const CHECKLIST_FILL_PHOTO_MAX_BYTES = 6 * 1024 * 1024;

/** Máximo de fotos por item (MVP). */
export const CHECKLIST_FILL_PHOTOS_MAX_PER_ITEM = 12;

/** TTL de URL assinada para pré-visualização (segundos). */
export const CHECKLIST_FILL_PHOTO_SIGNED_URL_SEC = 3600;

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAllowedChecklistPhotoContentType(mime: string): boolean {
  return allowed.has(mime.toLowerCase());
}

export function extensionForImageMime(mime: string): string | null {
  const m = mime.toLowerCase();
  if (m === "image/jpeg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  return null;
}
