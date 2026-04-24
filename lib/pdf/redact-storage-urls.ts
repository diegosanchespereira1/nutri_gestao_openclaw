/**
 * Remove URLs do projeto Supabase Storage / API de texto que vai para PDFs.
 * Evita expor o host do tenant (reconhecimento) quando notas/anotações/corpo
 * contêm links assinados colados pelo utilizador.
 */
const SUPABASE_URL_IN_TEXT =
  /https?:\/\/[a-z0-9][a-z0-9-]*\.supabase\.co\/[^\s<>"')]*\/?/gi;

const GENERIC_PLACEHOLDER = "[ligação interna removida]";

export function redactSupabaseUrlsForPdf(text: string): string {
  if (!text || !text.includes("supabase")) return text;
  return text.replace(SUPABASE_URL_IN_TEXT, GENERIC_PLACEHOLDER);
}
