/**
 * PDF da visão nutricional consolidada da escola.
 * Mesmos números da tela — sem nomes de alunos.
 */

import { readFileSync } from "fs";
import path from "path";

import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
  type RGB,
} from "pdf-lib";

import { foldTextForPdf } from "@/lib/pdf/dossier-pdf";
import { PdfTheme } from "@/lib/pdf/dossier-pdf-theme";
import type { SchoolNutritionOverview } from "@/lib/nutrition/child/school-overview";

const C = PdfTheme.colors;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 36;
const MARGIN_BOTTOM = 48;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FOOTER_H = 28;

export type SchoolOverviewPdfInput = {
  clientName: string;
  professionalName: string;
  emittedAtLabel: string;
  overview: SchoolNutritionOverview;
  logoBuffer?: Buffer | null;
};

type Ctx = {
  pdf: PDFDocument;
  font: PDFFont;
  fontBold: PDFFont;
  page: PDFPage;
  y: number;
};

function colorForBand(color: "green" | "yellow" | "red" | "muted"): RGB {
  if (color === "green") return C.green;
  if (color === "yellow") return C.amber;
  if (color === "red") return C.red;
  return C.textFaint;
}

function startNewPage(ctx: Ctx): void {
  const page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.pageBg });
  ctx.page = page;
  ctx.y = PAGE_H - 24;
}

function ensureSpace(ctx: Ctx, needed: number): void {
  if (ctx.y - needed < MARGIN_BOTTOM) startNewPage(ctx);
}

function drawLine(
  ctx: Ctx,
  text: string,
  x: number,
  topY: number,
  size: number,
  font: PDFFont,
  color: RGB,
): void {
  ctx.page.drawText(text, { x, y: topY - size, size, font, color });
}

function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let out = foldTextForPdf(text);
  if (font.widthOfTextAtSize(out, size) <= maxWidth) return out;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

type ImageKind = "jpeg" | "png" | "unknown";

function detectImageKind(buffer: Buffer): ImageKind {
  if (buffer.length < 8) return "unknown";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "png";
  }
  return "unknown";
}

