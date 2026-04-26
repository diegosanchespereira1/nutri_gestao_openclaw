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

/* ── Paleta inspirada na UI do pop-up (shadcn + Tailwind) ──────────────── */
const COLORS = {
  pageBg: rgb(0.973, 0.976, 0.984),
  cardBg: rgb(1, 1, 1),
  cardBorder: rgb(0.898, 0.91, 0.922),
  softBorder: rgb(0.937, 0.945, 0.953),
  textPrimary: rgb(0.106, 0.122, 0.157),
  textMuted: rgb(0.42, 0.447, 0.502),
  textFaint: rgb(0.62, 0.647, 0.702),

  brandBg: rgb(0.933, 0.953, 1),
  brandAccent: rgb(0.129, 0.337, 0.847),
  brandInk: rgb(0.051, 0.176, 0.451),

  greenSoft: rgb(0.863, 0.969, 0.886),
  greenBorder: rgb(0.706, 0.902, 0.761),
  greenInk: rgb(0.075, 0.404, 0.184),

  blueSoft: rgb(0.859, 0.918, 1),
  blueBorder: rgb(0.678, 0.812, 0.984),
  blueInk: rgb(0.063, 0.298, 0.631),

  amberSoft: rgb(0.996, 0.925, 0.78),
  amberBorder: rgb(0.988, 0.824, 0.498),
  amberInk: rgb(0.478, 0.278, 0.004),

  redSoft: rgb(0.996, 0.906, 0.906),
  redBorder: rgb(0.988, 0.729, 0.729),
  redInk: rgb(0.608, 0.09, 0.09),
  redAccent: rgb(0.863, 0.149, 0.149),

  graySoft: rgb(0.961, 0.965, 0.973),
  grayInk: rgb(0.341, 0.369, 0.439),
};

type Palette = {
  soft: RGB;
  border: RGB;
  ink: RGB;
};

function scoreClassification(pct: number): { label: string; palette: Palette } {
  if (pct >= 90)
    return {
      label: "Excelente",
      palette: { soft: COLORS.greenSoft, border: COLORS.greenBorder, ink: COLORS.greenInk },
    };
  if (pct >= 75)
    return {
      label: "Bom",
      palette: { soft: COLORS.blueSoft, border: COLORS.blueBorder, ink: COLORS.blueInk },
    };
  if (pct >= 50)
    return {
      label: "Regular",
      palette: { soft: COLORS.amberSoft, border: COLORS.amberBorder, ink: COLORS.amberInk },
    };
  return {
    label: "Critico",
    palette: { soft: COLORS.redSoft, border: COLORS.redBorder, ink: COLORS.redInk },
  };
}

function outcomePalette(outcome: ChecklistFillOutcome | null): Palette {
  if (outcome === "conforme")
    return { soft: COLORS.greenSoft, border: COLORS.greenBorder, ink: COLORS.greenInk };
  if (outcome === "nc")
    return { soft: COLORS.redSoft, border: COLORS.redBorder, ink: COLORS.redInk };
  if (outcome === "na")
    return { soft: COLORS.graySoft, border: COLORS.cardBorder, ink: COLORS.grayInk };
  return { soft: COLORS.graySoft, border: COLORS.cardBorder, ink: COLORS.textMuted };
}

/* ── Imagens: detecção de formato e embed seguro ───────────────────────── */

type ImageKind = "jpeg" | "png" | "webp" | "unknown";

function detectImageKind(buffer: Buffer): ImageKind {
  if (buffer.length < 12) return "unknown";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  )
    return "png";
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  )
    return "webp";
  return "unknown";
}

async function embedImageSmart(
  pdf: PDFDocument,
  buffer: Buffer,
): Promise<PDFImage | null> {
  const kind = detectImageKind(buffer);
  try {
    if (kind === "jpeg") return await pdf.embedJpg(buffer);
    if (kind === "png") return await pdf.embedPng(buffer);
    // pdf-lib não suporta WebP; tentamos JPG/PNG como fallback best-effort.
    try {
      return await pdf.embedJpg(buffer);
    } catch {
      return await pdf.embedPng(buffer);
    }
  } catch {
    return null;
  }
}

