"use server";

import {
  loadSessionItemPhotosWithUrls as loadSessionItemPhotosWithUrlsCore,
  runDeleteChecklistFillPhoto,
  runUploadChecklistFillPhoto,
} from "@/lib/server/checklist-fill-photos-core";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistFillPhotoView } from "@/lib/types/checklist-fill-photos";

export type { ChecklistFillPhotoUploadResult } from "@/lib/server/checklist-fill-photos-core";

export async function loadSessionItemPhotosWithUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<Record<string, ChecklistFillPhotoView[]>> {
  return loadSessionItemPhotosWithUrlsCore(supabase, sessionId);
}

/** Mantido para compatibilidade; o cliente de upload usa a rota HTTP. */
export async function uploadChecklistFillPhotoAction(
  formData: FormData,
): Promise<
  | { ok: true; photo: ChecklistFillPhotoView }
  | { ok: false; error: string }
> {
  return runUploadChecklistFillPhoto(formData);
}

export async function deleteChecklistFillPhotoAction(input: {
  photoId: string;
  sessionId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return runDeleteChecklistFillPhoto(input);
}
