import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CLIENT_LOGOS_BUCKET,
  CLIENT_LOGO_ACCEPT_MIME,
  MAX_CLIENT_LOGO_BYTES,
} from "@/lib/constants/client-logos-storage";

function isFile(v: unknown): v is File {
  return typeof File !== "undefined" && v instanceof File;
}

export async function deleteLogoAtPathIfAny(
  supabase: SupabaseClient,
  path: string | null,
): Promise<void> {
  if (!path?.trim()) return;
  await supabase.storage.from(CLIENT_LOGOS_BUCKET).remove([path]);
}

/**
 * Processa remoção ou novo upload de logo. Devolve o path final (ou null).
 */
export async function resolveClientLogoPathFromForm(args: {
  supabase: SupabaseClient;
  userId: string;
  clientId: string;
  formData: FormData;
  previousPath: string | null;
}): Promise<{ ok: true; path: string | null } | { ok: false; error: string }> {
  const { supabase, userId, clientId, formData, previousPath } = args;

  const removeRaw = String(formData.get("remove_logo") ?? "").trim();
  if (removeRaw === "1" || removeRaw === "on") {
    await deleteLogoAtPathIfAny(supabase, previousPath);
    return { ok: true, path: null };
  }

  const entry = formData.get("logo");
  if (!isFile(entry) || entry.size === 0) {
    return { ok: true, path: previousPath };
  }

  if (entry.size > MAX_CLIENT_LOGO_BYTES) {
    return {
      ok: false,
      error: `O logótipo deve ter no máximo ${MAX_CLIENT_LOGO_BYTES / 1024 / 1024} MB.`,
    };
  }

  const mime = (entry.type || "").toLowerCase();
  if (!CLIENT_LOGO_ACCEPT_MIME.has(mime)) {
    return {
      ok: false,
      error: "Use PNG, JPEG ou WebP para o logótipo.",
    };
  }

  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${userId}/${clientId}/logo_${crypto.randomUUID()}.${ext}`;

  const body = new Uint8Array(await entry.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(CLIENT_LOGOS_BUCKET)
    .upload(path, body, {
      contentType: mime,
      upsert: false,
    });

  if (upErr) {
    return { ok: false, error: "Não foi possível carregar o logótipo." };
  }

  if (previousPath && previousPath !== path) {
    await deleteLogoAtPathIfAny(supabase, previousPath);
  }

  return { ok: true, path };
}

export async function getClientLogoSignedUrl(
  supabase: SupabaseClient,
  storagePath: string | null,
  expiresSec = 3600,
): Promise<string | null> {
  if (!storagePath?.trim()) return null;
  const { data, error } = await supabase.storage
    .from(CLIENT_LOGOS_BUCKET)
    .createSignedUrl(storagePath, expiresSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Gera URLs assinadas para múltiplos logos numa única chamada HTTP ao Storage.
 * Retorna um Map de storagePath → signedUrl (ou null em caso de erro por item).
 */
export async function getClientLogoSignedUrls(
  supabase: SupabaseClient,
  storagePaths: string[],
  expiresSec = 3600,
): Promise<Map<string, string>> {
  const unique = [...new Set(storagePaths.filter((p) => p.trim().length > 0))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from(CLIENT_LOGOS_BUCKET)
    .createSignedUrls(unique, expiresSec);

  if (error || !data) return new Map();

  const result = new Map<string, string>();
  for (const item of data) {
    if (item.path && item.signedUrl) {
      result.set(item.path, item.signedUrl);
    }
  }
  return result;
}
