import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MAX_TECHNICAL_RECIPE_IMAGE_BYTES,
  TECHNICAL_RECIPE_IMAGES_BUCKET,
} from "@/lib/constants/technical-recipe-images-storage";
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
  await supabase.storage.from(TECHNICAL_RECIPE_IMAGES_BUCKET).remove([path]);
}

export async function resolveRecipeImagePathFromForm(args: {
  supabase: SupabaseClient;
  workspaceOwnerId: string;
  recipeId: string;
  formData: FormData;
  previousPath: string | null;
}): Promise<{ ok: true; path: string | null } | { ok: false; error: string }> {
  const { supabase, workspaceOwnerId, recipeId, formData, previousPath } = args;

  const removeRaw = String(formData.get("remove_image") ?? "").trim();
  if (removeRaw === "1" || removeRaw === "on") {
    await deleteAtPathIfAny(supabase, previousPath);
    return { ok: true, path: null };
  }

  const entry = formData.get("image");
  if (!isFile(entry) || entry.size === 0) {
    return { ok: true, path: previousPath };
  }

  if (entry.size > MAX_TECHNICAL_RECIPE_IMAGE_BYTES) {
    return {
      ok: false,
      error: `A imagem deve ter no máximo ${MAX_TECHNICAL_RECIPE_IMAGE_BYTES / 1024 / 1024} MB.`,
    };
  }

  const mime = normalizeImageMime(entry.type, entry.name);
  if (!mime) {
    return {
      ok: false,
      error: "Use PNG, JPEG (.jpg) ou WebP para a imagem da receita.",
    };
  }

  const ext = extensionForCanonicalImageMime(mime);
  const path = `${workspaceOwnerId}/${recipeId}/image_${crypto.randomUUID()}.${ext}`;
  const body = new Uint8Array(await entry.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(TECHNICAL_RECIPE_IMAGES_BUCKET)
    .upload(path, body, { contentType: mime, upsert: false });

  if (uploadError) {
    return { ok: false, error: "Não foi possível carregar a imagem da receita." };
  }

  if (previousPath && previousPath !== path) {
    await deleteAtPathIfAny(supabase, previousPath);
  }

  return { ok: true, path };
}
