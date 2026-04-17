/** Bucket Supabase Storage para foto de perfil profissional. */
export const PROFILE_PHOTOS_BUCKET = "profile-photos";

export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;

export const PROFILE_PHOTO_ACCEPT_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
