/**
 * Relatório de Evolução de Checklists — PDF (pdf-lib)
 *
 * Segue o design system do dossiê (lib/pdf/dossier-pdf-theme.ts):
 * banda de cabeçalho configurável por tenant, faixa KPI, cards brancos com
 * barra de título navy e rodapé com paginação.
 *
 * Estrutura:
 *   1. Cabeçalho — logo, cliente, estabelecimento, emissão, média geral
 *   2. Faixa KPI — avaliações, nota média, benchmark da carteira, última nota
 *   3. Gráfico de evolução — linhas por template + linha de benchmark
 *   4. Histórico de avaliações — tabela paginada
 *   5. Rodapé — branding + paginação (todas as páginas)
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

import { foldTextForPdf, normalizeCrnForPdf } from "@/lib/pdf/dossier-pdf";
import { PdfTheme } from "@/lib/pdf/dossier-pdf-theme";

const C = PdfTheme.colors;

/* ── Dimensões ─────────────────────────────────────────────────────────── */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 36;
const MARGIN_BOTTOM = 48;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FOOTER_H = 28;

/* ── Cores das séries do gráfico (mesma paleta do gráfico da tela) ──────── */

const LINE_COLORS: RGB[] = [
  rgb(0.388, 0.4, 0.945),   // #6366F1 indigo
  rgb(0.055, 0.647, 0.914), // #0EA5E9 sky
  rgb(0.961, 0.62, 0.043),  // #F59E0B amber
  rgb(0.063, 0.725, 0.506), // #10B981 emerald
  rgb(0.937, 0.267, 0.267), // #EF4444 red
  rgb(0.545, 0.361, 0.965), // #8B5CF6 violet
  rgb(0.078, 0.722, 0.651), // #14B8A6 teal
  rgb(0.976, 0.451, 0.086), // #F97316 orange
];

const BLUE = rgb(0.145, 0.388, 0.922); // #2563EB — classificação "Bom"

/* ── Tipos públicos ─────────────────────────────────────────────────────── */

export type EvolutionReportPoint = {
  /** ISO da aprovação do dossiê. */
  approvedAt: string;
  /** Score 0-100. */
  scorePercentage: number;
  areaName: string | null;
};

export type EvolutionReportTemplateGroup = {
  templateId: string;
  templateName: string;
  points: EvolutionReportPoint[];
};

export type EvolutionReportBenchmark = {
  /** Média 0-100 de todas as avaliações aprovadas do tenant. */
  avgScore: number;
  scoredSessionsCount: number;
};

export type EvolutionReportBuildInput = {
  clientName: string;
  establishmentLabel: string;
  professionalName: string;
  crn: string;
  /** Ex.: "02/07/2026 às 14:30". */
  emittedAtLabel: string;
  byTemplate: EvolutionReportTemplateGroup[];
  /** Benchmark persistido da carteira (tenant_checklist_benchmarks). */
  benchmark?: EvolutionReportBenchmark | null;
  logoBuffer?: Buffer | null;
  /** Cores configuráveis do tenant (mesmas do dossiê). */
  headerBgColor?: string | null;
  headerTextColor?: string | null;
  accentColor?: string | null;
};

/* ── Helpers ────────────────────────────────────────────────────────────── */

function hexToRgb(hex: string | null | undefined, fallback: RGB): RGB {
  if (!hex) return fallback;
  const m = hex.trim().match(/^#?([0-9A-Fa-f]{6})$/);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255);
}

type Palette = { label: string; ink: RGB; soft: RGB; border: RGB };

function scoreClassification(pct: number): Palette {
  if (pct >= 90) return { label: "Excelente", ink: C.green, soft: C.greenLight, border: C.greenBorder };
  if (pct >= 75) return { label: "Bom",       ink: BLUE,    soft: C.skyLight,   border: C.sky };
  if (pct >= 50) return { label: "Regular",   ink: C.amber, soft: C.amberLight, border: C.amberBorder };
  return               { label: "Crítico",    ink: C.red,   soft: C.redLight,   border: C.redBorder };
}

function fmtDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

type ImageKind = "jpeg" | "png" | "unknown";

function detectImageKind(buffer: Buffer): ImageKind {
  if (buffer.length < 8) return "unknown";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "png";
  return "unknown";
}

async function embedImageSmart(pdf: PDFDocument, buffer: Buffer): Promise<PDFImage | null> {
  const kind = detectImageKind(buffer);
  try {
    if (kind === "jpeg") return await pdf.embedJpg(buffer);
    if (kind === "png") return await pdf.embedPng(buffer);
    try { return await pdf.embedJpg(buffer); } catch { return await pdf.embedPng(buffer); }
  } catch { return null; }
}

type Ctx = {
  pdf: PDFDocument;
  font: PDFFont;
  fontBold: PDFFont;
  page: PDFPage;
  /** y atual (canto superior do próximo elemento). */
  y: number;
};

function startNewPage(ctx: Ctx): void {
  const page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.pageBg });
  ctx.page = page;
  ctx.y = PAGE_H - 24;
}

