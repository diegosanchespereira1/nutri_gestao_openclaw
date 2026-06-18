import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

import type { RecipeLineUnit } from "@/lib/constants/recipe-line-units";
import { lineRawMaterialCostBrl } from "@/lib/technical-recipes/recipe-material-cost";
import {
  computeRecipeNutritionTotals,
  divideRecipeNutritionByPortions,
} from "@/lib/technical-recipes/recipe-nutrition";
import { computeRecipePricingBreakdown } from "@/lib/technical-recipes/recipe-pricing";
import type { TechnicalRecipeWithLines } from "@/lib/types/technical-recipes";

import { foldTextForPdf } from "./dossier-pdf";
import { getDefaultTechnicalRecipeImageBuffer } from "./default-technical-recipe-image";
import { redactSupabaseUrlsForPdf } from "@/lib/pdf/redact-storage-urls";

const RECIPE_HERO_IMAGE_W = 110;
const RECIPE_HERO_IMAGE_H = 82;
const RECIPE_HERO_IMAGE_GAP = 10;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MX = 40;
const MY = 32;
const CONTENT_W = PAGE_W - MX * 2;

/** Ritmo vertical compacto — prioriza caber numa página A4. */
const SP = {
  /** Espaço entre a faixa do cabeçalho (incl. linha verde) e o conteúdo. */
  headerAfter: 28,
  sectionTop: 12,
  titleToTable: 6,
  sectionBottom: 8,
  heroAfter: 10,
  kvRowH: 14,
  tableHeaderH: 16,
  tableRowH: 15,
  lineLeading: 10,
} as const;

const COL = {
  ink: rgb(0.12, 0.12, 0.12),
  muted: rgb(0.42, 0.42, 0.42),
  border: rgb(0.78, 0.78, 0.78),
  headerFill: rgb(0.93, 0.93, 0.93),
  rowAlt: rgb(0.96, 0.96, 0.96),
  white: rgb(1, 1, 1),
  brand: rgb(0.2, 0.45, 0.35),
};

const SHORT_UNIT: Record<RecipeLineUnit, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "l",
  un: "Un",
};

type PdfCtx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
};

export type TechnicalSheetPdfMeta = {
  tenantName: string;
  tenantLogoBuffer: Buffer | null;
  clientName: string;
  establishmentName?: string | null;
  recipeImageBuffer: Buffer | null;
  professionalName: string;
  professionalCrn: string;
};

function formatBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDatePt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function tenantInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function classificationLabel(value: string | null | undefined): string {
  switch (value) {
    case "bebida":
      return "Bebida";
    case "entrada":
      return "Entrada";
    case "prato-principal":
      return "Prato principal";
    case "sobremesa":
      return "Sobremesa";
    default:
      return value?.trim() ? value : "—";
  }
}

function statusLabel(status: string): string {
  return status === "published" ? "Produto de venda" : "Rascunho";
}

function textWidth(font: PDFFont, text: string, size: number): number {
  return font.widthOfTextAtSize(text, size);
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const clean = foldTextForPdf(redactSupabaseUrlsForPdf(text)).trim();
  if (!clean) return ["—"];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (textWidth(font, next, size) <= maxWidth) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length > 0 ? lines : ["—"];
}

async function embedImageBuffer(
  pdf: PDFDocument,
  buffer: Buffer,
): Promise<PDFImage | null> {
  try {
    return await pdf.embedPng(buffer);
  } catch {
    try {
      return await pdf.embedJpg(buffer);
    } catch {
      return null;
    }
  }
}

/** Foto do utilizador ou imagem padrão do sistema (mantém o layout da ficha). */
async function resolveRecipeHeroImage(
  pdf: PDFDocument,
  userBuffer: Buffer | null,
): Promise<PDFImage | null> {
  if (userBuffer) {
    const userImage = await embedImageBuffer(pdf, userBuffer);
    if (userImage) return userImage;
  }
  return embedImageBuffer(pdf, getDefaultTechnicalRecipeImageBuffer());
}

function ensureSpace(ctx: PdfCtx, needed: number): PdfCtx {
  if (ctx.y - needed >= MY) return ctx;
  const page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  return { ...ctx, page, y: PAGE_H - MY };
}

