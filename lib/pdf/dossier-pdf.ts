import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
  type RGB,
} from "pdf-lib";

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

/* ── Paleta V2 — Premium Navy ──────────────────────────────────────────── */
const C = {
  // Fundos de página
  pageBg:      rgb(0.945, 0.949, 0.957), // #F1F2F4

  // Navy principal (cabeçalho, badges de seção, rodapé)
  navy:        rgb(0.106, 0.165, 0.290), // #1B2A4A
  navyDeep:    rgb(0.063, 0.110, 0.212), // #102036
  navyLight:   rgb(0.208, 0.302, 0.498), // #354D7F

  // Sky (acento principal)
  sky:         rgb(0.055, 0.647, 0.914), // #0EA5E9
  skyLight:    rgb(0.816, 0.929, 0.980), // #D0EDFA

  // Branco e cinzas de card
  white:       rgb(1, 1, 1),
  cardBg:      rgb(1, 1, 1),
  cardBorder:  rgb(0.878, 0.894, 0.914), // #E0E4E9
  softBorder:  rgb(0.922, 0.933, 0.945), // #EBF0F1
  rowAlt:      rgb(0.973, 0.976, 0.984), // linha alternada suave

  // Texto
  textPrimary: rgb(0.098, 0.118, 0.157), // #191E28
  textMuted:   rgb(0.408, 0.435, 0.490), // #686F7D
  textFaint:   rgb(0.612, 0.635, 0.690), // #9CA2B0

  // Verde — Conforme
  green:       rgb(0.106, 0.475, 0.243), // #1B7A3E
  greenLight:  rgb(0.910, 0.961, 0.933), // #E8F5EE
  greenBorder: rgb(0.690, 0.886, 0.741), // #B0E2BD
  greenMid:    rgb(0.165, 0.600, 0.310), // #2A994F

  // Âmbar — Regular
  amber:       rgb(0.851, 0.467, 0.024), // #D97706
  amberLight:  rgb(0.996, 0.953, 0.780), // #FEF3C7
  amberBorder: rgb(0.988, 0.824, 0.498), // #FCD27F

  // Vermelho — NC / Crítico
  red:         rgb(0.725, 0.110, 0.110), // #B91C1C
  redLight:    rgb(0.996, 0.886, 0.886), // #FEE2E2
  redBorder:   rgb(0.988, 0.729, 0.729), // #FCBABA
  redStripe:   rgb(0.863, 0.149, 0.149), // #DC2626

  // Cinza — NA / neutro
  graySoft:    rgb(0.961, 0.965, 0.973),
  grayBorder:  rgb(0.878, 0.894, 0.914),
  grayInk:     rgb(0.341, 0.369, 0.439),
};

type Palette = { soft: RGB; border: RGB; ink: RGB };

function scoreClassification(pct: number): { label: string; palette: Palette } {
  if (pct >= 90) return { label: "Excelente", palette: { soft: C.greenLight,  border: C.greenBorder, ink: C.green  } };
  if (pct >= 75) return { label: "Bom",       palette: { soft: C.skyLight,    border: C.sky,         ink: C.navy  } };
  if (pct >= 50) return { label: "Regular",   palette: { soft: C.amberLight,  border: C.amberBorder, ink: C.amber } };
  return               { label: "Critico",    palette: { soft: C.redLight,    border: C.redBorder,   ink: C.red   } };
}

function outcomePalette(outcome: ChecklistFillOutcome | null): Palette {
  if (outcome === "conforme") return { soft: C.greenLight, border: C.greenBorder, ink: C.green };
  if (outcome === "nc")       return { soft: C.redLight,   border: C.redBorder,   ink: C.red   };
  if (outcome === "na")       return { soft: C.graySoft,   border: C.grayBorder,  ink: C.grayInk };
  return                             { soft: C.graySoft,   border: C.grayBorder,  ink: C.textMuted };
}

/* ── Detecção de formato e embed de imagem ─────────────────────────────── */

type ImageKind = "jpeg" | "png" | "webp" | "unknown";

function detectImageKind(buffer: Buffer): ImageKind {
  if (buffer.length < 12) return "unknown";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return "png";
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return "webp";
  return "unknown";
}

async function embedImageSmart(pdf: PDFDocument, buffer: Buffer): Promise<PDFImage | null> {
  const kind = detectImageKind(buffer);
  try {
    if (kind === "jpeg") return await pdf.embedJpg(buffer);
    if (kind === "png")  return await pdf.embedPng(buffer);
    try { return await pdf.embedJpg(buffer); } catch { return await pdf.embedPng(buffer); }
  } catch { return null; }
}

/* ── Quebra de texto com medição real ──────────────────────────────────── */