function ensureVerticalSpace(ctx: Ctx, needed: number): void {
  if (ctx.y - needed < MARGIN_BOTTOM) startNewPage(ctx);
}

function drawTextLine(
  ctx: Ctx, text: string, x: number, topY: number,
  size: number, font: PDFFont, color: RGB,
): void {
  ctx.page.drawText(text, { x, y: topY - size, size, font, color });
}

function drawTextCentered(
  ctx: Ctx, text: string, centerX: number, topY: number,
  size: number, font: PDFFont, color: RGB,
): void {
  const w = font.widthOfTextAtSize(text, size);
  drawTextLine(ctx, text, centerX - w / 2, topY, size, font, color);
}

function truncateToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let out = foldTextForPdf(text);
  if (font.widthOfTextAtSize(out, size) <= maxWidth) return out;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

/* ── 1. Cabeçalho ───────────────────────────────────────────────────────── */

async function drawHeader(ctx: Ctx, input: EvolutionReportBuildInput, avgScore: number | null, totalPoints: number): Promise<void> {
  const BAND_H = 108;
  const bandBottom = PAGE_H - BAND_H;

  const headerBg = hexToRgb(input.headerBgColor, C.navy);
  const headerText = hexToRgb(input.headerTextColor, C.white);
  const accentCol = hexToRgb(input.accentColor, C.sky);

  ctx.page.drawRectangle({ x: 0, y: bandBottom, width: PAGE_W, height: BAND_H, color: headerBg });
  ctx.page.drawRectangle({ x: 0, y: bandBottom, width: PAGE_W, height: 3, color: accentCol });

  // Logo do tenant (quadrado branco com borda de acento) — igual ao dossiê
  const logoSize = 56;
  const logoX = MARGIN_X;
  const logoY = bandBottom + BAND_H / 2 - logoSize / 2;

  let logo: PDFImage | null = null;
  if (input.logoBuffer) logo = await embedImageSmart(ctx.pdf, input.logoBuffer);
  if (logo) {
    ctx.page.drawRectangle({
      x: logoX, y: logoY, width: logoSize, height: logoSize,
      color: C.white, borderColor: accentCol, borderWidth: 1,
    });
    const ratio = logo.width / logo.height;
    let w = logoSize - 8, h = logoSize - 8;
    if (ratio > 1) h = (logoSize - 8) / ratio; else w = (logoSize - 8) * ratio;
    ctx.page.drawImage(logo, {
      x: logoX + (logoSize - w) / 2, y: logoY + (logoSize - h) / 2, width: w, height: h,
    });
  }

  const textX = logo ? logoX + logoSize + 14 : MARGIN_X;
  const scoreBoxW = 110;
  const textW = PAGE_W - textX - scoreBoxW - MARGIN_X - 16;

  drawTextLine(ctx, "RELATÓRIO DE EVOLUÇÃO — CHECKLISTS", textX, PAGE_H - 18, 7.5, ctx.fontBold, accentCol);

  const title = truncateToWidth(input.clientName, ctx.fontBold, 16, textW);
  drawTextLine(ctx, title, textX, PAGE_H - 32, 16, ctx.fontBold, headerText);

  const estLabel = truncateToWidth(input.establishmentLabel, ctx.font, 9.5, textW);
  drawTextLine(ctx, estLabel, textX, PAGE_H - 53, 9.5, ctx.font, rgb(0.78, 0.82, 0.88));

  const crn = normalizeCrnForPdf(input.crn);
  const metaLine = truncateToWidth(
    `Emitido em ${input.emittedAtLabel}  |  ${input.professionalName}${crn ? ` | CRN ${crn}` : ""}`,
    ctx.font, 8, textW,
  );
  drawTextLine(ctx, metaLine, textX, PAGE_H - 67, 8, ctx.font, rgb(0.62, 0.67, 0.76));

  // Score box — média geral do cliente
  if (avgScore !== null) {
    const { ink } = scoreClassification(avgScore);
    const boxX = PAGE_W - MARGIN_X - scoreBoxW;
    const boxH = BAND_H - 20;
    const boxY = bandBottom + 10;

    ctx.page.drawRectangle({
      x: boxX, y: boxY, width: scoreBoxW, height: boxH,
      color: rgb(0.11, 0.19, 0.34), borderColor: ink, borderWidth: 1,
    });
    ctx.page.drawRectangle({ x: boxX, y: boxY + boxH - 4, width: scoreBoxW, height: 4, color: ink });

    drawTextCentered(ctx, `${avgScore}%`, boxX + scoreBoxW / 2, boxY + boxH - 14, 30, ctx.fontBold, C.white);
    drawTextCentered(ctx, "MÉDIA GERAL", boxX + scoreBoxW / 2, boxY + boxH - 48, 8, ctx.fontBold, ink);
    drawTextCentered(
      ctx,
      `${totalPoints} avaliaç${totalPoints === 1 ? "ão" : "ões"}`,
      boxX + scoreBoxW / 2, boxY + 21.5, 7.5, ctx.font, rgb(0.72, 0.76, 0.84),
    );
  }

  ctx.y = bandBottom - 14;
}

