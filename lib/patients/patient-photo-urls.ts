import type { SupabaseClient } from "@supabase/supabase-js";

import { PATIENT_PHOTOS_BUCKET } from "@/lib/constants/patient-photos-storage";

const SIGNED_URL_EXPIRES_SEC = 3600;

export async function getPatientPhotoSignedUrl(
  supabase: SupabaseClient,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path?.trim()) return null;
  const { data, error } = await supabase.storage
    .from(PATIENT_PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_SEC);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function getPatientPhotoSignedUrls(
  supabase: SupabaseClient,
  paths: string[],
): Promise<Map<string, string>> {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (uniquePaths.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from(PATIENT_PHOTOS_BUCKET)
    .createSignedUrls(uniquePaths, SIGNED_URL_EXPIRES_SEC);

  if (error || !data) return new Map();

  const result = new Map<string, string>();
  for (const item of data) {
    if (item.path && item.signedUrl) result.set(item.path, item.signedUrl);
  }
  return result;
}