function wrapByWidth(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const folded = foldTextForPdf(text);
  if (folded.length === 0) return [""];
  const words = folded.split(" ");
  const lines: string[] = [];
  let cur = "";
  const width = (s: string) => font.widthOfTextAtSize(s, size);

  for (const w of words) {
    const candidate = cur.length === 0 ? w : `${cur} ${w}`;
    if (width(candidate) <= maxWidth) { cur = candidate; continue; }
    if (cur.length > 0) lines.push(cur);
    if (width(w) > maxWidth) {
      let acc = "";
      for (const ch of w) {
        if (width(acc + ch) <= maxWidth) { acc += ch; }
        else { if (acc.length > 0) lines.push(acc); acc = ch; }
      }
      cur = acc;
    } else { cur = w; }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

/* ── Tipos públicos (API imutável) ─────────────────────────────────────── */

export type DossierPdfItemInput = {
  description: string;
  outcome: ChecklistFillOutcome | null;
  note: string | null;
  annotation: string | null;
  photoBuffers?: Buffer[];
};

export type DossierPdfSectionInput = {
  title: string;
  items: DossierPdfItemInput[];
};

export type DossierPdfBuildInput = {
  templateName: string;
  establishmentLabel: string;
  clientLabel?: string;
  approvedAtLabel: string;
  professionalName: string;
  crn: string;
  sections: DossierPdfSectionInput[];
  /** Logo do tenant (foto de perfil). */
  logoBuffer?: Buffer | null;
  /** Nome da área avaliada nesta sessão. */
  areaName?: string | null;
  /**
   * Pontuação agregada já persistida (se houver). Caso ausente, o PDF calcula
   * a partir das respostas apresentadas (apenas texto final, sem pesos).
   */
  score?: {
    percentage: number;
    pointsEarned: number;
    pointsTotal: number;
  } | null;
};

/* ── Dimensões da página ───────────────────────────────────────────────── */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 36;
const MARGIN_TOP = 0;   // header começa no topo absoluto
const MARGIN_BOTTOM = 48;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

type Ctx = {
  pdf: PDFDocument;
  font: PDFFont;
  fontBold: PDFFont;
  page: PDFPage;
  /** y atual (coordenada do canto SUPERIOR do próximo elemento). */
  y: number;
  pageIndex: number;
};

function startNewPage(ctx: Ctx): void {
  const page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.pageBg });
  ctx.page = page;
  ctx.y = PAGE_H - 16;
  ctx.pageIndex += 1;
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

function formatPoints(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

/* ── Cabeçalho V2 — banda navy full-width ──────────────────────────────── */

async function drawHeader(ctx: Ctx, input: DossierPdfBuildInput): Promise<void> {
  const BAND_H = 108;
  const bandBottom = PAGE_H - BAND_H;

  // Fundo navy full-width
  ctx.page.drawRectangle({ x: 0, y: bandBottom, width: PAGE_W, height: BAND_H, color: C.navy });

  // Linha de acento sky na base da banda
  ctx.page.drawRectangle({ x: 0, y: bandBottom, width: PAGE_W, height: 3, color: C.sky });

  // ── Logo (círculo branco com logo dentro) ──
  const logoSize = 56;
  const logoX = MARGIN_X;
  const logoCenterY = bandBottom + BAND_H / 2;
  const logoY = logoCenterY - logoSize / 2;

  let logo: PDFImage | null = null;
  if (input.logoBuffer) logo = await embedImageSmart(ctx.pdf, input.logoBuffer);

  if (logo) {
    // Quadrado branco com borda sky
    ctx.page.drawRectangle({
      x: logoX, y: logoY, width: logoSize, height: logoSize,
      color: C.white, borderColor: C.sky, borderWidth: 1,
    });
    const ratio = logo.width / logo.height;
    let w = logoSize - 8, h = logoSize - 8;
    if (ratio > 1) h = (logoSize - 8) / ratio; else w = (logoSize - 8) * ratio;
    ctx.page.drawImage(logo, { x: logoX + (logoSize - w) / 2, y: logoY + (logoSize - h) / 2, width: w, height: h });
  }

  // ── Textos do cabeçalho ──
  const textX = logo ? logoX + logoSize + 14 : MARGIN_X;
  const scoreBoxW = 110;
  const textW = PAGE_W - textX - scoreBoxW - MARGIN_X - 16;

  // Eyebrow — label do documento
  drawTextLine(ctx, "DOSSIE DE AUDITORIA", textX, PAGE_H - 18, 7.5, ctx.fontBold, C.sky);

  // Título — nome do checklist
  const titleLines = wrapByWidth(input.templateName, ctx.fontBold, 16, textW).slice(0, 2);
  let titleTop = PAGE_H - 32;
  for (const line of titleLines) {
    drawTextLine(ctx, line, textX, titleTop, 16, ctx.fontBold, C.white);
    titleTop -= 19;
  }

  // Subtítulo — estabelecimento
  const estLabel = foldTextForPdf(input.clientLabel || input.establishmentLabel);
  drawTextLine(ctx, estLabel, textX, titleTop - 2, 9.5, ctx.font, rgb(0.78, 0.82, 0.88));

  // Data e profissional — linha abaixo
  const metaLine = foldTextForPdf(
    `${input.approvedAtLabel}  |  ${input.professionalName}${input.crn ? ` | CRN ${input.crn}` : ""}`,
  );
  drawTextLine(ctx, metaLine, textX, titleTop - 16, 8, ctx.font, rgb(0.62, 0.67, 0.76));

  // ── Score Box (canto direito da banda) ──
  if (input.score) {
    const { percentage, pointsEarned, pointsTotal } = input.score;
    const { label, palette } = scoreClassification(percentage);
    const boxX = PAGE_W - MARGIN_X - scoreBoxW;
    const boxH = BAND_H - 20;
    const boxY = bandBottom + (BAND_H - boxH) / 2;

    // Caixa com borda colorida
    ctx.page.drawRectangle({
      x: boxX, y: boxY, width: scoreBoxW, height: boxH,
      color: rgb(0.11, 0.19, 0.34), borderColor: palette.ink, borderWidth: 1,
    });
    // Topo colorido
    ctx.page.drawRectangle({ x: boxX, y: boxY + boxH - 4, width: scoreBoxW, height: 4, color: palette.ink });

    const pctStr = `${percentage}%`;
    const pctSize = 30;
    const pctW = ctx.fontBold.widthOfTextAtSize(pctStr, pctSize);
    const pctX = boxX + (scoreBoxW - pctW) / 2;
    drawTextLine(ctx, pctStr, pctX, boxY + boxH - 14, pctSize, ctx.fontBold, C.white);

    const labelStr = label.toUpperCase();
    const labelW = ctx.fontBold.widthOfTextAtSize(labelStr, 8);
    drawTextLine(ctx, labelStr, boxX + (scoreBoxW - labelW) / 2, boxY + boxH - 48, 8, ctx.fontBold, palette.ink);

    const ptStr = `${formatPoints(pointsEarned)}/${formatPoints(pointsTotal)} pts`;
    const ptW = ctx.font.widthOfTextAtSize(ptStr, 7.5);
    drawTextLine(ctx, ptStr, boxX + (scoreBoxW - ptW) / 2, boxY + 14, 7.5, ctx.font, rgb(0.72, 0.76, 0.84));
  }

  ctx.y = bandBottom - 14;
}

/* ── Faixa KPI (4 células abaixo do cabeçalho) ─────────────────────────── */

function drawKpiStrip(ctx: Ctx, input: DossierPdfBuildInput): void {
  // Contagem de itens a partir das seções
  let totalItems = 0, conformes = 0, ncs = 0, nas = 0;
  for (const sec of input.sections) {
    for (const it of sec.items) {
      totalItems += 1;
      if (it.outcome === "conforme") conformes += 1;
      else if (it.outcome === "nc") ncs += 1;
      else if (it.outcome === "na") nas += 1;
    }
  }
  const applied = conformes + ncs;

  const stripH = 52;
  ensureVerticalSpace(ctx, stripH + 10);

  const stripTop = ctx.y;
  const stripBottom = stripTop - stripH;
  const cellW = CONTENT_W / 4;

  const cells: { topColor: RGB; label: string; value: string; sub?: string }[] = [
    { topColor: C.sky,   label: "ITENS AVALIADOS", value: String(totalItems),   sub: `${nas} N/A` },
    { topColor: C.green, label: "CONFORMES",        value: String(conformes),   sub: applied > 0 ? `${Math.round((conformes/applied)*100)}%` : "—" },
    { topColor: C.red,   label: "NAO CONFORMES",   value: String(ncs),          sub: applied > 0 ? `${Math.round((ncs/applied)*100)}%` : "—" },
    {
      topColor: input.score ? scoreClassification(input.score.percentage).palette.ink : C.navy,
      label: "PONTUACAO",
      value: input.score ? `${input.score.percentage}%` : "—",
      sub: input.score ? `${formatPoints(input.score.pointsEarned)}/${formatPoints(input.score.pointsTotal)}` : "",
    },
  ];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const cellX = MARGIN_X + i * cellW;
    const isLast = i === cells.length - 1;

    // Fundo célula
    ctx.page.drawRectangle({
      x: cellX, y: stripBottom, width: cellW, height: stripH,
      color: C.cardBg,
      borderColor: C.cardBorder, borderWidth: 0.5,
    });

    // Barra colorida no topo
    ctx.page.drawRectangle({ x: cellX, y: stripTop - 3, width: cellW, height: 3, color: cell.topColor });

    // Label
    const lx = cellX + 10;
    drawTextLine(ctx, cell.label, lx, stripTop - 12, 6.5, ctx.fontBold, C.textFaint);

    // Valor grande
    const vSize = isLast ? 18 : 22;
    drawTextLine(ctx, cell.value, lx, stripTop - 22, vSize, ctx.fontBold, C.textPrimary);

    // Sub
    if (cell.sub) {
      const vW = ctx.fontBold.widthOfTextAtSize(cell.value, vSize);
      drawTextLine(ctx, cell.sub, lx + vW + 5, stripTop - 32, 8, ctx.font, C.textMuted);
    }
  }

  ctx.y = stripBottom - 14;
}

/* ── Card de metadados V2 ──────────────────────────────────────────────── */

function drawMetaCard(ctx: Ctx, input: DossierPdfBuildInput): void {
  const padding = 12;
  const labelSize = 7;
  const valueSize = 10;
  const rowGap = 8;

  const items: { label: string; value: string }[] = [
    { label: "ESTABELECIMENTO", value: foldTextForPdf(input.establishmentLabel) || "—" },
    { label: "CHECKLIST",       value: foldTextForPdf(input.templateName) || "—" },
    { label: "PROFISSIONAL",    value: foldTextForPdf(input.professionalName) || "—" },
    { label: "CRN",             value: foldTextForPdf(input.crn) || "—" },
    { label: "DATA DE EXECUCAO",value: foldTextForPdf(input.approvedAtLabel) || "—" },
  ];
  if (input.areaName?.trim()) {
    items.splice(2, 0, { label: "AREA AVALIADA", value: foldTextForPdf(input.areaName) });
  }

  const colGap = 10;
  const colCount = 2;
  const colW = (CONTENT_W - padding * 2 - colGap) / colCount;
  const rowsNeeded = Math.ceil(items.length / colCount);

  const rowHeights: number[] = [];
  for (let r = 0; r < rowsNeeded; r++) {
    let rowH = 0;
    for (let c = 0; c < colCount; c++) {
      const idx = r * colCount + c;
      if (idx >= items.length) continue;
      const lines = wrapByWidth(items[idx].value, ctx.fontBold, valueSize, colW);
      const h = labelSize + 3 + lines.length * (valueSize + 2);
      if (h > rowH) rowH = h;
    }
    rowHeights.push(rowH);
  }
  const totalRowH = rowHeights.reduce((a, b) => a + b, 0);
  const cardH = padding * 2 + totalRowH + rowGap * (rowsNeeded - 1) + 6; // +6 for header bar

  ensureVerticalSpace(ctx, cardH + 10);

  const cardX = MARGIN_X;
  const cardTop = ctx.y;
  const cardBottom = cardTop - cardH;

  // Corpo
  ctx.page.drawRectangle({
    x: cardX, y: cardBottom, width: CONTENT_W, height: cardH,
    color: C.cardBg, borderColor: C.cardBorder, borderWidth: 0.5,
  });
  // Barra topo navy
  ctx.page.drawRectangle({ x: cardX, y: cardTop - 6, width: CONTENT_W, height: 6, color: C.navy });
  // Label da barra
  drawTextLine(ctx, "INFORMACOES DA AUDITORIA", cardX + 10, cardTop - 1, 6.5, ctx.fontBold, rgb(0.72, 0.79, 0.92));

  let cursorTop = cardTop - 6 - padding;
  for (let r = 0; r < rowsNeeded; r++) {
    for (let c = 0; c < colCount; c++) {
      const idx = r * colCount + c;
      if (idx >= items.length) continue;
      const x = cardX + padding + c * (colW + colGap);
      drawTextLine(ctx, items[idx].label, x, cursorTop, labelSize, ctx.fontBold, C.textFaint);
      const lines = wrapByWidth(items[idx].value, ctx.fontBold, valueSize, colW);
      let lineTop = cursorTop - labelSize - 3;
      for (const ln of lines) {
        drawTextLine(ctx, ln, x, lineTop, valueSize, ctx.fontBold, C.textPrimary);
        lineTop -= valueSize + 2;
      }
    }
    cursorTop -= rowHeights[r] + rowGap;
  }

  ctx.y = cardBottom - 14;
}

/* ── Tabela de resumo por seção (resultado por categoria) ──────────────── */

function drawSectionSummaryTable(ctx: Ctx, input: DossierPdfBuildInput): void {
  const sections = input.sections;
  if (sections.length === 0) return;

  const COL_TITLE_W  = CONTENT_W * 0.42;
  const COL_ITEMS_W  = CONTENT_W * 0.10;
  const COL_OK_W     = CONTENT_W * 0.10;
  const COL_NC_W     = CONTENT_W * 0.10;
  const COL_NA_W     = CONTENT_W * 0.10;
  const COL_SCORE_W  = CONTENT_W * 0.18;

  const ROW_H     = 22;
  const HEADER_H  = 26;
  const PAD_X     = 8;
  const labelSize = 7;
  const valueSize = 9;

  // Altura total: barra topo + header de colunas + linhas + espaçamento
  const totalH = 6 + HEADER_H + sections.length * ROW_H + 10;
  ensureVerticalSpace(ctx, totalH + 14);

  const tableTop    = ctx.y;
  const tableBottom = tableTop - totalH;

  // Fundo geral
  ctx.page.drawRectangle({ x: MARGIN_X, y: tableBottom, width: CONTENT_W, height: totalH, color: C.cardBg, borderColor: C.cardBorder, borderWidth: 0.5 });
  // Barra topo navy
  ctx.page.drawRectangle({ x: MARGIN_X, y: tableTop - 6, width: CONTENT_W, height: 6, color: C.navy });
  drawTextLine(ctx, "RESULTADO POR SECAO", MARGIN_X + 10, tableTop - 1, 6.5, ctx.fontBold, rgb(0.72, 0.79, 0.92));

  // Cabeçalho das colunas
  const colsTop = tableTop - 6;
  const colsBtm = colsTop - HEADER_H;
  ctx.page.drawRectangle({ x: MARGIN_X, y: colsBtm, width: CONTENT_W, height: HEADER_H, color: C.rowAlt });

  // Títulos das colunas
  let cx = MARGIN_X + PAD_X;
  const colHeaders = [
    { w: COL_TITLE_W, label: "SECAO" },
    { w: COL_ITEMS_W, label: "ITENS" },
    { w: COL_OK_W,    label: "OK" },
    { w: COL_NC_W,    label: "NC" },
    { w: COL_NA_W,    label: "N/A" },
    { w: COL_SCORE_W, label: "RESULTADO" },
  ];
  for (const col of colHeaders) {
    drawTextLine(ctx, col.label, cx, colsTop - (HEADER_H - labelSize) / 2, labelSize, ctx.fontBold, C.textFaint);
    cx += col.w;
  }

  // Linhas de dados
  let rowTop = colsBtm;
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const sc  = computeSectionScore(sec);
    const ncs = sec.items.filter(it => it.outcome === "nc").length;
    const oks = sec.items.filter(it => it.outcome === "conforme").length;
    const nas = sec.items.filter(it => it.outcome === "na").length;

    const rowBtm = rowTop - ROW_H;
    if (i % 2 === 1) {
      ctx.page.drawRectangle({ x: MARGIN_X, y: rowBtm, width: CONTENT_W, height: ROW_H, color: C.rowAlt });
    }
    // Borda inferior
    ctx.page.drawLine({ start: { x: MARGIN_X, y: rowBtm }, end: { x: MARGIN_X + CONTENT_W, y: rowBtm }, thickness: 0.3, color: C.cardBorder });

    let rx = MARGIN_X + PAD_X;
    const midY = rowTop - ROW_H / 2 + valueSize / 2;

    // Nome da seção (truncado)
    const titleFolded = wrapByWidth(sec.title, ctx.font, valueSize, COL_TITLE_W - PAD_X * 2).slice(0, 1)[0] ?? "";
    drawTextLine(ctx, titleFolded, rx, midY, valueSize, ctx.font, C.textPrimary);
    rx += COL_TITLE_W;

    // Colunas numéricas
    const numCols = [
      { w: COL_ITEMS_W, val: String(sec.items.length), color: C.textPrimary },
      { w: COL_OK_W,    val: String(oks),              color: C.green       },
      { w: COL_NC_W,    val: String(ncs),              color: ncs > 0 ? C.red : C.textMuted },
      { w: COL_NA_W,    val: String(nas),              color: C.textMuted   },
    ];
    for (const col of numCols) {
      const vw = ctx.fontBold.widthOfTextAtSize(col.val, valueSize);
      drawTextLine(ctx, col.val, rx + (col.w - vw) / 2, midY, valueSize, ctx.fontBold, col.color);
      rx += col.w;
    }

    // Coluna de score — pill colorido
    if (sc.percentage !== null) {
      const { label, palette } = scoreClassification(sc.percentage);
      const pillText = `${sc.percentage}%  ${label.toUpperCase()}`;
      const pillTW = ctx.fontBold.widthOfTextAtSize(pillText, 7.5);
      const pillW = Math.min(pillTW + 10, COL_SCORE_W - 6);
      const pillH = 14;
      const pillX = rx + (COL_SCORE_W - pillW) / 2;
      const pillY = rowBtm + (ROW_H - pillH) / 2;
      ctx.page.drawRectangle({ x: pillX, y: pillY, width: pillW, height: pillH, color: palette.soft, borderColor: palette.border, borderWidth: 0.5 });
      const tw = ctx.fontBold.widthOfTextAtSize(pillText, 7.5);
      drawTextLine(ctx, pillText, pillX + (pillW - tw) / 2, pillY + pillH - 3, 7.5, ctx.fontBold, palette.ink);
    } else {
      drawTextLine(ctx, "-", rx + COL_SCORE_W / 2 - 2, midY, valueSize, ctx.font, C.textFaint);
    }

    rowTop = rowBtm;
  }

  ctx.y = tableBottom - 14;
}