/* ── 2. Faixa KPI ───────────────────────────────────────────────────────── */

type KpiCell = {
  topColor: RGB;
  label: string;
  value: string;
  sub: string;
  subColor?: RGB;
  sub2?: string;
};

function drawKpiStrip(ctx: Ctx, cells: KpiCell[]): void {
  const stripH = 52;
  ensureVerticalSpace(ctx, stripH + 10);
  const stripTop = ctx.y;
  const cellW = CONTENT_W / cells.length;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const x = MARGIN_X + i * cellW;

    ctx.page.drawRectangle({
      x, y: stripTop - stripH, width: cellW, height: stripH,
      color: C.cardBg, borderColor: C.cardBorder, borderWidth: 0.5,
    });
    ctx.page.drawRectangle({ x, y: stripTop - 3, width: cellW, height: 3, color: cell.topColor });

    drawTextLine(ctx, cell.label, x + 10, stripTop - 12, 6.5, ctx.fontBold, C.textFaint);
    drawTextLine(ctx, cell.value, x + 10, stripTop - 22, 22, ctx.fontBold, C.textPrimary);

    if (cell.sub) {
      const vW = ctx.fontBold.widthOfTextAtSize(cell.value, 22);
      const subFont = cell.subColor ? ctx.fontBold : ctx.font;
      drawTextLine(ctx, cell.sub, x + 10 + vW + 5, stripTop - 32, 8, subFont, cell.subColor ?? C.textMuted);
      if (cell.sub2) {
        const sW = subFont.widthOfTextAtSize(cell.sub, 8);
        drawTextLine(ctx, cell.sub2, x + 10 + vW + 5 + sW + 3, stripTop - 32.5, 6.5, ctx.font, C.textMuted);
      }
    }
  }

  ctx.y = stripTop - stripH - 14;
}

/* ── 3. Gráfico de evolução ─────────────────────────────────────────────── */