/* ── Quebra de texto com medição real ──────────────────────────────────── */

function wrapByWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const folded = foldTextForPdf(text);
  if (folded.length === 0) return [""];
  const words = folded.split(" ");
  const lines: string[] = [];
  let cur = "";

  const width = (s: string) => font.widthOfTextAtSize(s, size);

  for (const w of words) {
    const candidate = cur.length === 0 ? w : `${cur} ${w}`;
    if (width(candidate) <= maxWidth) {
      cur = candidate;
      continue;
    }
    if (cur.length > 0) lines.push(cur);
    // Palavra sozinha maior que a largura: quebra dura por caracter.
    if (width(w) > maxWidth) {
      let acc = "";
      for (const ch of w) {
        if (width(acc + ch) <= maxWidth) {
          acc += ch;
        } else {
          if (acc.length > 0) lines.push(acc);
          acc = ch;
        }
      }
      cur = acc;
    } else {
      cur = w;
    }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

/* ── Tipos públicos ────────────────────────────────────────────────────── */

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

/* ── Pipeline principal ────────────────────────────────────────────────── */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 40;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 44;
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
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: COLORS.pageBg,
  });
  ctx.page = page;
  ctx.y = PAGE_H - MARGIN_TOP;
  ctx.pageIndex += 1;
}

function ensureVerticalSpace(ctx: Ctx, needed: number): void {
  if (ctx.y - needed < MARGIN_BOTTOM) {
    startNewPage(ctx);
  }
}

function drawTextLine(
  ctx: Ctx,
  text: string,
  x: number,
  topY: number,
  size: number,
  font: PDFFont,
  color: RGB,
): void {
  ctx.page.drawText(text, {
    x,
    y: topY - size,
    size,
    font,
    color,
  });
}

/* ── Cabeçalho com logo e título ───────────────────────────────────────── */

async function drawHeader(
  ctx: Ctx,
  input: DossierPdfBuildInput,
): Promise<void> {
  const bandH = 96;
  const bandTop = PAGE_H - 8;
  const bandBottom = bandTop - bandH;

  ctx.page.drawRectangle({
    x: 0,
    y: bandBottom,
    width: PAGE_W,
    height: bandH + 8,
    color: COLORS.brandBg,
  });
  ctx.page.drawRectangle({
    x: 0,
    y: bandBottom - 3,
    width: PAGE_W,
    height: 3,
    color: COLORS.brandAccent,
  });

  const padding = MARGIN_X;
  const logoSize = 64;
  const logoX = padding;
  const logoY = bandBottom + (bandH - logoSize) / 2;

  let logo: PDFImage | null = null;
  if (input.logoBuffer) {
    logo = await embedImageSmart(ctx.pdf, input.logoBuffer);
  }

  if (logo) {
    const ratio = logo.width / logo.height;
    let w = logoSize;
    let h = logoSize;
    if (ratio > 1) h = logoSize / ratio;
    else w = logoSize * ratio;

    ctx.page.drawRectangle({
      x: logoX,
      y: logoY,
      width: logoSize,
      height: logoSize,
      color: COLORS.cardBg,
      borderColor: COLORS.brandAccent,
      borderWidth: 0.6,
    });
    ctx.page.drawImage(logo, {
      x: logoX + (logoSize - w) / 2,
      y: logoY + (logoSize - h) / 2,
      width: w,
      height: h,
    });
  }

  const textX = logo ? logoX + logoSize + 16 : padding;
  const textW = PAGE_W - textX - padding;

  drawTextLine(
    ctx,
    "DOSSIE DE CHECKLIST",
    textX,
    bandTop - 18,
    9,
    ctx.fontBold,
    COLORS.brandAccent,
  );

  const titleLines = wrapByWidth(
    input.templateName,
    ctx.fontBold,
    17,
    textW,
  ).slice(0, 2);
  let titleYTop = bandTop - 36;
  for (const line of titleLines) {
    drawTextLine(ctx, line, textX, titleYTop, 17, ctx.fontBold, COLORS.brandInk);
    titleYTop -= 20;
  }

  drawTextLine(
    ctx,
    foldTextForPdf(input.clientLabel || input.establishmentLabel),
    textX,
    titleYTop - 2,
    9.5,
    ctx.font,
    COLORS.textMuted,
  );

  ctx.y = bandBottom - 16;
}