/* ── Cabeçalho de seção V2 ─────────────────────────────────────────────── */

type SectionScore = { percentage: number | null; earned: number; total: number };

function computeSectionScore(section: DossierPdfSectionInput): SectionScore {
  let earned = 0, total = 0;
  for (const it of section.items) {
    if (!it.outcome || it.outcome === "na") continue;
    total += 1;
    if (it.outcome === "conforme") earned += 1;
  }
  if (total === 0) return { percentage: null, earned, total };
  return { percentage: Math.round((earned / total) * 100), earned, total };
}

function drawSectionHeader(
  ctx: Ctx,
  section: DossierPdfSectionInput,
  index: number,
  total: number,
): void {
  const sc = computeSectionScore(section);
  const { label: scoreLabel, palette } = sc.percentage !== null
    ? scoreClassification(sc.percentage)
    : { label: "—", palette: { soft: C.graySoft, border: C.grayBorder, ink: C.grayInk } };

  const HEADER_H = 36;
  ensureVerticalSpace(ctx, HEADER_H + 10);

  const top = ctx.y;
  const bottom = top - HEADER_H;

  // Fundo colorido conforme score
  ctx.page.drawRectangle({
    x: MARGIN_X, y: bottom, width: CONTENT_W, height: HEADER_H,
    color: palette.soft, borderColor: palette.border, borderWidth: 0.5,
  });

  // Badge número da seção (navy)
  const badgeW = 28;
  const badgeH = 20;
  const badgeX = MARGIN_X + 10;
  const badgeMidY = bottom + HEADER_H / 2;
  ctx.page.drawRectangle({
    x: badgeX, y: badgeMidY - badgeH / 2, width: badgeW, height: badgeH,
    color: C.navy,
  });
  const numStr = String(index + 1).padStart(2, "0");
  const numW = ctx.fontBold.widthOfTextAtSize(numStr, 10);
  drawTextLine(ctx, numStr, badgeX + (badgeW - numW) / 2, badgeMidY + 6, 10, ctx.fontBold, C.white);

  // Título da seção
  const titleX = badgeX + badgeW + 10;
  const ncCount = section.items.filter(i => i.outcome === "nc").length;
  const pillsW = 120;
  const titleMaxW = CONTENT_W - (titleX - MARGIN_X) - pillsW - 10;
  const titleLines = wrapByWidth(section.title, ctx.fontBold, 11, titleMaxW).slice(0, 1);
  drawTextLine(ctx, titleLines[0] ?? "", titleX, top - 12, 11, ctx.fontBold, C.textPrimary);

  // Sub-linha: "X itens"
  drawTextLine(ctx, `${section.items.length} itens`, titleX, top - 26, 8, ctx.font, C.textMuted);

  // Badges direita: score% + NC pill
  const rightEdge = PAGE_W - MARGIN_X - 10;
  let bx = rightEdge;

  // Badge NC (vermelho) — só se houver NCs
  if (ncCount > 0) {
    const ncText = `${ncCount} NC`;
    const ncTextW = ctx.fontBold.widthOfTextAtSize(ncText, 8);
    const ncBW = ncTextW + 12;
    const ncBH = 17;
    bx -= ncBW;
    const ncBY = bottom + (HEADER_H - ncBH) / 2;
    ctx.page.drawRectangle({ x: bx, y: ncBY, width: ncBW, height: ncBH, color: C.redLight, borderColor: C.redBorder, borderWidth: 0.5 });
    drawTextLine(ctx, ncText, bx + 6, ncBY + ncBH - 4, 8, ctx.fontBold, C.red);
    bx -= 6;
  }

  // Badge score (colorido)
  if (sc.percentage !== null) {
    const scText = `${sc.percentage}%  ${scoreLabel.toUpperCase()}`;
    const scTextW = ctx.fontBold.widthOfTextAtSize(scText, 8);
    const scBW = scTextW + 12;
    const scBH = 17;
    bx -= scBW;
    const scBY = bottom + (HEADER_H - scBH) / 2;
    ctx.page.drawRectangle({ x: bx, y: scBY, width: scBW, height: scBH, color: palette.soft, borderColor: palette.border, borderWidth: 0.5 });
    drawTextLine(ctx, scText, bx + 6, scBY + scBH - 4, 8, ctx.fontBold, palette.ink);
  }

  ctx.y = bottom - 2;
}