async function embedImageSmart(pdf: PDFDocument, buffer: Buffer): Promise<PDFImage | null> {
  const kind = detectImageKind(buffer);
  try {
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

async function drawHeader(ctx: Ctx, input: SchoolOverviewPdfInput): Promise<void> {
  const BAND_H = 92;
  const bandBottom = PAGE_H - BAND_H;
  ctx.page.drawRectangle({
    x: 0,
    y: bandBottom,
    width: PAGE_W,
    height: BAND_H,
    color: C.navy,
  });
  ctx.page.drawRectangle({
    x: 0,
    y: bandBottom,
    width: PAGE_W,
    height: 3,
    color: C.sky,
  });

  const logoSize = 52;
  const logoX = MARGIN_X;
  const logoY = bandBottom + BAND_H / 2 - logoSize / 2;
  let logo: PDFImage | null = null;
  if (input.logoBuffer) logo = await embedImageSmart(ctx.pdf, input.logoBuffer);
  if (logo) {
    ctx.page.drawRectangle({
      x: logoX,
      y: logoY,
      width: logoSize,
      height: logoSize,
      color: C.white,
      borderColor: C.sky,
      borderWidth: 1,
    });
    const ratio = logo.width / logo.height;
    let w = logoSize - 8;
    let h = logoSize - 8;
    if (ratio > 1) h = (logoSize - 8) / ratio;
    else w = (logoSize - 8) * ratio;
    ctx.page.drawImage(logo, {
      x: logoX + (logoSize - w) / 2,
      y: logoY + (logoSize - h) / 2,
      width: w,
      height: h,
    });
  }

  const textX = logo ? logoX + logoSize + 14 : MARGIN_X;
  const textW = PAGE_W - textX - MARGIN_X;
  drawLine(ctx, "VISÃO NUTRICIONAL CONSOLIDADA", textX, PAGE_H - 16, 8, ctx.fontBold, C.sky);
  drawLine(
    ctx,
    truncate(input.clientName, ctx.fontBold, 16, textW),
    textX,
    PAGE_H - 30,
    16,
    ctx.fontBold,
    C.white,
  );
  drawLine(
    ctx,
    truncate(
      `${input.overview.scopeLabel}  ·  Avaliação mais recente de cada aluno`,
      ctx.font,
      9,
      textW,
    ),
    textX,
    PAGE_H - 52,
    9,
    ctx.font,
    rgb(0.78, 0.82, 0.88),
  );
  drawLine(
    ctx,
    truncate(
      `Gerado no NutriGestão em ${input.emittedAtLabel}  ·  ${input.professionalName}`,
      ctx.font,
      8,
      textW,
    ),
    textX,
    PAGE_H - 66,
    8,
    ctx.font,
    rgb(0.62, 0.67, 0.76),
  );
  ctx.y = bandBottom - 16;
}

function drawKpis(ctx: Ctx, overview: SchoolNutritionOverview): void {
  const cov = overview.coverage;
  const cells = [
    { label: "Alunos", value: String(cov.total) },
    {
      label: cov.coveragePercent != null ? `Avaliados (${cov.coveragePercent}%)` : "Avaliados",
      value: String(cov.assessed),
    },
    { label: "Sem avaliação", value: String(cov.withoutAssessment) },
    { label: "Média de idade", value: cov.averageAgeLabel },
  ];
  const gap = 8;
  const cellW = (CONTENT_W - gap * 3) / 4;
  const cellH = 46;
  ensureSpace(ctx, cellH + 10);
  cells.forEach((cell, i) => {
    const x = MARGIN_X + i * (cellW + gap);
    const y = ctx.y - cellH;
    ctx.page.drawRectangle({
      x,
      y,
      width: cellW,
      height: cellH,
      color: C.cardBg,
      borderColor: C.cardBorder,
      borderWidth: 1,
    });
    drawLine(ctx, cell.label, x + 8, ctx.y - 6, 7, ctx.font, C.textMuted);
    drawLine(
      ctx,
      truncate(cell.value, ctx.fontBold, 13, cellW - 16),
      x + 8,
      ctx.y - 20,
      13,
      ctx.fontBold,
      C.textPrimary,
    );
  });
  ctx.y -= cellH + 14;
}

function drawIndicator(ctx: Ctx, block: SchoolNutritionOverview["indicators"][number]): void {
  const rowH = 14;
  const headerH = 28;
  const barH = 10;
  const needed = headerH + barH + 10 + block.bands.length * rowH + 16;
  ensureSpace(ctx, needed);

  const cardH = needed - 8;
  const cardY = ctx.y - cardH;
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: cardY,
    width: CONTENT_W,
    height: cardH,
    color: C.cardBg,
    borderColor: C.cardBorder,
    borderWidth: 1,
  });
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: ctx.y - 4,
    width: CONTENT_W,
    height: 4,
    color: C.navy,
  });

  drawLine(
    ctx,
    truncate(`${block.title}  ·  ${block.shortLabel}`, ctx.fontBold, 10, CONTENT_W - 16),
    MARGIN_X + 8,
    ctx.y - 8,
    10,
    ctx.fontBold,
    C.textPrimary,
  );

  const total = block.bands.reduce((sum, b) => sum + b.count, 0);
  const barY = ctx.y - 32;
  const barX = MARGIN_X + 8;
  const barW = CONTENT_W - 16;
  ctx.page.drawRectangle({
    x: barX,
    y: barY,
    width: barW,
    height: barH,
    color: C.rowAlt,
  });
  let cursor = barX;
  if (total > 0) {
    for (const band of block.bands) {
      if (band.count === 0) continue;
      const w = (band.count / total) * barW;
      ctx.page.drawRectangle({
        x: cursor,
        y: barY,
        width: Math.max(w, 0.5),
        height: barH,
        color: colorForBand(band.color),
      });
      cursor += w;
    }
  }

  let rowY = barY - 6;
  for (const band of block.bands) {
    ctx.page.drawRectangle({
      x: barX,
      y: rowY - 9,
      width: 6,
      height: 6,
      color: colorForBand(band.color),
    });
    drawLine(
      ctx,
      truncate(band.label, ctx.font, 8, CONTENT_W - 80),
      barX + 12,
      rowY,
      8,
      ctx.font,
      C.textPrimary,
    );
    const countLabel = String(band.count);
    const cw = ctx.fontBold.widthOfTextAtSize(countLabel, 8);
    drawLine(
      ctx,
      countLabel,
      MARGIN_X + CONTENT_W - 8 - cw,
      rowY,
      8,
      ctx.fontBold,
      C.textPrimary,
    );
    rowY -= rowH;
  }

  ctx.y = cardY - 10;
}

