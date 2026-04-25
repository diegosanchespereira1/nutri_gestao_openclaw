import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MAX_TENANT_LOGO_BYTES,
  TENANT_LOGOS_BUCKET,
  TENANT_LOGO_ACCEPT_MIME,
} from "@/lib/constants/tenant-logos-storage";

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

async function deleteTenantLogoIfAny(
  supabase: SupabaseClient,
  path: string | null,
): Promise<void> {
  if (!path?.trim()) return;
  await supabase.storage.from(TENANT_LOGOS_BUCKET).remove([path]);
}

/**
 * Processa remoção ou novo upload do logo do tenant a partir de um FormData.
 * Devolve o path final armazenado em `profiles.tenant_logo_storage_path`.
 */
export async function resolveTenantLogoPathFromForm(args: {
  supabase: SupabaseClient;
  ownerUserId: string;
  formData: FormData;
  previousPath: string | null;
}): Promise<{ ok: true; path: string | null } | { ok: false; error: string }> {
  const { supabase, ownerUserId, formData, previousPath } = args;

  const removeRaw = String(formData.get("remove_logo") ?? "").trim();
  if (removeRaw === "1" || removeRaw === "on") {
    await deleteTenantLogoIfAny(supabase, previousPath);
    return { ok: true, path: null };
  }

  const entry = formData.get("logo");
  if (!isFile(entry) || entry.size === 0) {
    return { ok: true, path: previousPath };
  }

  if (entry.size > MAX_TENANT_LOGO_BYTES) {
    return {
      ok: false,
      error: `O logotipo deve ter no máximo ${Math.round(MAX_TENANT_LOGO_BYTES / 1024 / 1024)} MB.`,
    };
  }

  const mime = (entry.type || "").toLowerCase();
  if (!TENANT_LOGO_ACCEPT_MIME.has(mime)) {
    return {
      ok: false,
      error: "Use PNG, JPEG ou WebP para o logotipo.",
    };
  }

  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${ownerUserId}/logo_${crypto.randomUUID()}.${ext}`;

  const body = new Uint8Array(await entry.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(TENANT_LOGOS_BUCKET)
    .upload(path, body, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: "Não foi possível enviar o logotipo." };
  }

  if (previousPath && previousPath !== path) {
    await deleteTenantLogoIfAny(supabase, previousPath);
  }

  return { ok: true, path };
}

/**
 * Retorna o path do logo do tenant acessível ao usuário autenticado.
 * Estratégia:
 *  1. Tenta a RPC `workspace_tenant_logo_storage_path` (security definer) —
 *     funciona tanto para o titular quanto para membros da equipe.
 *  2. Se a RPC ainda não estiver disponível (ex.: migração pendente), faz
 *     fallback para uma leitura direta em `profiles` para o próprio usuário.
 *     Para membros da equipe, esse fallback retorna `null` (RLS esperada).
 */
export async function fetchTenantLogoStoragePath(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await supabase.rpc(
    "workspace_tenant_logo_storage_path",
  );

  if (!error) {
    const path = typeof data === "string" ? data.trim() : "";
    return path.length > 0 ? path : null;
  }

  const msg = error.message ?? "";
  const code = error.code ?? "";
  const missingRpc =
    code === "PGRST202" ||
    code === "42883" ||
    /function .* does not exist/i.test(msg) ||
    /not find the function/i.test(msg);

  if (!missingRpc) {
    console.error("[fetchTenantLogoStoragePath] rpc failed", {
      code,
      message: msg,
    });
    return null;
  }

  // Fallback: a migração `20260625120000_tenant_logo.sql` provavelmente
  // ainda não foi aplicada. Tenta o próprio profile do usuário.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_logo_storage_path")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    const pMsg = profileError.message ?? "";
    const columnMissing =
      /column .* does not exist/i.test(pMsg) || profileError.code === "42703";
    if (!columnMissing) {
      console.error("[fetchTenantLogoStoragePath] profile fallback failed", {
        code: profileError.code,
        message: pMsg,
      });
    }
    return null;
  }

  const directPath = (profile as { tenant_logo_storage_path?: string | null } | null)
    ?.tenant_logo_storage_path;
  return typeof directPath === "string" && directPath.trim().length > 0
    ? directPath.trim()
    : null;
}

export async function getTenantLogoSignedUrl(
  supabase: SupabaseClient,
  storagePath: string | null,
  expiresSec = 3600,
): Promise<string | null> {
  if (!storagePath?.trim()) return null;
  const { data, error } = await supabase.storage
    .from(TENANT_LOGOS_BUCKET)
    .createSignedUrl(storagePath, expiresSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
