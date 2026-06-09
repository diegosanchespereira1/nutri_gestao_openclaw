import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CLIENT_LOGOS_BUCKET,
  MAX_CLIENT_LOGO_BYTES,
} from "@/lib/constants/client-logos-storage";
import {
  extensionForCanonicalImageMime,
  normalizeImageMime,
} from "@/lib/images/image-mime";

// ─── Cache em memória (nível de processo Node.js) ────────────────────────────
// Evita chamar o Storage a cada render sem precisar de service role.
// As URLs assinadas são válidas 60 min; o cache dura 50 min.
// Os paths incluem o owner_user_id, por isso não há colisão entre utilizadores.

const SIGNED_URL_EXPIRES_SEC = 3600;
const LOGO_URL_TTL_MS = 50 * 60 * 1000; // 50 min

type CacheEntry = { url: string; expiresAt: number };
const _logoUrlCache = new Map<string, CacheEntry>();

async function _fetchSignedUrls(
  supabase: SupabaseClient,
  paths: string[],
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await supabase.storage
    .from(CLIENT_LOGOS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_EXPIRES_SEC);
  if (error || !data) return new Map();
  const result = new Map<string, string>();
  for (const item of data) {
    if (item.path && item.signedUrl) result.set(item.path, item.signedUrl);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────

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
 * Invalida entradas de cache para os paths indicados.
 * Chamar quando um logo é actualizado ou removido.
 */
export function evictLogoCacheEntries(paths: (string | null)[]): void {
  for (const p of paths) {
    if (p) _logoUrlCache.delete(p);
  }
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
    evictLogoCacheEntries([previousPath]);
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

  const mime = normalizeImageMime(entry.type, entry.name);
  if (!mime) {
    return {
      ok: false,
      error: "Use PNG, JPEG (.jpg) ou WebP para o logótipo.",
    };
  }

  const ext = extensionForCanonicalImageMime(mime);
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
    evictLogoCacheEntries([previousPath]);
  }

  return { ok: true, path };
}

/**
 * URL assinada para um único logo com cache em memória.
 */
export async function getClientLogoSignedUrl(
  supabase: SupabaseClient,
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath?.trim()) return null;
  const now = Date.now();
  const cached = _logoUrlCache.get(storagePath);
  if (cached && cached.expiresAt > now) return cached.url;

  const fresh = await _fetchSignedUrls(supabase, [storagePath]);
  const url = fresh.get(storagePath) ?? null;
  if (url) _logoUrlCache.set(storagePath, { url, expiresAt: now + LOGO_URL_TTL_MS });
  return url;
}

/**
 * URLs assinadas para múltiplos logos com cache em memória.
 * Apenas vai ao Storage buscar os paths em falta — os restantes vêm do cache.
 */
export async function getClientLogoSignedUrls(
  supabase: SupabaseClient,
  storagePaths: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(storagePaths.filter((p) => p.trim().length > 0))];
  if (unique.length === 0) return new Map();

  const now = Date.now();
  const result = new Map<string, string>();
  const missing: string[] = [];

  for (const path of unique) {
    const cached = _logoUrlCache.get(path);
    if (cached && cached.expiresAt > now) {
      result.set(path, cached.url);
    } else {
      missing.push(path);
    }
  }

  if (missing.length > 0) {
    const fresh = await _fetchSignedUrls(supabase, missing);
    const expiresAt = now + LOGO_URL_TTL_MS;
    for (const [path, url] of fresh) {
      _logoUrlCache.set(path, { url, expiresAt });
      result.set(path, url);
    }
  }

  return result;
}