function drawEvolutionChart(
  ctx: Ctx,
  input: EvolutionReportBuildInput,
): void {
  const templateLegendRows = Math.max(1, Math.ceil(input.byTemplate.length / 2));
  const cardH = 200 + templateLegendRows * 14;
  ensureVerticalSpace(ctx, cardH + 10);

  const top = ctx.y;
  ctx.page.drawRectangle({
    x: MARGIN_X, y: top - cardH, width: CONTENT_W, height: cardH,
    color: C.cardBg, borderColor: C.cardBorder, borderWidth: 0.5,
  });

  // Barra de título
  ctx.page.drawRectangle({ x: MARGIN_X, y: top - 18, width: CONTENT_W, height: 18, color: C.navy });
  drawTextLine(ctx, "EVOLUÇÃO DA PONTUAÇÃO", MARGIN_X + 10, top - 5.5, 7.5, ctx.fontBold, C.white);
  const subtitle = "Pontuação por dossiê aprovado — cada linha representa um template";
  drawTextLine(
    ctx, subtitle,
    MARGIN_X + CONTENT_W - 10 - ctx.font.widthOfTextAtSize(subtitle, 6.5),
    top - 6.5, 6.5, ctx.font, rgb(0.72, 0.76, 0.84),
  );

  // Legenda de classificação + benchmark
  let lx = MARGIN_X + 14;
  const legendTop = top - 30;
  const legendEntries: { label: string; color: RGB }[] = [
    { label: "Excelente (90-100%)", color: C.green },
    { label: "Bom (75-89%)", color: BLUE },
    { label: "Regular (50-74%)", color: C.amber },
    { label: "Crítico (0-49%)", color: C.red },
  ];
  for (const { label, color } of legendEntries) {
    ctx.page.drawCircle({ x: lx + 3, y: legendTop - 7, size: 3, color });
    drawTextLine(ctx, label, lx + 10, legendTop - 3, 7.5, ctx.font, C.textMuted);
    lx += 10 + ctx.font.widthOfTextAtSize(label, 7.5) + 16;
  }
  const bench = input.benchmark;
  if (bench) {
    const benchAvg = Math.round(bench.avgScore);
    ctx.page.drawLine({
      start: { x: lx, y: legendTop - 7 }, end: { x: lx + 14, y: legendTop - 7 },
      thickness: 1.1, color: C.navy, dashArray: [4, 2],
    });
    drawTextLine(ctx, `Benchmark (${benchAvg}%)`, lx + 18, legendTop - 3, 7.5, ctx.fontBold, C.navy);
  }

  // Área de plotagem
  const chX = MARGIN_X + 40;
  const chW = CONTENT_W - 40 - 24;
  const chTop = top - 52;
  const chH = 118;
  const chBottom = chTop - chH;
  const yFor = (pct: number) => chBottom + (Math.max(0, Math.min(100, pct)) / 100) * chH;
  // Zona reservada à direita para a flag "BENCHMARK" (evita sobreposição com pontos)
  const flagW = bench ? 58 : 0;

  // Grid horizontal
  for (let v = 0; v <= 100; v += 25) {
    const gy = yFor(v);
    ctx.page.drawLine({
      start: { x: chX, y: gy }, end: { x: chX + chW, y: gy },
      thickness: 0.5, color: C.cardBorder, dashArray: [3, 3],
    });
    drawTextLine(ctx, `${v}%`, chX - 26, gy + 4, 7.5, ctx.font, C.textFaint);
  }

  // Linhas de referência de classificação
  const refLines: { v: number; color: RGB }[] = [
    { v: 90, color: C.green },
    { v: 75, color: BLUE },
    { v: 50, color: C.amber },
  ];
  for (const { v, color } of refLines) {
    ctx.page.drawLine({
      start: { x: chX, y: yFor(v) }, end: { x: chX + chW, y: yFor(v) },
      thickness: 0.7, color, dashArray: [4, 3], opacity: 0.45,
    });
  }

  // Linha de benchmark da carteira + flag "BENCHMARK" na zona reservada
  if (bench) {
    const gy = yFor(bench.avgScore);
    ctx.page.drawLine({
      start: { x: chX, y: gy }, end: { x: chX + chW, y: gy },
      thickness: 1.1, color: C.navy, dashArray: [6, 3], opacity: 0.85,
    });
    const chipW = flagW - 2;
    const chipX = chX + chW - chipW;
    ctx.page.drawRectangle({
      x: chipX, y: gy - 6.5, width: chipW, height: 13,
      color: C.navy, borderColor: C.white, borderWidth: 0.8,
    });
    drawTextCentered(ctx, "BENCHMARK", chipX + chipW / 2, gy + 4.5, 6.5, ctx.fontBold, C.white);
  }

  // Eixo X — união de datas ordenada por instante
  const allDatesIso = [...new Set(input.byTemplate.flatMap((g) => g.points.map((p) => p.approvedAt)))]
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const xFor = (i: number) =>
    allDatesIso.length <= 1
      ? chX + (chW - flagW) / 2
      : chX + 20 + (i * (chW - 40 - flagW)) / (allDatesIso.length - 1);

  // Rótulos do eixo X (limita a ~8 para não sobrepor)
  const maxLabels = 8;
  const step = Math.max(1, Math.ceil(allDatesIso.length / maxLabels));
  allDatesIso.forEach((iso, i) => {
    if (i % step !== 0 && i !== allDatesIso.length - 1) return;
    drawTextCentered(ctx, fmtDateShort(iso), xFor(i), chBottom - 6, 7.5, ctx.font, C.textFaint);
  });

  // Séries
  input.byTemplate.forEach((g, gi) => {
    const color = LINE_COLORS[gi % LINE_COLORS.length];
    const pts = g.points
      .map((p) => ({ x: xFor(allDatesIso.indexOf(p.approvedAt)), y: yFor(p.scorePercentage), pct: Math.round(p.scorePercentage) }))
      .sort((a, b) => a.x - b.x);

    for (let i = 0; i < pts.length - 1; i++) {
      ctx.page.drawLine({
        start: { x: pts[i].x, y: pts[i].y }, end: { x: pts[i + 1].x, y: pts[i + 1].y },
        thickness: 1.8, color,
      });
    }
    // Rótulos de valor: só quando há poucos pontos, alternando acima/abaixo por série
    const drawValueLabels = allDatesIso.length <= 10;
    for (const p of pts) {
      ctx.page.drawCircle({ x: p.x, y: p.y, size: 3.6, color: C.white, borderColor: color, borderWidth: 1.8 });
      if (drawValueLabels) {
        const labelTop = gi % 2 === 0 ? p.y + 16 : p.y - 7;
        drawTextCentered(ctx, `${p.pct}%`, p.x, labelTop, 7, ctx.fontBold, color);
      }
    }
  });

  // Legenda de templates (2 colunas)
  const tlTop = chBottom - 22;
  input.byTemplate.forEach((g, gi) => {
    const color = LINE_COLORS[gi % LINE_COLORS.length];
    const col = gi % 2;
    const row = Math.floor(gi / 2);
    const x = chX + col * (chW / 2);
    const yTop = tlTop - row * 14;
    ctx.page.drawLine({ start: { x, y: yTop - 7 }, end: { x: x + 16, y: yTop - 7 }, thickness: 2, color });
    ctx.page.drawCircle({ x: x + 8, y: yTop - 7, size: 2.6, color: C.white, borderColor: color, borderWidth: 1.6 });
    const name = truncateToWidth(g.templateName, ctx.font, 8, chW / 2 - 30);
    drawTextLine(ctx, name, x + 22, yTop - 3, 8, ctx.font, C.textPrimary);
  });

  ctx.y = top - cardH - 14;
}