/* ── Card de metadados (cliente, profissional, data) ───────────────────── */

function drawMetaCard(ctx: Ctx, input: DossierPdfBuildInput): void {
  const padding = 14;
  const labelSize = 7.5;
  const valueSize = 10.5;
  const rowGap = 6;

  const items: { label: string; value: string }[] = [
    {
      label: "ESTABELECIMENTO",
      value: foldTextForPdf(input.establishmentLabel) || "—",
    },
    {
      label: "CHECKLIST",
      value: foldTextForPdf(input.templateName) || "—",
    },
    {
      label: "PROFISSIONAL",
      value: foldTextForPdf(input.professionalName) || "—",
    },
    {
      label: "CRN",
      value: foldTextForPdf(input.crn) || "—",
    },
    {
      label: "DATA DE EXECUCAO",
      value: foldTextForPdf(input.approvedAtLabel) || "—",
    },
  ];

  if (input.areaName && input.areaName.trim().length > 0) {
    items.splice(2, 0, {
      label: "AREA AVALIADA",
      value: foldTextForPdf(input.areaName),
    });
  }

  const colGap = 12;
  const colCount = 2;
  const colW = (CONTENT_W - padding * 2 - colGap * (colCount - 1)) / colCount;

  const rowsNeeded = Math.ceil(items.length / colCount);
  let maxRowH = 0;
  const rowHeights: number[] = [];

  for (let r = 0; r < rowsNeeded; r++) {
    let rowH = 0;
    for (let c = 0; c < colCount; c++) {
      const idx = r * colCount + c;
      if (idx >= items.length) continue;
      const val = items[idx].value;
      const lines = wrapByWidth(val, ctx.fontBold, valueSize, colW);
      const h = labelSize + 3 + lines.length * (valueSize + 2);
      if (h > rowH) rowH = h;
    }
    rowHeights.push(rowH);
    maxRowH += rowH;
  }
  const totalH = padding * 2 + maxRowH + rowGap * (rowsNeeded - 1);

  ensureVerticalSpace(ctx, totalH + 10);

  const cardX = MARGIN_X;
  const cardTop = ctx.y;
  const cardBottom = cardTop - totalH;

  ctx.page.drawRectangle({
    x: cardX,
    y: cardBottom,
    width: CONTENT_W,
    height: totalH,
    color: COLORS.cardBg,
    borderColor: COLORS.cardBorder,
    borderWidth: 0.6,
  });

  let cursorTop = cardTop - padding;
  for (let r = 0; r < rowsNeeded; r++) {
    for (let c = 0; c < colCount; c++) {
      const idx = r * colCount + c;
      if (idx >= items.length) continue;
      const x = cardX + padding + c * (colW + colGap);
      drawTextLine(ctx, items[idx].label, x, cursorTop, labelSize, ctx.fontBold, COLORS.textFaint);
      const lines = wrapByWidth(items[idx].value, ctx.fontBold, valueSize, colW);
      let lineTop = cursorTop - labelSize - 3;
      for (const ln of lines) {
        drawTextLine(ctx, ln, x, lineTop, valueSize, ctx.fontBold, COLORS.textPrimary);
        lineTop -= valueSize + 2;
      }
    }
    cursorTop -= rowHeights[r] + rowGap;
  }

  ctx.y = cardBottom - 14;
}

/* ── Card de nota geral (score) ───────────────────────────────────────── */

