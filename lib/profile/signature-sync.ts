import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MAX_PROFESSIONAL_SIGNATURE_BYTES,
  PROFESSIONAL_SIGNATURES_BUCKET,
} from "@/lib/constants/professional-signatures-storage";
import {
  extensionForCanonicalImageMime,
  normalizeImageMime,
} from "@/lib/images/image-mime";

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

async function deleteAtPathIfAny(
  supabase: SupabaseClient,
  path: string | null,
): Promise<void> {
  if (!path?.trim()) return;
  await supabase.storage.from(PROFESSIONAL_SIGNATURES_BUCKET).remove([path]);
}

/** Decodifica um data URL PNG/JPEG/WebP em { bytes, mime } ou null. */
function decodeDataUrl(
  dataUrl: string,
): { bytes: Uint8Array; mime: string } | null {
  const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
  if (!match?.[2]) return null;
  try {
    const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
    return { bytes, mime: `image/${match[1] === "jpeg" ? "jpeg" : match[1]}` };
  } catch {
    return null;
  }
}

/**
 * Resolve o path da assinatura a partir do formulário do perfil.
 * Aceita, nesta ordem: `remove_signature`, um data URL desenhado em
 * `signature_data`, ou um arquivo carregado em `signature`.
 */
export async function resolveProfileSignaturePathFromForm(args: {
  supabase: SupabaseClient;
  userId: string;
  formData: FormData;
  previousPath: string | null;
}): Promise<{ ok: true; path: string | null } | { ok: false; error: string }> {
  const { supabase, userId, formData, previousPath } = args;

  const removeRaw = String(formData.get("remove_signature") ?? "").trim();
  if (removeRaw === "1" || removeRaw === "on") {
    await deleteAtPathIfAny(supabase, previousPath);
    return { ok: true, path: null };
  }

  // 1) Assinatura desenhada (canvas → data URL PNG)
  const drawn = String(formData.get("signature_data") ?? "").trim();
  if (drawn.startsWith("data:image/")) {
    const decoded = decodeDataUrl(drawn);
    if (!decoded) return { ok: false, error: "Assinatura inválida." };
    if (decoded.bytes.byteLength > MAX_PROFESSIONAL_SIGNATURE_BYTES) {
      return { ok: false, error: "A assinatura é muito grande." };
    }
    const ext = decoded.mime === "image/jpeg" ? "jpg" : decoded.mime === "image/webp" ? "webp" : "png";
    const path = `${userId}/signature_${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(PROFESSIONAL_SIGNATURES_BUCKET)
      .upload(path, decoded.bytes, { contentType: decoded.mime, upsert: false });
    if (error) return { ok: false, error: "Não foi possível salvar a assinatura." };
    if (previousPath && previousPath !== path) await deleteAtPathIfAny(supabase, previousPath);
    return { ok: true, path };
  }

  // 2) Arquivo carregado
  const entry = formData.get("signature");
  if (!isFile(entry) || entry.size === 0) {
    return { ok: true, path: previousPath };
  }
  if (entry.size > MAX_PROFESSIONAL_SIGNATURE_BYTES) {
    return {
      ok: false,
      error: `A assinatura deve ter no máximo ${MAX_PROFESSIONAL_SIGNATURE_BYTES / 1024 / 1024} MB.`,
    };
  }
  const mime = normalizeImageMime(entry.type, entry.name);
  if (!mime) return { ok: false, error: "Use PNG, JPEG (.jpg) ou WebP para a assinatura." };

  const ext = extensionForCanonicalImageMime(mime);
  const path = `${userId}/signature_${crypto.randomUUID()}.${ext}`;
  const body = new Uint8Array(await entry.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(PROFESSIONAL_SIGNATURES_BUCKET)
    .upload(path, body, { contentType: mime, upsert: false });
  if (uploadError) return { ok: false, error: "Não foi possível carregar a assinatura." };
  if (previousPath && previousPath !== path) await deleteAtPathIfAny(supabase, previousPath);
  return { ok: true, path };
}

/** Baixa os bytes da assinatura (para embutir em PDFs). Null se ausente. */
export async function getProfileSignatureBytes(
  supabase: SupabaseClient,
  path: string | null,
): Promise<Buffer | null> {
  if (!path?.trim()) return null;
  const { data, error } = await supabase.storage
    .from(PROFESSIONAL_SIGNATURES_BUCKET)
    .download(path);
  if (error || !data) return null;
  try {
    return Buffer.from(await data.arrayBuffer());
  } catch {
    return null;
  }
}

/** Limite do data URL persistido na sessão do checklist (aprovação do dossiê). */
export const MAX_SESSION_SIGNATURE_DATA_URL_CHARS = 512 * 1024;

function mimeFromStoragePath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "image/png";
}

/**
 * Converte a assinatura do perfil (storage path) em data URL para uso no checklist.
 * Retorna null se ausente, inválida ou maior que o limite da sessão.
 */
export async function getProfileSignatureDataUrl(
  supabase: SupabaseClient,
  path: string | null,
): Promise<string | null> {
  const bytes = await getProfileSignatureBytes(supabase, path);
  if (!bytes || !path?.trim()) return null;
  const mime = mimeFromStoragePath(path);
  const dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;
  if (dataUrl.length > MAX_SESSION_SIGNATURE_DATA_URL_CHARS) return null;
  return dataUrl;
}
