/**
 * Relatório de indicadores de saúde (avaliação adulta / geriátrica) — PDF.
 * Gerado com pdf-lib, alinhado às convenções do projeto (foldTextForPdf).
 */
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

import { foldTextForPdf } from "@/lib/pdf/dossier-pdf";

export type AdultReportKpi = {
  code: string;
  label: string;
  value: string;
};

export type AdultReportHistoryRow = {
  dateLabel: string;
  groupLabel: string;
  peLabel: string;
  aeLabel: string;
  imcLabel: string;
  neLabel: string;
  npLabel: string;
  riskLabel: string;
  current: boolean;
};

export type AdultReportInput = {
  tenantName: string;
  tenantInitials: string;
  logoBuffer: Buffer | null;
  emittedAtLabel: string;
  modeLabel: string;
  patient: {
    name: string;
    birthLabel: string;
    ageLabel: string;
    sexLabel: string;
  };
  latestKpis: AdultReportKpi[];
  history: AdultReportHistoryRow[];
  professionalName: string;
  crn: string;
  clinicalNotes: string | null;
  diagnosis: string | null;
};

const COL = {
  ink: rgb(0.12, 0.16, 0.22),
  muted: rgb(0.42, 0.45, 0.5),
  line: rgb(0.86, 0.89, 0.91),
  soft: rgb(0.94, 0.97, 0.96),
  brand: rgb(0.075, 0.42, 0.38),
  brandSoft: rgb(0.9, 0.96, 0.95),
  white: rgb(1, 1, 1),
  accent: rgb(0.15, 0.55, 0.5),
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 40;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

type ImageKind = "jpeg" | "png" | "unknown";

function detectImageKind(buffer: Buffer): ImageKind {
  if (buffer.length < 8) return "unknown";
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "png";
  return "unknown";
}

async function embedImage(
  pdf: PDFDocument,
  buffer: Buffer | null,
): Promise<PDFImage | null> {
  if (!buffer) return null;
  try {
    const kind = detectImageKind(buffer);
    if (kind === "jpeg") return await pdf.embedJpg(buffer);
    if (kind === "png") return await pdf.embedPng(buffer);
    try {
      return await pdf.embedJpg(buffer);
    } catch {
      return await pdf.embedPng(buffer);
    }
  } catch {
    return null;
  }
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = COL.ink,
) {
  page.drawText(foldTextForPdf(text), { x, y, size, font, color });
}

function wrapLines(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = foldTextForPdf(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxW) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export async function buildAdultNutritionAssessmentReportPdfBytes(
  input: AdultReportInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedImage(pdf, input.logoBuffer);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 36;

  const ensureSpace = (need: number) => {
    if (y - need < 48) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - 40;
    }
  };

  // Header band
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 78,
    width: PAGE_W,
    height: 78,
    color: COL.brandSoft,
  });

  if (logo) {
    const maxH = 36;
    const scale = maxH / logo.height;
    const w = logo.width * scale;
    page.drawImage(logo, {
      x: MARGIN_X,
      y: PAGE_H - 58,
      width: w,
      height: maxH,
    });
  } else {
    page.drawRectangle({
      x: MARGIN_X,
      y: PAGE_H - 58,
      width: 36,
      height: 36,
      color: COL.brand,
    });
    drawText(
      page,
      input.tenantInitials.slice(0, 2),
      MARGIN_X + 8,
      PAGE_H - 48,
      fontBold,
      12,
      COL.white,
    );
  }

  drawText(page, input.tenantName, MARGIN_X + 48, PAGE_H - 42, fontBold, 12, COL.brand);
  drawText(
    page,
    "Relatório de indicadores de saúde",
    MARGIN_X + 48,
    PAGE_H - 56,
    font,
    9,
    COL.muted,
  );
  drawText(
    page,
    `Emitido em ${input.emittedAtLabel}`,
    PAGE_W - MARGIN_X - 120,
    PAGE_H - 42,
    font,
    8,
    COL.muted,
  );
  drawText(
    page,
    input.modeLabel,
    PAGE_W - MARGIN_X - 120,
    PAGE_H - 54,
    font,
    8,
    COL.muted,
  );

  y = PAGE_H - 100;

  // Patient block
  drawText(page, input.patient.name, MARGIN_X, y, fontBold, 16);
  y -= 16;
  drawText(
    page,
    [
      input.patient.ageLabel,
      input.patient.sexLabel,
      `Nasc.: ${input.patient.birthLabel}`,
    ]
      .filter(Boolean)
      .join("  ·  "),
    MARGIN_X,
    y,
    font,
    9,
    COL.muted,
  );
  y -= 22;

  // KPI section
  drawText(page, "Indicadores da última avaliação", MARGIN_X, y, fontBold, 11);
  y -= 10;
  page.drawRectangle({
    x: MARGIN_X,
    y: y - 4,
    width: 180,
    height: 2,
    color: COL.accent,
  });
  y -= 18;

  const colW = CONTENT_W / 3;
  const rowH = 34;
  for (let i = 0; i < input.latestKpis.length; i += 3) {
    ensureSpace(rowH + 8);
    const chunk = input.latestKpis.slice(i, i + 3);
    for (let c = 0; c < chunk.length; c += 1) {
      const kpi = chunk[c];
      const x = MARGIN_X + c * colW;
      page.drawRectangle({
        x,
        y: y - rowH + 8,
        width: colW - 8,
        height: rowH,
        color: COL.soft,
        borderColor: COL.line,
        borderWidth: 0.6,
      });
      drawText(page, `${kpi.code} · ${kpi.label}`, x + 8, y - 4, font, 7, COL.muted);
      drawText(page, kpi.value, x + 8, y - 18, fontBold, 11, COL.ink);
    }
    y -= rowH + 10;
  }

  if (input.diagnosis) {
    ensureSpace(28);
    drawText(page, `Diagnóstico: ${input.diagnosis}`, MARGIN_X, y, font, 9);
    y -= 16;
  }

  // History table
  y -= 8;
  ensureSpace(40);
  drawText(page, "Histórico de avaliações", MARGIN_X, y, fontBold, 11);
  y -= 10;
  page.drawRectangle({
    x: MARGIN_X,
    y: y - 4,
    width: 150,
    height: 2,
    color: COL.accent,
  });
  y -= 16;

  const headers = ["Data", "Grupo", "PE", "Altura", "IMC", "NE", "NP", "Risco"];
  const widths = [62, 78, 50, 48, 42, 58, 48, 68];
  const drawHeader = () => {
    page.drawRectangle({
      x: MARGIN_X,
      y: y - 12,
      width: CONTENT_W,
      height: 18,
      color: COL.brand,
    });
    let x = MARGIN_X + 4;
    for (let i = 0; i < headers.length; i += 1) {
      drawText(page, headers[i], x, y - 7, fontBold, 7, COL.white);
      x += widths[i];
    }
    y -= 20;
  };

  drawHeader();

  for (const row of input.history) {
    ensureSpace(18);
    if (y < 70) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - 40;
      drawHeader();
    }
    if (row.current) {
      page.drawRectangle({
        x: MARGIN_X,
        y: y - 11,
        width: CONTENT_W,
        height: 15,
        color: COL.brandSoft,
      });
    }
    const cells = [
      row.dateLabel,
      row.groupLabel,
      row.peLabel,
      row.aeLabel,
      row.imcLabel,
      row.neLabel,
      row.npLabel,
      row.riskLabel,
    ];
    let x = MARGIN_X + 4;
    for (let i = 0; i < cells.length; i += 1) {
      drawText(
        page,
        cells[i],
        x,
        y - 6,
        row.current ? fontBold : font,
        7,
        COL.ink,
      );
      x += widths[i];
    }
    y -= 15;
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: MARGIN_X + CONTENT_W, y },
      thickness: 0.4,
      color: COL.line,
    });
    y -= 2;
  }

  if (input.clinicalNotes?.trim()) {
    y -= 14;
    ensureSpace(50);
    drawText(page, "Notas clínicas (última avaliação)", MARGIN_X, y, fontBold, 10);
    y -= 14;
    const lines = wrapLines(input.clinicalNotes, font, 9, CONTENT_W);
    for (const line of lines) {
      ensureSpace(14);
      drawText(page, line, MARGIN_X, y, font, 9, COL.ink);
      y -= 12;
    }
  }

  // Footer / professional
  y -= 20;
  ensureSpace(40);
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: MARGIN_X + CONTENT_W, y },
    thickness: 0.6,
    color: COL.line,
  });
  y -= 16;
  drawText(
    page,
    `Profissional: ${input.professionalName}${input.crn ? ` · CRN ${input.crn}` : ""}`,
    MARGIN_X,
    y,
    font,
    8,
    COL.muted,
  );
  y -= 12;
  drawText(
    page,
    "Documento gerado pelo NutriGestão — indicadores calculados a partir das avaliações registradas.",
    MARGIN_X,
    y,
    font,
    7,
    COL.muted,
  );

  // Page numbers
  const pages = pdf.getPages();
  pages.forEach((p, idx) => {
    drawText(
      p,
      `Página ${idx + 1} de ${pages.length}`,
      PAGE_W - MARGIN_X - 70,
      24,
      font,
      7,
      COL.muted,
    );
  });

  return pdf.save();
}
