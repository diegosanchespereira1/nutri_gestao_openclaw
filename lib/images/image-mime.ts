/**
 * Normalização de MIME types de imagem.
 *
 * Alguns sistemas (Android, Windows, apps de mensagens) reportam MIME
 * não-padrão como "image/jpg" ou "image/pjpeg", e outros nem preenchem o
 * tipo (ficando vazio ou "application/octet-stream"). Este módulo converte
 * essas variantes para o MIME canónico, usando aliases conhecidos e, em
 * último caso, a extensão do ficheiro — para que o utilizador não seja
 * bloqueado por uma diferença de nomenclatura.
 *
 * Puro (sem dependências de browser/Node) — seguro em client e server.
 */

export type CanonicalImageMime = "image/jpeg" | "image/png" | "image/webp";

export const CANONICAL_IMAGE_MIMES: readonly CanonicalImageMime[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MIME_ALIASES: Record<string, CanonicalImageMime> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/jfif": "image/jpeg",
  "image/png": "image/png",
  "image/x-png": "image/png",
  "image/webp": "image/webp",
};

const EXT_TO_MIME: Record<string, CanonicalImageMime> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Resolve o MIME canónico de uma imagem a partir do MIME reportado e,
 * quando este está vazio/genérico, da extensão do ficheiro.
 * Devolve `null` se o formato não for suportado.
 */
export function normalizeImageMime(
  rawMime: string | null | undefined,
  filename?: string | null,
): CanonicalImageMime | null {
  const mime = (rawMime ?? "").trim().toLowerCase();
  const canonical = MIME_ALIASES[mime];
  if (canonical) return canonical;

  // Fallback pela extensão quando o SO não preenche o tipo ou usa um genérico.
  if (!mime || mime === "application/octet-stream") {
    const ext = (filename ?? "").split(".").pop()?.toLowerCase() ?? "";
    return EXT_TO_MIME[ext] ?? null;
  }

  return null;
}

/** Extensão de ficheiro adequada para um MIME canónico de imagem. */
export function extensionForCanonicalImageMime(
  mime: CanonicalImageMime,
): "jpg" | "png" | "webp" {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}