/* ── 4. Histórico de avaliações (tabela paginada) ───────────────────────── */

type HistoryRow = {
  dateLabel: string;
  templateName: string;
  areaName: string;
  pct: number;
};

function drawHistoryTable(ctx: Ctx, rows: HistoryRow[]): void {
  const headH = 18;
  const colHeadH = 20;
  const rowH = 22;

  const cols = [
    { label: "DATA", x: MARGIN_X + 10 },
    { label: "CHECKLIST", x: MARGIN_X + 78 },
    { label: "ÁREA", x: MARGIN_X + 294 },
    { label: "NOTA", x: MARGIN_X + 380 },
    { label: "CLASSIFICAÇÃO", x: MARGIN_X + 434 },
  ];

  let index = 0;
  while (index < rows.length) {
    ensureVerticalSpace(ctx, headH + colHeadH + rowH + 8);

    const availableH = ctx.y - MARGIN_BOTTOM;
    const fitCount = Math.max(1, Math.floor((availableH - headH - colHeadH) / rowH));
    const chunk = rows.slice(index, index + fitCount);
    const tableH = headH + colHeadH + chunk.length * rowH;
    const top = ctx.y;

    ctx.page.drawRectangle({
      x: MARGIN_X, y: top - tableH, width: CONTENT_W, height: tableH,
      color: C.cardBg, borderColor: C.cardBorder, borderWidth: 0.5,
    });
    ctx.page.drawRectangle({ x: MARGIN_X, y: top - headH, width: CONTENT_W, height: headH, color: C.navy });
    drawTextLine(
      ctx,
      index === 0 ? "HISTÓRICO DE AVALIAÇÕES" : "HISTÓRICO DE AVALIAÇÕES (CONTINUAÇÃO)",
      MARGIN_X + 10, top - 5.5, 7.5, ctx.fontBold, C.white,
    );

    let ry = top - headH;
    for (const c of cols) drawTextLine(ctx, c.label, c.x, ry - 6.5, 6.5, ctx.fontBold, C.textFaint);
    ry -= colHeadH;

    for (let i = 0; i < chunk.length; i++) {
      const r = chunk[i];
      if (i % 2 === 1) {
        ctx.page.drawRectangle({
          x: MARGIN_X + 1, y: ry - rowH, width: CONTENT_W - 2, height: rowH, color: C.rowAlt,
        });
      }
      const cls = scoreClassification(r.pct);
      drawTextLine(ctx, r.dateLabel, cols[0].x, ry - 6.5, 8.5, ctx.font, C.textPrimary);
      drawTextLine(
        ctx,
        truncateToWidth(r.templateName, ctx.font, 8.5, 206),
        cols[1].x, ry - 6.5, 8.5, ctx.font, C.textPrimary,
      );
      drawTextLine(
        ctx,
        truncateToWidth(r.areaName || "—", ctx.font, 8.5, 76),
        cols[2].x, ry - 6.5, 8.5, ctx.font, C.textMuted,
      );
      drawTextLine(ctx, `${r.pct}%`, cols[3].x, ry - 6, 9, ctx.fontBold, cls.ink);

      const badgeW = ctx.fontBold.widthOfTextAtSize(cls.label, 7) + 12;
      ctx.page.drawRectangle({
        x: cols[4].x, y: ry - rowH + 5, width: badgeW, height: 12,
        color: cls.soft, borderColor: cls.border, borderWidth: 0.5,
      });
      drawTextLine(ctx, cls.label, cols[4].x + 6, ry - 7.5, 7, ctx.fontBold, cls.ink);

      ry -= rowH;
    }

    ctx.y = top - tableH - 14;
    index += chunk.length;
  }
}

