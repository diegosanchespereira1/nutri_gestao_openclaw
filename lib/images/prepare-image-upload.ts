/**
 * Pipeline único de preparo de imagem no CLIENTE antes do upload.
 *
 * Motivação (auditoria 2026-07): celulares modernos produzem formatos e
 * tamanhos que quebravam os uploads:
 *   - iPhone (iOS 11+): HEIC/HEIF por padrão; ProRAW = DNG.
 *   - Android 12+: AVIF em apps de galeria/edição; Samsung também usa HEIC.
 *   - Fotos 12–48MP: mesmo em JPEG passam de 5–10MB e estouravam os limites.
 *
 * Estratégia: converter/decodificar QUALQUER formato que o browser consiga
 * ler (JPEG, PNG, WebP, AVIF, GIF, BMP + HEIC via heic-to), redimensionar e
 * recomprimir localmente. O servidor continua aceitando apenas o conjunto
 * canónico (JPEG/PNG/WebP) — ver lib/images/image-mime.ts.
 *
 * Importar apenas em componentes "use client".
 */

import {
  convertHeicToJpegFile,
  fileLooksLikeHeic,
} from "@/lib/images/heic-client";

export type PrepareImageResult =
  | { ok: true; file: File }
  | { ok: false; error: string };

export type PrepareImageOptions = {
  /** Lado máximo em px (largura ou altura). Padrão: 1920. */
  maxDimension?: number;
  /** Qualidade JPEG inicial (0–1). Padrão: 0.85. */
  quality?: number;
  /** Limite final em bytes; se exceder, reduz qualidade progressivamente. */
  maxBytes?: number;
  /** Preserva PNG (transparência) quando a origem é PNG — para logos. */
  preservePng?: boolean;
};

const SUPPORTED_HINT =
  "JPEG, PNG, WebP, HEIC (iPhone/Samsung), AVIF, GIF ou BMP";

/** Formatos que o usuário pode selecionar mas que browser nenhum decodifica. */
const KNOWN_UNDECODABLE_EXT = new Set([
  "dng", // Apple ProRAW / Android RAW
  "raw",
  "cr2",
  "nef",
  "arw",
  "tif",
  "tiff",
  "psd",
]);

function fileExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

type Decoded = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  cleanup: () => void;
};