function drawGradeTable(ctx: Ctx, overview: SchoolNutritionOverview): void {
  if (overview.gradeRows.length === 0) return;
  const headerH = 22;
  const rowH = 18;
  const needed = 24 + headerH + overview.gradeRows.length * rowH + 8;
  ensureSpace(ctx, Math.min(needed, 200));

  drawLine(ctx, "Por série / turma", MARGIN_X, ctx.y, 11, ctx.fontBold, C.textPrimary);
  ctx.y -= 18;

  const cols = [
    { label: "Série / turma", w: 180 },
    { label: "Alunos", w: 70 },
    { label: "Avaliados", w: 80 },
    { label: "Sem avaliação", w: 90 },
    { label: "Média de idade", w: CONTENT_W - 180 - 70 - 80 - 90 },
  ];

  const drawHeaderRow = () => {
    ensureSpace(ctx, headerH + rowH);
    ctx.page.drawRectangle({
      x: MARGIN_X,
      y: ctx.y - headerH,
      width: CONTENT_W,
      height: headerH,
      color: C.navy,
    });
    let x = MARGIN_X + 6;
    for (const col of cols) {
      drawLine(ctx, col.label, x, ctx.y - 5, 7.5, ctx.fontBold, C.white);
      x += col.w;
    }
    ctx.y -= headerH;
  };

  drawHeaderRow();
  overview.gradeRows.forEach((row, i) => {
    if (ctx.y - rowH < MARGIN_BOTTOM) {
      startNewPage(ctx);
      drawHeaderRow();
    }
    if (i % 2 === 1) {
      ctx.page.drawRectangle({
        x: MARGIN_X,
        y: ctx.y - rowH,
        width: CONTENT_W,
        height: rowH,
        color: C.rowAlt,
      });
    }
    const values = [
      row.name,
      String(row.total),
      String(row.assessed),
      String(row.withoutAssessment),
      row.averageAgeLabel,
    ];
    let x = MARGIN_X + 6;
    values.forEach((value, idx) => {
      drawLine(
        ctx,
        truncate(value, ctx.font, 8, cols[idx].w - 8),
        x,
        ctx.y - 3,
        8,
        ctx.font,
        C.textPrimary,
      );
      x += cols[idx].w;
    });
    ctx.y -= rowH;
  });
}

function drawFooters(ctx: Ctx, input: SchoolOverviewPdfInput): void {
  const pages = ctx.pdf.getPages();
  const total = pages.length;
  pages.forEach((page, i) => {
    page.drawText(
      `Gerado no NutriGestão em ${input.emittedAtLabel}  ·  ${foldTextForPdf(input.professionalName)}`,
      {
        x: MARGIN_X,
        y: FOOTER_H - 10,
        size: 7,
        font: ctx.font,
        color: C.textFaint,
      },
    );
    const pageLabel = `${i + 1} / ${total}`;
    const w = ctx.font.widthOfTextAtSize(pageLabel, 7);
    page.drawText(pageLabel, {
      x: PAGE_W - MARGIN_X - w,
      y: FOOTER_H - 10,
      size: 7,
      font: ctx.font,
      color: C.textFaint,
    });
  });
}

export async function buildSchoolNutritionOverviewPdf(
  input: SchoolOverviewPdfInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  let font: PDFFont;
  let fontBold: PDFFont;
  try {
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    font = await pdf.embedFont(readFileSync(path.join(fontsDir, "Inter-Regular.ttf")));
    fontBold = await pdf.embedFont(readFileSync(path.join(fontsDir, "Inter-Bold.ttf")));
  } catch {
    font = await pdf.embedFont(StandardFonts.Helvetica);
    fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  }

  const first = pdf.addPage([PAGE_W, PAGE_H]);
  first.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.pageBg });
  const ctx: Ctx = { pdf, font, fontBold, page: first, y: PAGE_H };

  await drawHeader(ctx, input);
  drawKpis(ctx, input.overview);
  if (input.overview.coverage.assessed === 0 && input.overview.coverage.total > 0) {
    ensureSpace(ctx, 24);
    drawLine(
      ctx,
      "Nenhuma avaliação registada. Os totais acima já mostram quem falta.",
      MARGIN_X,
      ctx.y,
      9,
      ctx.font,
      C.textMuted,
    );
    ctx.y -= 18;
  }
  for (const block of input.overview.indicators) {
    drawIndicator(ctx, block);
  }
  drawGradeTable(ctx, input.overview);
  drawFooters(ctx, input);

  return pdf.save();
}
