/** Bucket Supabase Storage para fotos de itens em preenchimento de checklist (visita / rascunho). */
export const CHECKLIST_FILL_PHOTOS_BUCKET = "checklist-fill-photos";

/** Limite por ficheiro (bytes). */
export const CHECKLIST_FILL_PHOTO_MAX_BYTES = 6 * 1024 * 1024;

/** Máximo de fotos por item (MVP). */
export const CHECKLIST_FILL_PHOTOS_MAX_PER_ITEM = 12;

/** TTL de URL assinada para pré-visualização (segundos). */
export const CHECKLIST_FILL_PHOTO_SIGNED_URL_SEC = 3600;

import {
  extensionForCanonicalImageMime,
  normalizeImageMime,
} from "@/lib/images/image-mime";

export function isAllowedChecklistPhotoContentType(
  mime: string,
  filename?: string,
): boolean {
  return normalizeImageMime(mime, filename) !== null;
}

export function extensionForImageMime(
  mime: string,
  filename?: string,
): string | null {
  const canonical = normalizeImageMime(mime, filename);
  return canonical ? extensionForCanonicalImageMime(canonical) : null;
}
