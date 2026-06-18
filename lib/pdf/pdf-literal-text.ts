import { PDFParse } from "pdf-parse";

/** Extrai texto legível de um PDF (streams comprimidos incluídos). */
export async function extractPdfText(pdfBytes: Buffer): Promise<string> {
  const parser = new PDFParse({ data: pdfBytes });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

/** Procura texto no conteúdo extraído do PDF. */
export async function pdfContainsText(
  pdfBytes: Buffer,
  needle: string,
): Promise<boolean> {
  if (!needle.trim()) return false;
  const text = await extractPdfText(pdfBytes);
  return text.includes(needle);
}