/* ── 5. Rodapé (todas as páginas) ───────────────────────────────────────── */

function drawFooters(ctx: Ctx, input: EvolutionReportBuildInput): void {
  const headerBg = hexToRgb(input.headerBgColor, C.navy);
  const total = ctx.pdf.getPageCount();

  for (let i = 0; i < total; i++) {
    const page = ctx.pdf.getPage(i);
    page.drawLine({
      start: { x: MARGIN_X, y: FOOTER_H + 6 }, end: { x: PAGE_W - MARGIN_X, y: FOOTER_H + 6 },
      thickness: 0.5, color: C.cardBorder,
    });
    page.drawRectangle({ x: 0, y: 0, width: 3, height: FOOTER_H, color: headerBg });

    page.drawText("NutriGestão · Relatório de evolução de checklists", {
      x: MARGIN_X, y: FOOTER_H - 4 - 7.5, size: 7.5, font: ctx.font, color: C.textFaint,
    });
    const pageLabel = `Página ${i + 1} de ${total}`;
    page.drawText(pageLabel, {
      x: PAGE_W - MARGIN_X - ctx.font.widthOfTextAtSize(pageLabel, 7.5),
      y: FOOTER_H - 4 - 7.5, size: 7.5, font: ctx.font, color: C.textFaint,
    });
    page.drawText(`Documento gerado eletronicamente em ${input.emittedAtLabel}`, {
      x: MARGIN_X, y: FOOTER_H - 15 - 7, size: 7, font: ctx.font, color: C.textFaint,
    });
  }
}

/* ── Builder principal ──────────────────────────────────────────────────── */

