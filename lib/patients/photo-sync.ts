import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MAX_PATIENT_PHOTO_BYTES,
  PATIENT_PHOTOS_BUCKET,
} from "@/lib/constants/patient-photos-storage";
import {
  extensionForCanonicalImageMime,
  normalizeImageMime,
} from "@/lib/images/image-mime";
import { getFormDataImageUpload } from "@/lib/images/form-upload";

export function mapPatientPhotoUpdateError(error: {
  code?: string;
  message?: string;
}): string | null {
  const message = error.message ?? "";
  if (
    error.code === "PGRST204" &&
    message.includes("photo_storage_path")
  ) {
    return "A base de dados ainda não suporta fotos de paciente. Aplique a migration mais recente no Supabase.";
  }
  if (message.includes("photo_storage_path")) {
    return "Não foi possível guardar a foto do paciente. Verifique se a migration de fotos foi aplicada.";
  }
  return null;
}

export async function deletePatientPhotoAtPathIfAny(
  supabase: SupabaseClient,
  path: string | null,
): Promise<void> {
  if (!path?.trim()) return;
  await supabase.storage.from(PATIENT_PHOTOS_BUCKET).remove([path]);
}

export async function resolvePatientPhotoPathFromForm(args: {
  supabase: SupabaseClient;
  workspaceOwnerId: string;
  patientId: string;
  formData: FormData;
  previousPath: string | null;
}): Promise<{ ok: true; path: string | null } | { ok: false; error: string }> {
  const { supabase, workspaceOwnerId, patientId, formData, previousPath } = args;

  const removeRaw = String(formData.get("remove_photo") ?? "").trim();
  if (removeRaw === "1" || removeRaw === "on") {
    await deletePatientPhotoAtPathIfAny(supabase, previousPath);
    return { ok: true, path: null };
  }

  const upload = getFormDataImageUpload(formData, "photo");
  if (!upload) {
    return { ok: true, path: previousPath };
  }

  const { blob, fileName } = upload;

  if (blob.size > MAX_PATIENT_PHOTO_BYTES) {
    return {
      ok: false,
      error: `A foto deve ter no máximo ${MAX_PATIENT_PHOTO_BYTES / 1024 / 1024} MB.`,
    };
  }

  const mime = normalizeImageMime(blob.type, fileName);
  if (!mime) {
    return {
      ok: false,
      error: "Use PNG, JPEG (.jpg) ou WebP para a foto.",
    };
  }

  const ext = extensionForCanonicalImageMime(mime);
  const path = `${workspaceOwnerId}/${patientId}/photo_${crypto.randomUUID()}.${ext}`;

  const body = new Uint8Array(await blob.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(PATIENT_PHOTOS_BUCKET)
    .upload(path, body, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    console.error("[resolvePatientPhotoPathFromForm] upload failed", uploadError);
    return { ok: false, error: "Não foi possível carregar a foto." };
  }

  if (previousPath && previousPath !== path) {
    await deletePatientPhotoAtPathIfAny(supabase, previousPath);
  }

  return { ok: true, path };
}