/* ── Linha de item V2 (compacto) ──────────────────────────────────────── */

async function drawItemRow(
  ctx: Ctx,
  item: DossierPdfItemInput,
  rowIndex: number,
): Promise<void> {
  const palette = outcomePalette(item.outcome);
  const isNc = item.outcome === "nc";
  const STRIPE_W = 4;
  const PAD_H = 8;
  const TEXT_SIZE = 9.5;
  const PILL_RESERVE = 80; // espaço reservado à direita para o pill de status
  const innerW = CONTENT_W - STRIPE_W - 12 - PILL_RESERVE - 10;

  const descLines = wrapByWidth(
    redactSupabaseUrlsForPdf(item.description),
    isNc ? ctx.fontBold : ctx.font,
    TEXT_SIZE,
    innerW,
  );
  const rowH = Math.max(22, PAD_H * 2 + descLines.length * (TEXT_SIZE + 2.5));

  ensureVerticalSpace(ctx, rowH + 2);

  const top = ctx.y;
  const bottom = top - rowH;

  // Fundo alternado suave
  const rowBg = isNc ? C.redLight : (rowIndex % 2 === 0 ? C.cardBg : C.rowAlt);
  ctx.page.drawRectangle({ x: MARGIN_X, y: bottom, width: CONTENT_W, height: rowH, color: rowBg });

  // Borda inferior fina
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: bottom },
    end: { x: MARGIN_X + CONTENT_W, y: bottom },
    thickness: 0.4,
    color: isNc ? C.redBorder : C.cardBorder,
  });

  // Faixa esquerda colorida
  ctx.page.drawRectangle({ x: MARGIN_X, y: bottom, width: STRIPE_W, height: rowH, color: palette.ink });

  // Descrição
  const textX = MARGIN_X + STRIPE_W + 10;
  let lineTop = top - PAD_H;
  for (const ln of descLines) {
    drawTextLine(ctx, ln, textX, lineTop, TEXT_SIZE, isNc ? ctx.fontBold : ctx.font, isNc ? C.red : C.textPrimary);
    lineTop -= TEXT_SIZE + 2.5;
  }

  // Pill de status (direita) — fold para evitar encoding error com Helvetica WinAnsi
  const outcomeText = foldTextForPdf(formatChecklistOutcomeLabel(item.outcome));
  const pillTextW = ctx.fontBold.widthOfTextAtSize(outcomeText, 8);
  const pillW = pillTextW + 14;
  const pillX = MARGIN_X + CONTENT_W - pillW - 6;
  const pillH = 16;
  const pillY = bottom + (rowH - pillH) / 2;
  ctx.page.drawRectangle({ x: pillX, y: pillY, width: pillW, height: pillH, color: palette.soft, borderColor: palette.border, borderWidth: 0.5 });
  drawTextLine(ctx, outcomeText, pillX + 7, pillY + pillH - 4, 8, ctx.fontBold, palette.ink);

  ctx.y = bottom;

  // ── Bloco de detalhes NC (nota + anotação + fotos) ──────────────────── //
  if (isNc) {
    await drawNcDetails(ctx, item);
  }

  ctx.y -= 1; // pequeno respiro entre itens
}