async function decodeImage(blob: Blob): Promise<Decoded | null> {
  // createImageBitmap: caminho rápido, aplica orientação EXIF por padrão.
  try {
    const bmp = await createImageBitmap(blob);
    return {
      width: bmp.width,
      height: bmp.height,
      draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h),
      cleanup: () => bmp.close(),
    };
  } catch {
    // Fallback <img> (Safari antigo / formatos que createImageBitmap recusa).
  }

  return await new Promise<Decoded | null>((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
        cleanup: () => URL.revokeObjectURL(url),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Para inputs de arquivo NÃO-controlados (submetidos via FormData de um
 * <form action={...}>): prepara a imagem selecionada e grava o resultado de
 * volta no próprio input via DataTransfer, para que o submit envie o arquivo
 * já convertido/comprimido. Em erro, limpa o input e retorna a mensagem.
 */
export async function prepareImageInputInPlace(
  input: HTMLInputElement,
  options: PrepareImageOptions = {},
): Promise<{ ok: true; empty?: boolean } | { ok: false; error: string }> {
  const file = input.files?.[0];
  if (!file) return { ok: true, empty: true };

  const result = await prepareImageForUpload(file, options);
  if (!result.ok) {
    input.value = "";
    return result;
  }

  const dt = new DataTransfer();
  dt.items.add(result.file);
  input.files = dt.files;
  return { ok: true };
}

const DOCUMENT_PASSTHROUGH_EXT = new Set(["pdf", "doc", "docx"]);
const DOCUMENT_PASSTHROUGH_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/**
 * Para inputs `multiple` que misturam documentos e imagens (ex.: exames,
 * aceitando PDF/DOC + fotos): documentos passam intactos; imagens são
 * convertidas/comprimidas. Reescreve `input.files` com o resultado.
 */
export async function prepareMixedFilesInputInPlace(
  input: HTMLInputElement,
  options: PrepareImageOptions = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const files = Array.from(input.files ?? []);
  if (files.length === 0) return { ok: true };

  const dt = new DataTransfer();
  for (const f of files) {
    const ext = fileExt(f.name);
    const isDocument =
      DOCUMENT_PASSTHROUGH_MIME.has(f.type) || DOCUMENT_PASSTHROUGH_EXT.has(ext);
    if (isDocument) {
      dt.items.add(f);
      continue;
    }
    const res = await prepareImageForUpload(f, options);
    if (!res.ok) {
      input.value = "";
      return { ok: false, error: `${f.name}: ${res.error}` };
    }
    dt.items.add(res.file);
  }
  input.files = dt.files;
  return { ok: true };
}

/**
 * Prepara uma imagem para upload: HEIC→JPEG, decodifica formatos diversos,
 * redimensiona ao lado máximo e recomprime até caber em `maxBytes`.
 */
export async function prepareImageForUpload(
  original: File,
  options: PrepareImageOptions = {},
): Promise<PrepareImageResult> {
  const maxDimension = options.maxDimension ?? 1920;
  const baseQuality = options.quality ?? 0.85;

  // 1) Curto-circuito para formatos sabidamente não decodificáveis no browser.
  const ext = fileExt(original.name);
  if (KNOWN_UNDECODABLE_EXT.has(ext)) {
    return {
      ok: false,
      error: `Formato .${ext} (RAW/edição) não é suportado. Exporte como ${SUPPORTED_HINT}.`,
    };
  }

  // 2) HEIC/HEIF → JPEG (iPhone padrão; Samsung "Fotos HEIF").
  let source: File = original;
  if (await fileLooksLikeHeic(original)) {
    try {
      source = await convertHeicToJpegFile(original);
    } catch {
      return {
        ok: false,
        error:
          "Não foi possível converter a foto HEIC. No iPhone: Ajustes → Câmera → Formatos → «Mais compatível». Ou envie em JPEG/PNG.",
      };
    }
  }

  // 3) Decodifica (JPEG/PNG/WebP/AVIF/GIF/BMP…).
  const decoded = await decodeImage(source);
  if (!decoded) {
    const label = source.type || `.${ext}` || "desconhecido";
    return {
      ok: false,
      error: `Não foi possível ler a imagem (${label}). Formatos aceitos: ${SUPPORTED_HINT}.`,
    };
  }

  try {
    // 4) Redimensiona mantendo proporção.
    let { width, height } = decoded;
    if (width > maxDimension || height > maxDimension) {
      const ratio = Math.min(maxDimension / width, maxDimension / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { ok: false, error: "Não foi possível processar a imagem neste dispositivo." };
    }
    decoded.draw(ctx, width, height);

    const usePng = Boolean(options.preservePng) && source.type === "image/png";
    const outType = usePng ? "image/png" : "image/jpeg";
    const outExt = usePng ? "png" : "jpg";

    // 5) Comprime; se exceder maxBytes, reduz qualidade progressivamente.
    const qualities = usePng
      ? [undefined]
      : [baseQuality, 0.7, 0.55];
    let blob: Blob | null = null;
    for (const q of qualities) {
      blob = await canvasToBlob(canvas, outType, q);
      if (!blob) break;
      if (!options.maxBytes || blob.size <= options.maxBytes) break;
    }

    if (!blob) {
      return { ok: false, error: "Falha ao comprimir a imagem. Tente outra foto." };
    }
    if (options.maxBytes && blob.size > options.maxBytes) {
      const maxMB = (options.maxBytes / 1024 / 1024).toFixed(0);
      return {
        ok: false,
        error: `A imagem continua acima de ${maxMB}MB após compressão. Envie uma foto menor.`,
      };
    }

    const baseName =
      (original.name.replace(/\.[^.]+$/, "") || "foto").slice(0, 120);
    return {
      ok: true,
      file: new File([blob], `${baseName}.${outExt}`, {
        type: outType,
        lastModified: original.lastModified,
      }),
    };
  } finally {
    decoded.cleanup();
  }
}