function drawScoreCard(ctx: Ctx, input: DossierPdfBuildInput): void {
  const score = input.score;
  if (!score) return;

  const { label, palette } = scoreClassification(score.percentage);
  const cardH = 72;

  ensureVerticalSpace(ctx, cardH + 14);

  const cardTop = ctx.y;
  const cardBottom = cardTop - cardH;

  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: cardBottom,
    width: CONTENT_W,
    height: cardH,
    color: palette.soft,
    borderColor: palette.border,
    borderWidth: 0.8,
  });
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: cardBottom,
    width: 4,
    height: cardH,
    color: palette.ink,
  });

  drawTextLine(
    ctx,
    "NOTA GERAL DA AVALIACAO",
    MARGIN_X + 20,
    cardTop - 16,
    8.5,
    ctx.fontBold,
    palette.ink,
  );

  const pctText = `${score.percentage}%`;
  drawTextLine(
    ctx,
    pctText,
    MARGIN_X + 20,
    cardTop - 30,
    28,
    ctx.fontBold,
    palette.ink,
  );

  const pctWidth = ctx.fontBold.widthOfTextAtSize(pctText, 28);
  drawTextLine(
    ctx,
    label.toUpperCase(),
    MARGIN_X + 20 + pctWidth + 12,
    cardTop - 34,
    11,
    ctx.fontBold,
    palette.ink,
  );

  const pointsTxt = `${formatPoints(score.pointsEarned)} / ${formatPoints(score.pointsTotal)} pontos aplicaveis`;
  drawTextLine(
    ctx,
    pointsTxt,
    MARGIN_X + 20,
    cardTop - 62,
    9,
    ctx.font,
    palette.ink,
  );

  // Barra de progresso à direita
  const barW = 180;
  const barH = 8;
  const barX = PAGE_W - MARGIN_X - 20 - barW;
  const barY = cardBottom + (cardH - barH) / 2 - 4;
  ctx.page.drawRectangle({
    x: barX,
    y: barY,
    width: barW,
    height: barH,
    color: COLORS.cardBg,
    borderColor: palette.border,
    borderWidth: 0.6,
  });
  const fillW = Math.max(0, Math.min(100, score.percentage)) * (barW / 100);
  ctx.page.drawRectangle({
    x: barX,
    y: barY,
    width: fillW,
    height: barH,
    color: palette.ink,
  });

  ctx.y = cardBottom - 18;
}

function formatPoints(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

/* ── Seções e itens (layout de cards, fiel ao pop-up) ──────────────────── */

type SectionScore = { percentage: number | null; earned: number; total: number };

function computeSectionScore(section: DossierPdfSectionInput): SectionScore {
  // Sem pesos no input atual → todos contam 1. Isso é um fallback estético
  // para a seção; o score geral usa os pesos reais do servidor.
  let earned = 0;
  let total = 0;
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
  const headerH = 38;
  ensureVerticalSpace(ctx, headerH + 8);

  const top = ctx.y;
  const bottom = top - headerH;

  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: bottom,
    width: CONTENT_W,
    height: headerH,
    color: COLORS.cardBg,
    borderColor: COLORS.cardBorder,
    borderWidth: 0.6,
  });
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: bottom,
    width: 3.5,
    height: headerH,
    color: COLORS.brandAccent,
  });

  const tag = `SECAO ${index + 1} DE ${total}`;
  drawTextLine(ctx, tag, MARGIN_X + 14, top - 12, 7.5, ctx.fontBold, COLORS.brandAccent);

  const titleLines = wrapByWidth(
    section.title,
    ctx.fontBold,
    12,
    CONTENT_W - 28 - 140,
  ).slice(0, 1);
  drawTextLine(
    ctx,
    titleLines[0] ?? "",
    MARGIN_X + 14,
    top - 24,
    12,
    ctx.fontBold,
    COLORS.textPrimary,
  );

  // Badge de score à direita + contagem
  const sc = computeSectionScore(section);
  const rightEdge = PAGE_W - MARGIN_X - 12;

  const countText = `${section.items.length} itens`;
  const countW = ctx.font.widthOfTextAtSize(countText, 9);
  drawTextLine(
    ctx,
    countText,
    rightEdge - countW,
    top - 22,
    9,
    ctx.font,
    COLORS.textMuted,
  );

  if (sc.percentage !== null) {
    const { palette } = scoreClassification(sc.percentage);
    const badgeText = `${sc.percentage}%`;
    const badgeTextW = ctx.fontBold.widthOfTextAtSize(badgeText, 10);
    const badgeW = badgeTextW + 16;
    const badgeH = 18;
    const badgeX = rightEdge - countW - 8 - badgeW;
    const badgeY = top - 13 - badgeH;
    ctx.page.drawRectangle({
      x: badgeX,
      y: badgeY,
      width: badgeW,
      height: badgeH,
      color: palette.soft,
      borderColor: palette.border,
      borderWidth: 0.6,
    });
    drawTextLine(
      ctx,
      badgeText,
      badgeX + 8,
      badgeY + badgeH - 4,
      10,
      ctx.fontBold,
      palette.ink,
    );
  }

  ctx.y = bottom - 10;
}