/* ── Bloco de detalhes de não conformidade ─────────────────────────────── */

async function drawNcDetails(ctx: Ctx, item: DossierPdfItemInput): Promise<void> {
  const noteText = (item.note ?? "").trim().length > 0
    ? redactSupabaseUrlsForPdf(item.note!.trim())
    : "";
  const annText = (item.annotation ?? "").trim().length > 0
    ? redactSupabaseUrlsForPdf(item.annotation!.trim())
    : "";
  const photoCount = item.photoBuffers?.length ?? 0;

  if (!noteText && !annText && photoCount === 0) return;

  const INDENT = 12;
  const BLOCK_W = CONTENT_W - INDENT;
  const BLOCK_X = MARGIN_X + INDENT;
  const labelSize = 7;
  const bodySize = 9;
  const padV = 8;
  const padH = 10;

  // ── Nota de NC ──
  if (noteText) {
    const noteLines = wrapByWidth(noteText, ctx.font, bodySize, BLOCK_W - padH * 2);
    const bH = padV * 2 + labelSize + 4 + noteLines.length * (bodySize + 2.5);
    ensureVerticalSpace(ctx, bH + 4);

    const top = ctx.y;
    const btm = top - bH;

    ctx.page.drawRectangle({ x: BLOCK_X, y: btm, width: BLOCK_W, height: bH, color: C.redLight, borderColor: C.redBorder, borderWidth: 0.5 });
    ctx.page.drawRectangle({ x: BLOCK_X, y: btm, width: 3, height: bH, color: C.redStripe });

    drawTextLine(ctx, "NAO CONFORMIDADE", BLOCK_X + padH, top - padV, labelSize, ctx.fontBold, C.red);
    let lTop = top - padV - labelSize - 4;
    for (const ln of noteLines) {
      drawTextLine(ctx, ln, BLOCK_X + padH, lTop, bodySize, ctx.font, C.textPrimary);
      lTop -= bodySize + 2.5;
    }
    ctx.y = btm;
  }

  // ── Anotação ──
  if (annText) {
    const annLines = wrapByWidth(annText, ctx.font, bodySize, BLOCK_W - padH * 2);
    const bH = padV * 2 + labelSize + 4 + annLines.length * (bodySize + 2.5);
    ensureVerticalSpace(ctx, bH + 4);

    const top = ctx.y;
    const btm = top - bH;

    ctx.page.drawRectangle({ x: BLOCK_X, y: btm, width: BLOCK_W, height: bH, color: C.graySoft, borderColor: C.grayBorder, borderWidth: 0.5 });
    ctx.page.drawRectangle({ x: BLOCK_X, y: btm, width: 3, height: bH, color: C.textMuted });

    drawTextLine(ctx, "ANOTACAO", BLOCK_X + padH, top - padV, labelSize, ctx.fontBold, C.textMuted);
    let lTop = top - padV - labelSize - 4;
    for (const ln of annLines) {
      drawTextLine(ctx, ln, BLOCK_X + padH, lTop, bodySize, ctx.font, C.textPrimary);
      lTop -= bodySize + 2.5;
    }
    ctx.y = btm;
  }

  // ── Fotos full-width ──
  if (photoCount > 0 && item.photoBuffers) {
    const PHOTO_H = 140;
    const CAPTION_H = 18;
    const PHOTO_GAP = 6;

    // Label de fotos
    const lblH = 16;
    ensureVerticalSpace(ctx, lblH + 4);
    const lblTop = ctx.y;
    ctx.page.drawRectangle({ x: BLOCK_X, y: lblTop - lblH, width: BLOCK_W, height: lblH, color: C.navy });
    drawTextLine(ctx, `FOTOS DE EVIDENCIA  (${photoCount})`, BLOCK_X + padH, lblTop - 4, labelSize, ctx.fontBold, C.sky);
    ctx.y = lblTop - lblH;

    for (let i = 0; i < photoCount; i++) {
      const buf = item.photoBuffers[i];
      const blockH = PHOTO_H + CAPTION_H;
      ensureVerticalSpace(ctx, blockH + PHOTO_GAP);

      const pTop = ctx.y;
      const pBtm = pTop - blockH;

      // Fundo foto
      ctx.page.drawRectangle({ x: BLOCK_X, y: pTop - PHOTO_H, width: BLOCK_W, height: PHOTO_H, color: C.graySoft, borderColor: C.cardBorder, borderWidth: 0.5 });

      const img = await embedImageSmart(ctx.pdf, buf);
      if (img) {
        const imgRatio = img.width / img.height;
        const maxW = BLOCK_W - 4;
        const maxH = PHOTO_H - 4;
        let iw = maxW, ih = maxW / imgRatio;
        if (ih > maxH) { ih = maxH; iw = maxH * imgRatio; }
        ctx.page.drawImage(img, {
          x: BLOCK_X + (BLOCK_W - iw) / 2,
          y: pTop - PHOTO_H + (PHOTO_H - ih) / 2,
          width: iw, height: ih,
        });
      } else {
        drawTextLine(ctx, "imagem indisponivel", BLOCK_X + BLOCK_W / 2 - 40, pTop - PHOTO_H / 2 + 4, 8, ctx.font, C.textFaint);
      }

      // Caption navy com número
      ctx.page.drawRectangle({ x: BLOCK_X, y: pBtm, width: BLOCK_W, height: CAPTION_H, color: C.navyDeep });
      drawTextLine(ctx, `Foto ${i + 1} de ${photoCount}`, BLOCK_X + padH, pBtm + CAPTION_H - 5, 8, ctx.font, rgb(0.72, 0.79, 0.90));

      ctx.y = pBtm - PHOTO_GAP;
    }
  }

  ctx.y -= 4; // respiro após bloco NC
}

