import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MAX_PROFILE_PHOTO_BYTES,
  PROFILE_PHOTO_ACCEPT_MIME,
  PROFILE_PHOTOS_BUCKET,
} from "@/lib/constants/profile-photos-storage";

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

async function deletePhotoAtPathIfAny(
  supabase: SupabaseClient,
  path: string | null,
): Promise<void> {
  if (!path?.trim()) return;
  await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([path]);
}

export async function resolveProfilePhotoPathFromForm(args: {
  supabase: SupabaseClient;
  userId: string;
  formData: FormData;
  previousPath: string | null;
}): Promise<{ ok: true; path: string | null } | { ok: false; error: string }> {
  const { supabase, userId, formData, previousPath } = args;

  const removeRaw = String(formData.get("remove_photo") ?? "").trim();
  if (removeRaw === "1" || removeRaw === "on") {
    await deletePhotoAtPathIfAny(supabase, previousPath);
    return { ok: true, path: null };
  }

  const entry = formData.get("photo");
  if (!isFile(entry) || entry.size === 0) {
    return { ok: true, path: previousPath };
  }

  if (entry.size > MAX_PROFILE_PHOTO_BYTES) {
    return {
      ok: false,
      error: `A foto deve ter no máximo ${MAX_PROFILE_PHOTO_BYTES / 1024 / 1024} MB.`,
    };
  }

  const mime = (entry.type || "").toLowerCase();
  if (!PROFILE_PHOTO_ACCEPT_MIME.has(mime)) {
    return {
      ok: false,
      error: "Use PNG, JPEG ou WebP para a foto.",
    };
  }

  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${userId}/profile_${crypto.randomUUID()}.${ext}`;

  const body = new Uint8Array(await entry.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(path, body, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: "Não foi possível carregar a foto." };
  }

  if (previousPath && previousPath !== path) {
    await deletePhotoAtPathIfAny(supabase, previousPath);
  }

  return { ok: true, path };
}