function drawText(
  ctx: PdfCtx,
  text: string,
  x: number,
  y: number,
  size: number,
  bold = false,
  color = COL.ink,
): void {
  ctx.page.drawText(foldTextForPdf(redactSupabaseUrlsForPdf(text)), {
    x,
    y,
    size,
    font: bold ? ctx.fontBold : ctx.font,
    color,
  });
}

function drawCellText(
  ctx: PdfCtx,
  text: string,
  cellX: number,
  cellW: number,
  baselineY: number,
  size: number,
  align: "left" | "right",
  bold = false,
  color = COL.ink,
  pad = 4,
): void {
  const font = bold ? ctx.fontBold : ctx.font;
  const clipped =
    wrapText(text, font, size, cellW - pad * 2)[0] ?? "—";
  const folded = foldTextForPdf(redactSupabaseUrlsForPdf(clipped));
  const tw = font.widthOfTextAtSize(folded, size);
  const x = align === "right" ? cellX + cellW - pad - tw : cellX + pad;
  ctx.page.drawText(folded, {
    x,
    y: baselineY,
    size,
    font,
    color,
  });
}

function drawSectionTitle(ctx: PdfCtx, title: string): PdfCtx {
  let next = ensureSpace(ctx, SP.sectionTop + SP.titleToTable + 24);
  next = { ...next, y: next.y - SP.sectionTop };
  drawText(next, title, MX, next.y, 10, true, COL.ink);
  return { ...next, y: next.y - SP.titleToTable };
}

function drawTenantHeader(
  ctx: PdfCtx,
  tenantName: string,
  logo: PDFImage | null,
): PdfCtx {
  const bandH = 46;
  let next = ctx;
  next.page.drawRectangle({
    x: 0,
    y: PAGE_H - bandH,
    width: PAGE_W,
    height: bandH,
    color: COL.headerFill,
  });
  next.page.drawRectangle({
    x: 0,
    y: PAGE_H - bandH - 2,
    width: PAGE_W,
    height: 2,
    color: COL.brand,
  });

  const logoBox = 34;
  const logoX = MX;
  const logoY = PAGE_H - bandH + (bandH - logoBox) / 2;
  next.page.drawRectangle({
    x: logoX,
    y: logoY,
    width: logoBox,
    height: logoBox,
    color: COL.white,
    borderColor: COL.border,
    borderWidth: 0.6,
  });

  if (logo) {
    const ratio = logo.width / logo.height;
    let w = logoBox - 6;
    let h = logoBox - 6;
    if (ratio > 1) h = w / ratio;
    else w = h * ratio;
    next.page.drawImage(logo, {
      x: logoX + (logoBox - w) / 2,
      y: logoY + (logoBox - h) / 2,
      width: w,
      height: h,
    });
  } else {
    const initials = tenantInitials(tenantName);
    const iw = textWidth(next.fontBold, initials, 12);
    drawText(
      next,
      initials,
      logoX + (logoBox - iw) / 2,
      logoY + logoBox / 2 + 4,
      12,
      true,
      COL.brand,
    );
  }

  const textX = logoX + logoBox + 12;
  drawText(next, tenantName, textX, PAGE_H - bandH + 30, 12, true, COL.ink);
  drawText(next, "Ficha técnica de preparação", textX, PAGE_H - bandH + 16, 8, false, COL.muted);

  const headerBottomY = PAGE_H - bandH - 2;
  return { ...next, y: headerBottomY - SP.headerAfter };
}

type KeyValueRow = { label: string; value: string };

function drawKeyValueTableAt(
  ctx: PdfCtx,
  rows: KeyValueRow[],
  tableX: number,
  yTop: number,
  labelColW: number,
  valueColW: number,
): number {
  const colWidths = [labelColW, valueColW];
  const rowH = SP.kvRowH;
  let y = yTop;

  for (const [index, row] of rows.entries()) {
    const fill = index % 2 === 1 ? COL.rowAlt : COL.white;
    let cx = tableX;
    for (let col = 0; col < 2; col++) {
      ctx.page.drawRectangle({
        x: cx,
        y: y - rowH,
        width: colWidths[col]!,
        height: rowH,
        color: fill,
        borderColor: COL.border,
        borderWidth: 0.5,
      });
      drawCellText(
        ctx,
        col === 0 ? row.label : row.value,
        cx,
        colWidths[col]!,
        y - 9,
        col === 0 ? 7.5 : 8,
        "left",
        col === 0,
        col === 0 ? COL.muted : COL.ink,
      );
      cx += colWidths[col]!;
    }
    y -= rowH;
  }

  return y;
}