export async function buildChecklistEvolutionReportPdf(
  input: EvolutionReportBuildInput,
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
    console.warn("[evolution-report-pdf] Fonte Inter não encontrada — usando Helvetica.");
    font = await pdf.embedFont(StandardFonts.Helvetica);
    fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  }

  const firstPage = pdf.addPage([PAGE_W, PAGE_H]);
  firstPage.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.pageBg });

  const ctx: Ctx = { pdf, font, fontBold, page: firstPage, y: PAGE_H };

  // ── Agregados ─────────────────────────────────────────────────────────
  const allPoints = input.byTemplate
    .flatMap((g) => g.points)
    .sort((a, b) => new Date(a.approvedAt).getTime() - new Date(b.approvedAt).getTime());
  const totalPoints = allPoints.length;
  const avgScore =
    totalPoints > 0
      ? Math.round(allPoints.reduce((s, p) => s + p.scorePercentage, 0) / totalPoints)
      : null;
  const bestScore = totalPoints > 0 ? Math.round(Math.max(...allPoints.map((p) => p.scorePercentage))) : null;
  const lastPoint = totalPoints > 0 ? allPoints[totalPoints - 1] : null;
  const prevPoint = totalPoints > 1 ? allPoints[totalPoints - 2] : null;

  await drawHeader(ctx, input, avgScore, totalPoints);

  // ── KPIs ──────────────────────────────────────────────────────────────
  const cells: KpiCell[] = [];
  cells.push({
    topColor: hexToRgb(input.accentColor, C.sky),
    label: "AVALIAÇÕES APROVADAS",
    value: String(totalPoints),
    sub: `${input.byTemplate.length} checklist${input.byTemplate.length === 1 ? "" : "s"}`,
  });
  cells.push({
    topColor: avgScore !== null ? scoreClassification(avgScore).ink : C.navy,
    label: "NOTA MÉDIA DO CLIENTE",
    value: avgScore !== null ? `${avgScore}%` : "—",
    sub: avgScore !== null ? scoreClassification(avgScore).label : "",
  });
  if (input.benchmark && avgScore !== null) {
    const benchAvg = Math.round(input.benchmark.avgScore);
    const delta = avgScore - benchAvg;
    cells.push({
      topColor: C.navy,
      label: "BENCHMARK DA CARTEIRA",
      value: `${benchAvg}%`,
      sub: `${delta >= 0 ? "+" : ""}${delta} pts`,
      subColor: delta >= 0 ? C.green : C.red,
      sub2: delta >= 0 ? "acima" : "abaixo",
    });
  } else {
    cells.push({
      topColor: bestScore !== null ? scoreClassification(bestScore).ink : C.navy,
      label: "MELHOR NOTA",
      value: bestScore !== null ? `${bestScore}%` : "—",
      sub: "",
    });
  }
  if (lastPoint) {
    const lastPct = Math.round(lastPoint.scorePercentage);
    const trend = prevPoint ? lastPct - Math.round(prevPoint.scorePercentage) : null;
    cells.push({
      topColor: scoreClassification(lastPct).ink,
      label: "ÚLTIMA NOTA",
      value: `${lastPct}%`,
      sub: trend !== null ? `${trend >= 0 ? "+" : ""}${trend} pts` : "",
    });
  } else {
    cells.push({ topColor: C.navy, label: "ÚLTIMA NOTA", value: "—", sub: "" });
  }
  drawKpiStrip(ctx, cells);

  // ── Gráfico ───────────────────────────────────────────────────────────
  if (totalPoints > 0) drawEvolutionChart(ctx, input);

  // ── Tabela de histórico (mais recente primeiro) ───────────────────────
  const historyRows: HistoryRow[] = input.byTemplate
    .flatMap((g) =>
      g.points.map((p) => ({
        dateLabel: fmtDateShort(p.approvedAt),
        templateName: g.templateName,
        areaName: p.areaName ?? "",
        pct: Math.round(p.scorePercentage),
        sortKey: new Date(p.approvedAt).getTime(),
      })),
    )
    .sort((a, b) => b.sortKey - a.sortKey)
    .map((r) => ({
      dateLabel: r.dateLabel,
      templateName: r.templateName,
      areaName: r.areaName,
      pct: r.pct,
    }));

  if (historyRows.length > 0) drawHistoryTable(ctx, historyRows);

  drawFooters(ctx, input);

  return pdf.save();
}