async function drawItemCard(
  ctx: Ctx,
  item: DossierPdfItemInput,
): Promise<void> {
  const palette = outcomePalette(item.outcome);
  const isNc = item.outcome === "nc";
  const padding = 12;
  const cardW = CONTENT_W;
  const innerW = cardW - padding * 2;

  // Medição do conteúdo
  const descSize = 10.5;
  const labelSize = 8;
  const bodySize = 10;

  const descLines = wrapByWidth(
    redactSupabaseUrlsForPdf(item.description),
    ctx.fontBold,
    descSize,
    innerW,
  );

  const outcomeText = formatChecklistOutcomeLabel(item.outcome);

  const noteText =
    isNc && (item.note ?? "").trim().length > 0
      ? redactSupabaseUrlsForPdf((item.note ?? "").trim())
      : "";
  const hasNote = noteText.length > 0;
  const noteLines = hasNote
    ? wrapByWidth(noteText, ctx.font, bodySize, innerW - 18)
    : [];

  const annText =
    (item.annotation ?? "").trim().length > 0
      ? redactSupabaseUrlsForPdf((item.annotation ?? "").trim())
      : "";
  const hasAnn = annText.length > 0;
  const annLines = hasAnn
    ? wrapByWidth(annText, ctx.font, bodySize, innerW - 18)
    : [];

  const photoCount = item.photoBuffers?.length ?? 0;
  const photoCellSize = 96;
  const photosPerRow = Math.max(1, Math.floor(innerW / (photoCellSize + 8)));
  const photoRows = photoCount > 0 ? Math.ceil(photoCount / photosPerRow) : 0;

  let h = padding;
  h += descLines.length * (descSize + 3);
  h += 8; // gap
  h += labelSize + 4; // "Avaliação"
  h += 22; // badge outcome
  if (hasNote) {
    h += 10;
    h += 28; // label NC + padding interno do bloco
    h += noteLines.length * (bodySize + 3);
    h += 10;
  }
  if (hasAnn) {
    h += 10;
    h += 28;
    h += annLines.length * (bodySize + 3);
    h += 10;
  }
  if (photoCount > 0) {
    h += 14;
    h += labelSize + 6;
    h += photoRows * (photoCellSize + 8);
  }
  h += padding;

  ensureVerticalSpace(ctx, h + 8);

  const top = ctx.y;
  const bottom = top - h;

  // Card
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: bottom,
    width: cardW,
    height: h,
    color: isNc ? COLORS.redSoft : COLORS.cardBg,
    borderColor: isNc ? COLORS.redBorder : COLORS.cardBorder,
    borderWidth: 0.6,
  });

  // Faixa lateral esquerda colorida
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: bottom,
    width: 3.5,
    height: h,
    color: palette.ink,
  });

  let cursor = top - padding;

  // Descrição (com símbolo de alerta se NC)
  for (let i = 0; i < descLines.length; i++) {
    drawTextLine(
      ctx,
      descLines[i],
      MARGIN_X + padding,
      cursor,
      descSize,
      ctx.fontBold,
      isNc ? COLORS.redInk : COLORS.textPrimary,
    );
    cursor -= descSize + 3;
  }

  cursor -= 5;

  // Label "Avaliação"
  drawTextLine(
    ctx,
    "AVALIACAO",
    MARGIN_X + padding,
    cursor,
    labelSize,
    ctx.fontBold,
    COLORS.textFaint,
  );
  cursor -= labelSize + 4;

  // Badge do outcome
  const badgeTextW = ctx.fontBold.widthOfTextAtSize(outcomeText, 10);
  const badgeW = badgeTextW + 18;
  const badgeH = 18;
  ctx.page.drawRectangle({
    x: MARGIN_X + padding,
    y: cursor - badgeH + 2,
    width: badgeW,
    height: badgeH,
    color: palette.soft,
    borderColor: palette.border,
    borderWidth: 0.6,
  });
  drawTextLine(
    ctx,
    outcomeText,
    MARGIN_X + padding + 9,
    cursor - 2,
    10,
    ctx.fontBold,
    palette.ink,
  );
  cursor -= badgeH + 4;

  // Nota de não conformidade
  if (hasNote) {
    cursor -= 6;
    const blockTop = cursor;
    const blockH = noteLines.length * (bodySize + 3) + 26;
    const blockBottom = blockTop - blockH;
    ctx.page.drawRectangle({
      x: MARGIN_X + padding,
      y: blockBottom,
      width: innerW,
      height: blockH,
      color: COLORS.redSoft,
      borderColor: COLORS.redBorder,
      borderWidth: 0.6,
    });
    ctx.page.drawRectangle({
      x: MARGIN_X + padding,
      y: blockBottom,
      width: 3,
      height: blockH,
      color: COLORS.redAccent,
    });
    drawTextLine(
      ctx,
      "NAO CONFORMIDADE",
      MARGIN_X + padding + 10,
      blockTop - 10,
      labelSize,
      ctx.fontBold,
      COLORS.redInk,
    );
    let lineTop = blockTop - 10 - labelSize - 3;
    for (const ln of noteLines) {
      drawTextLine(ctx, ln, MARGIN_X + padding + 10, lineTop, bodySize, ctx.font, COLORS.redInk);
      lineTop -= bodySize + 3;
    }
    cursor = blockBottom - 6;
  }

  // Anotação
  if (hasAnn) {
    cursor -= 4;
    const blockTop = cursor;
    const blockH = annLines.length * (bodySize + 3) + 26;
    const blockBottom = blockTop - blockH;
    ctx.page.drawRectangle({
      x: MARGIN_X + padding,
      y: blockBottom,
      width: innerW,
      height: blockH,
      color: COLORS.graySoft,
      borderColor: COLORS.softBorder,
      borderWidth: 0.6,
    });
    drawTextLine(
      ctx,
      "ANOTACAO",
      MARGIN_X + padding + 10,
      blockTop - 10,
      labelSize,
      ctx.fontBold,
      COLORS.textFaint,
    );
    let lineTop = blockTop - 10 - labelSize - 3;
    for (const ln of annLines) {
      drawTextLine(
        ctx,
        ln,
        MARGIN_X + padding + 10,
        lineTop,
        bodySize,
        ctx.font,
        COLORS.textPrimary,
      );
      lineTop -= bodySize + 3;
    }
    cursor = blockBottom - 6;
  }

  // Fotos
  if (photoCount > 0 && item.photoBuffers) {
    cursor -= 8;
    drawTextLine(
      ctx,
      `FOTOS DE EVIDENCIA (${photoCount})`,
      MARGIN_X + padding,
      cursor,
      labelSize,
      ctx.fontBold,
      COLORS.textFaint,
    );
    cursor -= labelSize + 6;

    let col = 0;
    let rowTop = cursor;
    for (let i = 0; i < photoCount; i++) {
      const buf = item.photoBuffers[i];
      const img = await embedImageSmart(ctx.pdf, buf);
      const cellX = MARGIN_X + padding + col * (photoCellSize + 8);
      const cellY = rowTop - photoCellSize;

      // Placeholder com borda sempre visível
      ctx.page.drawRectangle({
        x: cellX,
        y: cellY,
        width: photoCellSize,
        height: photoCellSize,
        color: COLORS.graySoft,
        borderColor: COLORS.cardBorder,
        borderWidth: 0.6,
      });

      if (img) {
        const imgRatio = img.width / img.height;
        const cellRatio = 1;
        let iw: number;
        let ih: number;
        if (imgRatio > cellRatio) {
          iw = photoCellSize;
          ih = photoCellSize / imgRatio;
        } else {
          ih = photoCellSize;
          iw = photoCellSize * imgRatio;
        }
        ctx.page.drawImage(img, {
          x: cellX + (photoCellSize - iw) / 2,
          y: cellY + (photoCellSize - ih) / 2,
          width: iw,
          height: ih,
        });
      } else {
        drawTextLine(
          ctx,
          "imagem",
          cellX + photoCellSize / 2 - 14,
          cellY + photoCellSize / 2 + 4,
          8,
          ctx.font,
          COLORS.textFaint,
        );
      }

      col += 1;
      if (col >= photosPerRow) {
        col = 0;
        rowTop -= photoCellSize + 8;
      }
    }
  }

  ctx.y = bottom - 8;
}