function drawKeyValueTable(
  ctx: PdfCtx,
  title: string | null,
  rows: KeyValueRow[],
  labelColW: number,
  valueColW: number,
  origin?: { x: number; yTop: number },
): PdfCtx {
  const tableX = origin?.x ?? MX;

  let next = title ? drawSectionTitle(ctx, title) : ctx;
  if (title) {
    next = ensureSpaceForSection(
      next,
      kvTableHeight(rows.length),
    );
  }

  let y = origin?.yTop ?? next.y;
  y = drawKeyValueTableAt(next, rows, tableX, y, labelColW, valueColW);
  return { ...next, y: y - (title ? SP.sectionBottom : 0) };
}

function drawCellTextBlock(
  ctx: PdfCtx,
  text: string,
  cellX: number,
  cellW: number,
  rowTop: number,
  rowH: number,
  size: number,
  align: "left" | "right",
  bold = false,
  color = COL.ink,
): void {
  const font = bold ? ctx.fontBold : ctx.font;
  const lines = wrapText(text, font, size, cellW - 8);
  const blockH = lines.length * SP.lineLeading;
  let y = rowTop - 8 - Math.max(0, (rowH - blockH) / 2);
  for (const line of lines) {
    drawCellText(ctx, line, cellX, cellW, y, size, align, bold, color);
    y -= SP.lineLeading;
  }
}

function kvTableHeight(rowCount: number): number {
  return rowCount * SP.kvRowH;
}

function sectionBlockHeight(title: boolean, bodyH: number): number {
  return (title ? SP.sectionTop + SP.titleToTable : 0) + bodyH + SP.sectionBottom;
}

/** Mantém secões pequenas inteiras na mesma página quando possível. */
function ensureSpaceForSection(ctx: PdfCtx, blockH: number): PdfCtx {
  return ensureSpace(ctx, blockH);
}

function drawGridTable(
  ctx: PdfCtx,
  title: string,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  options?: {
    rowHeights?: number[];
    emptyMessage?: string;
  },
): PdfCtx {
  const tableW = colWidths.reduce((a, b) => a + b, 0);
  const tableX = MX;
  const headerH = SP.tableHeaderH;
  const defaultRowH = SP.tableRowH;

  let next = drawSectionTitle(ctx, title);
  const hasRows = rows.length > 0;
  const emptyRowH = 28;

  const totalBodyH = hasRows
    ? rows.reduce(
        (sum, _, i) => sum + (options?.rowHeights?.[i] ?? defaultRowH),
        0,
      )
    : options?.emptyMessage
      ? emptyRowH
      : 0;

  next = ensureSpaceForSection(
    next,
    sectionBlockHeight(true, headerH + totalBodyH),
  );

  let x = tableX;
  for (let i = 0; i < headers.length; i++) {
    next.page.drawRectangle({
      x,
      y: next.y - headerH,
      width: colWidths[i]!,
      height: headerH,
      color: COL.headerFill,
      borderColor: COL.border,
      borderWidth: 0.5,
    });
    drawCellText(next, headers[i]!, x, colWidths[i]!, next.y - 12, 8.5, "left", true);
    x += colWidths[i]!;
  }
  next = { ...next, y: next.y - headerH };

  if (!hasRows && options?.emptyMessage) {
    next = ensureSpace(next, emptyRowH + 4);
    next.page.drawRectangle({
      x: tableX,
      y: next.y - emptyRowH,
      width: tableW,
      height: emptyRowH,
      color: COL.white,
      borderColor: COL.border,
      borderWidth: 0.5,
    });
    drawCellTextBlock(
      next,
      options.emptyMessage,
      tableX,
      tableW,
      next.y,
      emptyRowH,
      8.5,
      "left",
      false,
      COL.muted,
    );
    return { ...next, y: next.y - emptyRowH - SP.sectionBottom };
  }

  rows.forEach((cells, index) => {
    const rowH = options?.rowHeights?.[index] ?? defaultRowH;
    next = ensureSpace(next, rowH + 4);
    let cx = tableX;
    const fill = index % 2 === 1 ? COL.rowAlt : COL.white;
    for (let i = 0; i < headers.length; i++) {
      next.page.drawRectangle({
        x: cx,
        y: next.y - rowH,
        width: colWidths[i]!,
        height: rowH,
        color: fill,
        borderColor: COL.border,
        borderWidth: 0.5,
      });
      drawCellTextBlock(
        next,
        cells[i] ?? "—",
        cx,
        colWidths[i]!,
        next.y,
        rowH,
        8,
        "left",
        false,
      );
      cx += colWidths[i]!;
    }
    next = { ...next, y: next.y - rowH };
  });

  return { ...next, y: next.y - SP.sectionBottom };
}