/* ── Rodapé por página V2 ──────────────────────────────────────────────── */

function drawFooters(ctx: Ctx, input: DossierPdfBuildInput): void {
  const total = ctx.pdf.getPageCount();
  for (let i = 0; i < total; i++) {
    const page = ctx.pdf.getPage(i);
    const footerH = 28;
    const footerY = 0;

    // Fundo footer navy suave
    page.drawRectangle({ x: 0, y: footerY, width: PAGE_W, height: footerH, color: rgb(0.945, 0.949, 0.957) });
    page.drawLine({
      start: { x: 0, y: footerY + footerH },
      end: { x: PAGE_W, y: footerY + footerH },
      thickness: 0.5, color: C.cardBorder,
    });

    const left = foldTextForPdf(
      `${input.professionalName}${input.crn ? `  |  CRN ${input.crn}` : ""}`,
    );
    page.drawText(left, { x: MARGIN_X, y: footerY + 9, size: 7.5, font: ctx.font, color: C.textMuted });

    const center = "Documento gerado eletronicamente - NutriGestao";
    const cw = ctx.font.widthOfTextAtSize(center, 7.5);
    page.drawText(center, { x: (PAGE_W - cw) / 2, y: footerY + 9, size: 7.5, font: ctx.font, color: C.textFaint });

    const pageText = `Pagina ${i + 1} de ${total}`;
    const pw = ctx.font.widthOfTextAtSize(pageText, 7.5);
    page.drawText(pageText, { x: PAGE_W - MARGIN_X - pw, y: footerY + 9, size: 7.5, font: ctx.font, color: C.textMuted });
  }
}

/* ── Entry point ───────────────────────────────────────────────────────── */

export async function buildDossierPdfBytes(
  input: DossierPdfBuildInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const firstPage = pdf.addPage([PAGE_W, PAGE_H]);
  firstPage.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.pageBg });

  const ctx: Ctx = {
    pdf, font, fontBold,
    page: firstPage,
    y: PAGE_H - MARGIN_TOP,
    pageIndex: 0,
  };

  await drawHeader(ctx, input);
  drawKpiStrip(ctx, input);
  drawMetaCard(ctx, input);
  drawSectionSummaryTable(ctx, input);

  for (let i = 0; i < input.sections.length; i++) {
    const section = input.sections[i];
    ctx.y -= 4;
    drawSectionHeader(ctx, section, i, input.sections.length);
    for (let j = 0; j < section.items.length; j++) {
      await drawItemRow(ctx, section.items[j], j);
    }
    ctx.y -= 10;
  }

  drawFooters(ctx, input);

  return pdf.save();
}
