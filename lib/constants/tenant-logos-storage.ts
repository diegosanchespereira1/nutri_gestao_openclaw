/** Bucket Supabase Storage para o logotipo do tenant (empresa/titular do workspace). */
export const TENANT_LOGOS_BUCKET = "tenant-logos";

export const MAX_TENANT_LOGO_BYTES = 200 * 1024 * 1024;

export const TENANT_LOGO_ACCEPT_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