function drawHeroSection(
  ctx: PdfCtx,
  meta: TechnicalSheetPdfMeta,
  recipe: TechnicalRecipeWithLines,
  recipeImage: PDFImage | null,
): PdfCtx {
  let next = ensureSpace(ctx, 160);
  const establishmentLabel =
    meta.establishmentName?.trim() || meta.clientName.trim() || "—";
  drawText(next, establishmentLabel, MX, next.y, 10, true, COL.ink);
  next = { ...next, y: next.y - 14 };
  drawText(next, recipe.name, MX, next.y, 14, true, COL.ink);
  next = { ...next, y: next.y - 16 };

  const blockTop = next.y;
  const labelColW = 108;
  const valueColW = CONTENT_W - RECIPE_HERO_IMAGE_W - RECIPE_HERO_IMAGE_GAP - labelColW;
  const imageW = RECIPE_HERO_IMAGE_W;
  const imageH = RECIPE_HERO_IMAGE_H;
  const imageX = MX;
  const metaX = MX + imageW + RECIPE_HERO_IMAGE_GAP;

  next.page.drawRectangle({
    x: imageX,
    y: blockTop - imageH,
    width: imageW,
    height: imageH,
    borderColor: COL.border,
    borderWidth: 0.8,
    color: COL.white,
  });

  if (recipeImage) {
    const ratio = recipeImage.width / recipeImage.height;
    let w = imageW - 8;
    let h = imageH - 8;
    if (ratio > w / h) h = w / ratio;
    else w = h * ratio;
    next.page.drawImage(recipeImage, {
      x: imageX + (imageW - w) / 2,
      y: blockTop - imageH + (imageH - h) / 2,
      width: w,
      height: h,
    });
  }

  const observationNotes = recipe.lines
    .map((l) => l.notes?.trim())
    .filter(Boolean)
    .join(" | ");

  const metaRows: KeyValueRow[] = [
    { label: "Tipo", value: statusLabel(recipe.status) },
    { label: "Categoria", value: classificationLabel(recipe.classification) },
    { label: "Setor", value: recipe.sector?.trim() || "—" },
    {
      label: "Rendimento",
      value: `${recipe.portions_yield} porção(ões)`,
    },
    {
      label: "Última modificação",
      value: formatDatePt(recipe.updated_at),
    },
  ];

  if (observationNotes) {
    metaRows.push({ label: "Observações", value: observationNotes });
  }

  const metaBottom = drawKeyValueTable(
    next,
    null,
    metaRows,
    labelColW,
    valueColW,
    { x: metaX, yTop: blockTop },
  ).y;
  const blockBottom = Math.min(blockTop - imageH, metaBottom);
  return { ...next, y: blockBottom - SP.heroAfter };
}

function drawItemsTable(
  ctx: PdfCtx,
  recipe: TechnicalRecipeWithLines,
): PdfCtx {
  const headers = ["Tipo", "Nome", "Medida", "Qtd."];
  const colWidths = [78, 210, 58, 109];
  const rows = recipe.lines.map((line) => {
    const unit = line.unit as RecipeLineUnit;
    const tipo = line.raw_material?.name?.trim() || "Ingrediente";
    const nome = line.ingredient_name.trim() || "—";
    const medida = SHORT_UNIT[unit] ?? unit;
    const qty = `${line.quantity} ${medida}`;
    return [tipo, nome, medida, qty];
  });

  return drawGridTable(ctx, "Itens do preparo", headers, rows, colWidths);
}

