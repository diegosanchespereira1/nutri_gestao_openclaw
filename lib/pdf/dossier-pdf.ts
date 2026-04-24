import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { formatChecklistOutcomeLabel } from "@/lib/checklists/dossier-outcome-label";
import type { ChecklistFillOutcome } from "@/lib/types/checklist-fill";
import { redactSupabaseUrlsForPdf } from "@/lib/pdf/redact-storage-urls";

/** Helvetica WinAnsi: remove diacríticos para evitar caracteres inválidos. */
export function foldTextForPdf(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapWords(text: string, maxChars: number): string[] {
  const t = foldTextForPdf(text);
  if (t.length === 0) return [""];
  const words = t.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur.length === 0 ? w : `${cur} ${w}`;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur.length > 0) lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars) : w;
    }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

export type DossierPdfSectionInput = {
  title: string;
  items: Array<{
    description: string;
    outcome: ChecklistFillOutcome | null;
    note: string | null;
    annotation: string | null;
    photoBuffers?: Buffer[];
  }>;
};

export type DossierPdfBuildInput = {
  templateName: string;
  establishmentLabel: string;
  approvedAtLabel: string;
  professionalName: string;
  crn: string;
  sections: DossierPdfSectionInput[];
};

export async function buildDossierPdfBytes(
  input: DossierPdfBuildInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  const maxChars = 92;
  let page = pdf.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  let y = height - margin;
  const lineH = 13;
  const titleSize = 14;
  const bodySize = 10;

  const ensureSpace = (linesNeeded: number) => {
    const need = linesNeeded * lineH + margin;
    if (y < need) {
      page = pdf.addPage([595.28, 841.89]);
      y = height - margin;
    }
  };

  const drawLines = (text: string, size: number, bold = false) => {
    const f = bold ? fontBold : font;
    for (const line of wrapWords(text, maxChars)) {
      ensureSpace(1);
      page.drawText(line, {
        x: margin,
        y,
        size,
        font: f,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= lineH;
    }
  };

  drawLines("Dossie de checklist (NutriGestao)", titleSize, true);
  y -= 4;
  drawLines(`Modelo: ${foldTextForPdf(input.templateName)}`, bodySize);
  drawLines(`Estabelecimento: ${foldTextForPdf(input.establishmentLabel)}`, bodySize);
  drawLines(`Aprovado em: ${foldTextForPdf(input.approvedAtLabel)}`, bodySize);
  y -= 6;
  drawLines(
    `Profissional: ${foldTextForPdf(input.professionalName)} | CRN: ${foldTextForPdf(input.crn || "—")}`,
    bodySize,
    true,
  );
  y -= 8;

  for (const sec of input.sections) {
    drawLines(`Secao: ${foldTextForPdf(sec.title)}`, 11, true);
    y -= 2;
    for (const it of sec.items) {
      drawLines(
        `- ${foldTextForPdf(redactSupabaseUrlsForPdf(it.description))}`,
        bodySize,
        true,
      );
      const outcome = formatChecklistOutcomeLabel(it.outcome);
      drawLines(`  Avaliacao: ${foldTextForPdf(outcome)}`, bodySize);
      if (it.outcome === "nc" && (it.note ?? "").trim().length > 0) {
        drawLines(
          `  Nao conformidade: ${foldTextForPdf(redactSupabaseUrlsForPdf((it.note ?? "").trim()))}`,
          bodySize,
        );
      }
      if ((it.annotation ?? "").trim().length > 0) {
        drawLines(
          `  Anotacao: ${foldTextForPdf(redactSupabaseUrlsForPdf((it.annotation ?? "").trim()))}`,
          bodySize,
        );
      }
      
      // Renderizar imagens
      if (it.photoBuffers && it.photoBuffers.length > 0) {
        drawLines(`  Fotos de evidencia (${it.photoBuffers.length}):`, bodySize);
        y -= 4;
        
        let photoX = margin;
        const photoSize = 80; // 80x80 pixels
        const photoGap = 10;
        
        for (const photoBuffer of it.photoBuffers) {
          try {
            // Garantir espaço na página
            if (y < margin + photoSize) {
              page = pdf.addPage([595.28, 841.89]);
              y = height - margin;
              photoX = margin;
            }
            
            // Embed a imagem
            const image = await pdf.embedJpg(photoBuffer);
            const imgHeight = image.height;
            const imgWidth = image.width;
            const scale = photoSize / imgHeight;
            const scaledWidth = imgWidth * scale;
            
            // Desenhar a imagem
            page.drawImage(image, {
              x: photoX,
              y: y - photoSize,
              width: scaledWidth,
              height: photoSize,
            });
            
            photoX += scaledWidth + photoGap;
            
            // Se não há mais espaço na linha, ir para próxima
            if (photoX + photoSize > 595.28 - margin) {
              y -= photoSize + photoGap;
              photoX = margin;
            }
          } catch (e) {
            console.error("Erro ao renderizar imagem:", e);
          }
        }
        
        if (photoX > margin) {
          y -= photoSize + photoGap;
        }
        y -= 4;
      }
      
      y -= 2;
    }
    y -= 4;
  }

  drawLines(
    "Documento gerado eletronicamente. As fotos de evidencia estao anexadas.",
    8,
  );

  return pdf.save();
}
