import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { foldTextForPdf } from "./dossier-pdf";
import { redactSupabaseUrlsForPdf } from "@/lib/pdf/redact-storage-urls";

function wrapToWidth(text: string, maxChars: number): string[] {
  const t = foldTextForPdf(text);
  if (t.length === 0) return [""];
  const words = t.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur.length === 0 ? w : `${cur} ${w}`;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur.length > 0) lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars) : w;
    }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

export type PopPdfMeta = {
  establishmentLabel: string;
  professionalName: string;
  professionalCrn: string;
  versionNumber: number;
  versionDateLabel: string;
};

export async function buildPopPdfBytes(input: {
  popTitle: string;
  body: string;
  meta: PopPdfMeta;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  const maxChars = 88;
  let page = pdf.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  let y = height - margin;
  const lineH = 12;
  const titleSize = 14;
  const bodySize = 10;

  const ensureSpace = (linesNeeded: number) => {
    const need = linesNeeded * lineH + margin;
    if (y < need) {
      page = pdf.addPage([595.28, 841.89]);
      y = height - margin;
    }
  };

  const draw = (text: string, size: number, bold = false) => {
    const f = bold ? fontBold : font;
    for (const ln of wrapToWidth(text, maxChars)) {
      ensureSpace(1);
      page.drawText(ln, {
        x: margin,
        y: y - size,
        size,
        font: f,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= lineH;
    }
  };

  draw("POP — Procedimento operacional padronizado", titleSize, true);
  draw(foldTextForPdf(input.popTitle), bodySize + 2, true);
  draw(`Contexto: ${foldTextForPdf(input.meta.establishmentLabel)}`, bodySize);
  draw(
    `Profissional: ${foldTextForPdf(input.meta.professionalName)} — CRN: ${foldTextForPdf(input.meta.professionalCrn || "—")}`,
    bodySize,
  );
  draw(
    `Versão ${input.meta.versionNumber} — ${foldTextForPdf(input.meta.versionDateLabel)}`,
    bodySize,
  );
  y -= lineH;

  const paragraphs = input.body.split(/\n\n+/);
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length === 0) continue;
    for (const line of trimmed.split("\n")) {
      draw(redactSupabaseUrlsForPdf(line), bodySize);
    }
    y -= lineH / 2;
  }

  return pdf.save();
}