function drawPreparationSection(ctx: PdfCtx, recipe: TechnicalRecipeWithLines): PdfCtx {
  const steps = recipe.lines
    .map((l) => l.notes?.trim())
    .filter((n): n is string => Boolean(n));

  const colWidths = [32, CONTENT_W - 32];
  const headers = ["Etapa", "Descrição"];
  const rows = steps.map((step, index) => [String(index + 1), step]);
  const rowHeights = steps.map((step) => {
    const lines = wrapText(step, ctx.font, 8, colWidths[1]! - 8);
    return Math.max(SP.tableRowH + 2, lines.length * SP.lineLeading + 6);
  });

  return drawGridTable(ctx, "Modo de preparo", headers, rows, colWidths, {
    rowHeights,
    emptyMessage:
      "Registre etapas nas observações de cada ingrediente.",
  });
}

function buildSummaryRows(
  recipe: TechnicalRecipeWithLines,
  meta: TechnicalSheetPdfMeta,
): KeyValueRow[] {
  const costAgg = recipe.lines.reduce(
    (acc, l) => {
      if (!l.raw_material) return acc;
      const r = lineRawMaterialCostBrl(
        l.quantity * l.correction_factor,
        l.unit as RecipeLineUnit,
        l.raw_material,
      );
      if (!r.skipped) acc.total += r.brl;
      return acc;
    },
    { total: 0 },
  );

  const nutritionLines = recipe.lines.map((l) => ({
    quantity: l.quantity,
    unit: l.unit as RecipeLineUnit,
    taco: l.taco_food,
    cooking_factor: l.cooking_factor,
  }));
  const nutrition = computeRecipeNutritionTotals(nutritionLines);
  const perPortion = divideRecipeNutritionByPortions(nutrition, recipe.portions_yield);
  const pricing = computeRecipePricingBreakdown({
    totalMaterialCostBrl: costAgg.total,
    portionsYield: recipe.portions_yield,
    marginPercent: recipe.margin_percent,
    taxPercent: recipe.tax_percent,
  });

  return [
    { label: "Custo total da preparação", value: formatBrl(costAgg.total) },
    { label: "Custo por porção", value: formatBrl(pricing.costPerPortionBrl) },
    {
      label: "Preço sugerido (c/ imposto)",
      value: formatBrl(pricing.suggestedPriceWithTaxPerPortionBrl),
    },
    {
      label: "Nutrição total (TACO)",
      value: `${nutrition.kcal} kcal · P ${nutrition.proteinG}g · CHO ${nutrition.carbG}g · L ${nutrition.lipidG}g`,
    },
    {
      label: "Nutrição por porção",
      value: `${perPortion.kcal} kcal · P ${perPortion.proteinG}g · CHO ${perPortion.carbG}g · L ${perPortion.lipidG}g`,
    },
    { label: "Profissional", value: meta.professionalName },
    { label: "CRN", value: meta.professionalCrn || "—" },
  ];
}

function drawSummaryFooter(
  ctx: PdfCtx,
  recipe: TechnicalRecipeWithLines,
  meta: TechnicalSheetPdfMeta,
): PdfCtx {
  const rows = buildSummaryRows(recipe, meta);
  let next = drawKeyValueTable(ctx, "Resumo técnico", rows, 200, CONTENT_W - 200);

  next = ensureSpace(next, SP.lineLeading + 4);
  drawText(
    next,
    "Valores nutricionais indicativos (TACO).",
    MX,
    next.y,
    7,
    false,
    COL.muted,
  );
  return { ...next, y: next.y - SP.lineLeading };
}

export async function buildTechnicalRecipePdfBytes(
  recipe: TechnicalRecipeWithLines,
  meta: TechnicalSheetPdfMeta,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const tenantLogo = meta.tenantLogoBuffer
    ? await embedImageBuffer(pdf, meta.tenantLogoBuffer)
    : null;
  const recipeImage = await resolveRecipeHeroImage(pdf, meta.recipeImageBuffer);

  let ctx: PdfCtx = {
    pdf,
    page: pdf.addPage([PAGE_W, PAGE_H]),
    font,
    fontBold,
    y: PAGE_H - MY,
  };

  ctx = drawTenantHeader(ctx, meta.tenantName, tenantLogo);
  ctx = drawHeroSection(ctx, meta, recipe, recipeImage);
  ctx = drawItemsTable(ctx, recipe);
  ctx = drawPreparationSection(ctx, recipe);
  ctx = drawSummaryFooter(ctx, recipe, meta);

  return pdf.save();
}