/* ── Rodapé por página ─────────────────────────────────────────────────── */

function drawFooters(ctx: Ctx, input: DossierPdfBuildInput): void {
  const total = ctx.pdf.getPageCount();
  for (let i = 0; i < total; i++) {
    const page = ctx.pdf.getPage(i);
    const footerY = 22;
    page.drawLine({
      start: { x: MARGIN_X, y: footerY + 14 },
      end: { x: PAGE_W - MARGIN_X, y: footerY + 14 },
      thickness: 0.4,
      color: COLORS.cardBorder,
    });
    const left = foldTextForPdf(
      `${input.professionalName}${input.crn ? ` | CRN ${input.crn}` : ""}`,
    );
    page.drawText(left, {
      x: MARGIN_X,
      y: footerY,
      size: 8,
      font: ctx.font,
      color: COLORS.textMuted,
    });
    const pageText = `Pagina ${i + 1} de ${total}`;
    const pageW = ctx.font.widthOfTextAtSize(pageText, 8);
    page.drawText(pageText, {
      x: PAGE_W - MARGIN_X - pageW,
      y: footerY,
      size: 8,
      font: ctx.font,
      color: COLORS.textMuted,
    });
    const center = "Documento gerado eletronicamente - NutriGestao";
    const cw = ctx.font.widthOfTextAtSize(center, 8);
    page.drawText(center, {
      x: (PAGE_W - cw) / 2,
      y: footerY,
      size: 8,
      font: ctx.font,
      color: COLORS.textFaint,
    });
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
  firstPage.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: COLORS.pageBg,
  });

  const ctx: Ctx = {
    pdf,
    font,
    fontBold,
    page: firstPage,
    y: PAGE_H - MARGIN_TOP,
    pageIndex: 0,
  };

  await drawHeader(ctx, input);
  drawMetaCard(ctx, input);
  drawScoreCard(ctx, input);

  for (let i = 0; i < input.sections.length; i++) {
    const section = input.sections[i];
    drawSectionHeader(ctx, section, i, input.sections.length);
    for (const item of section.items) {
      await drawItemCard(ctx, item);
    }
    ctx.y -= 6;
  }

  drawFooters(ctx, input);

  return pdf.save();
}
