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
import { redactSupabaseUrlsForPdf } from "@/lib/pdf/redact-storage-urls";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MX = 40;
const MY = 40;

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

function drawSectionTitle(ctx: PdfCtx, title: string): PdfCtx {
  let next = ensureSpace(ctx, 36);
  const lineY = next.y - 4;
  next.page.drawLine({
    start: { x: MX, y: lineY },
    end: { x: PAGE_W - MX, y: lineY },
    thickness: 0.8,
    color: COL.border,
  });
  const labelW = textWidth(next.fontBold, title, 10);
  drawText(next, title, PAGE_W - MX - labelW, next.y, 10, true, COL.muted);
  return { ...next, y: lineY - 18 };
}

function drawTenantHeader(
  ctx: PdfCtx,
  tenantName: string,
  logo: PDFImage | null,
): PdfCtx {
  const bandH = 56;
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

  const logoBox = 40;
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
  drawText(next, tenantName, textX, PAGE_H - bandH + 34, 14, true, COL.ink);
  drawText(next, "Ficha técnica de preparação", textX, PAGE_H - bandH + 18, 9, false, COL.muted);

  return { ...next, y: PAGE_H - bandH - 20 };
}

function drawDocumentTitle(ctx: PdfCtx): PdfCtx {
  let next = ensureSpace(ctx, 50);
  const title = "FICHA TÉCNICA";
  const tw = textWidth(next.fontBold, title, 12);
  const centerX = (PAGE_W - tw) / 2;
  next.page.drawLine({
    start: { x: MX, y: next.y },
    end: { x: PAGE_W - MX, y: next.y },
    thickness: 0.8,
    color: COL.border,
  });
  drawText(next, title, centerX, next.y - 16, 12, true, COL.ink);
  next = { ...next, y: next.y - 22 };
  next.page.drawLine({
    start: { x: MX, y: next.y },
    end: { x: PAGE_W - MX, y: next.y },
    thickness: 0.8,
    color: COL.border,
  });
  return { ...next, y: next.y - 20 };
}

function drawMetaBlock(
  ctx: PdfCtx,
  rows: Array<{ label: string; value: string }>,
  x: number,
  yTop: number,
  width: number,
): number {
  const labelW = 108;
  const rowH = 16;
  let y = yTop;
  for (const row of rows) {
    ctx.page.drawRectangle({
      x,
      y: y - rowH,
      width,
      height: rowH,
      borderColor: COL.border,
      borderWidth: 0.5,
      color: COL.white,
    });
    drawText(ctx, row.label, x + 6, y - 11, 8, true, COL.muted);
    const valueLines = wrapText(row.value, ctx.font, 8.5, width - labelW - 10);
    drawText(ctx, valueLines[0] ?? "—", x + labelW, y - 11, 8.5, false, COL.ink);
    y -= rowH;
  }
  return y;
}

function drawHeroSection(
  ctx: PdfCtx,
  meta: TechnicalSheetPdfMeta,
  recipe: TechnicalRecipeWithLines,
  recipeImage: PDFImage | null,
): PdfCtx {
  let next = ensureSpace(ctx, 220);
  drawText(next, `Cliente: ${meta.clientName}`, MX, next.y, 11, true, COL.ink);
  next = { ...next, y: next.y - 18 };
  if (meta.establishmentName) {
    drawText(
      next,
      `Estabelecimento: ${meta.establishmentName}`,
      MX,
      next.y,
      9,
      false,
      COL.muted,
    );
    next = { ...next, y: next.y - 14 };
  }
  drawText(next, recipe.name, MX, next.y, 16, true, COL.ink);
  next = { ...next, y: next.y - 24 };

  const blockTop = next.y;
  const contentW = PAGE_W - MX * 2;
  const imageW = recipeImage ? 200 : 0;
  const gap = recipeImage ? 14 : 0;
  const metaX = MX + imageW + gap;
  const metaW = contentW - imageW - gap;
  const imageH = 150;

  if (recipeImage) {
    next.page.drawRectangle({
      x: MX,
      y: blockTop - imageH,
      width: imageW,
      height: imageH,
      borderColor: COL.border,
      borderWidth: 0.8,
      color: COL.white,
    });
    const ratio = recipeImage.width / recipeImage.height;
    let w = imageW - 8;
    let h = imageH - 8;
    if (ratio > w / h) h = w / ratio;
    else w = h * ratio;
    next.page.drawImage(recipeImage, {
      x: MX + (imageW - w) / 2,
      y: blockTop - imageH + (imageH - h) / 2,
      width: w,
      height: h,
    });
  }

  const observationNotes = recipe.lines
    .map((l) => l.notes?.trim())
    .filter(Boolean)
    .join(" | ");

  const metaRows = [
    { label: "Tipo", value: statusLabel(recipe.status) },
    { label: "Categoria", value: classificationLabel(recipe.classification) },
    { label: "Setor", value: recipe.sector?.trim() || "—" },
    {
      label: "Rendimento",
      value: `${recipe.portions_yield} porção(ões)`,
    },
    { label: "Data de criação", value: formatDatePt(recipe.created_at) },
    { label: "Última atualização", value: formatDatePt(recipe.updated_at) },
    { label: "CMV", value: `${(recipe.cmv_percent ?? 25).toFixed(1)}%` },
    {
      label: "Observações",
      value: observationNotes || "—",
    },
  ];

  const metaBottom = drawMetaBlock(next, metaRows, metaX, blockTop, metaW);
  const blockBottom = Math.min(blockTop - imageH, metaBottom);
  return { ...next, y: blockBottom - 18 };
}

function drawItemsTable(
  ctx: PdfCtx,
  recipe: TechnicalRecipeWithLines,
): PdfCtx {
  let next = drawSectionTitle(ctx, "Itens do preparo");
  const headers = ["Tipo", "Nome", "Medida", "Quantidade total"];
  const colWidths = [90, 190, 70, 125];
  const tableW = colWidths.reduce((a, b) => a + b, 0);
  const tableX = PAGE_W - MX - tableW;
  const headerH = 18;
  const rowH = 18;

  next = ensureSpace(next, headerH + rowH * Math.max(recipe.lines.length, 1) + 10);

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
    drawText(next, headers[i]!, x + 4, next.y - 12, 8.5, true, COL.ink);
    x += colWidths[i]!;
  }
  next = { ...next, y: next.y - headerH };

  recipe.lines.forEach((line, index) => {
    next = ensureSpace(next, rowH + 4);
    const unit = line.unit as RecipeLineUnit;
    const tipo = line.raw_material?.name?.trim() || "Ingrediente";
    const nome = line.ingredient_name.trim() || "—";
    const medida = SHORT_UNIT[unit] ?? unit;
    const qty = `${line.quantity} ${medida}`;
    const cells = [tipo, nome, medida, qty];
    let cx = tableX;
    const fill = index % 2 === 1 ? COL.rowAlt : COL.white;
    for (let i = 0; i < cells.length; i++) {
      next.page.drawRectangle({
        x: cx,
        y: next.y - rowH,
        width: colWidths[i]!,
        height: rowH,
        color: fill,
        borderColor: COL.border,
        borderWidth: 0.5,
      });
      const clipped = wrapText(cells[i]!, next.font, 8, colWidths[i]! - 8)[0] ?? "—";
      drawText(next, clipped, cx + 4, next.y - 12, 8, false, COL.ink);
      cx += colWidths[i]!;
    }
    next = { ...next, y: next.y - rowH };
  });

  return { ...next, y: next.y - 14 };
}

function drawPreparationSection(ctx: PdfCtx, recipe: TechnicalRecipeWithLines): PdfCtx {
  let next = drawSectionTitle(ctx, "Modo de preparo");
  const steps = recipe.lines
    .map((l) => l.notes?.trim())
    .filter((n): n is string => Boolean(n));

  if (steps.length === 0) {
    next = ensureSpace(next, 24);
    drawText(
      next,
      "Registre as etapas nas observações de cada ingrediente no formulário da receita.",
      MX,
      next.y,
      8.5,
      false,
      COL.muted,
    );
    return { ...next, y: next.y - 20 };
  }

  const rowH = 22;
  steps.forEach((step, index) => {
    const lines = wrapText(step, next.font, 8.5, PAGE_W - MX * 2 - 28);
    const blockH = Math.max(rowH, lines.length * 11 + 10);
    next = ensureSpace(next, blockH + 4);
    const fill = index % 2 === 1 ? COL.rowAlt : COL.white;
    next.page.drawRectangle({
      x: MX,
      y: next.y - blockH,
      width: PAGE_W - MX * 2,
      height: blockH,
      color: fill,
      borderColor: COL.border,
      borderWidth: 0.5,
    });
    drawText(next, String(index + 1), MX + 6, next.y - 14, 9, true, COL.brand);
    lines.forEach((ln, li) => {
      drawText(next, ln, MX + 24, next.y - 14 - li * 11, 8.5, false, COL.ink);
    });
    next = { ...next, y: next.y - blockH };
  });

  return { ...next, y: next.y - 14 };
}

function drawSummaryFooter(
  ctx: PdfCtx,
  recipe: TechnicalRecipeWithLines,
  meta: TechnicalSheetPdfMeta,
): PdfCtx {
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

  let next = drawSectionTitle(ctx, "Resumo técnico");
  const rows = [
    `Custo total de matéria-prima: ${formatBrl(costAgg.total)}`,
    `Preço sugerido por porção (c/ impostos): ${formatBrl(pricing.suggestedPriceWithTaxPerPortionBrl)}`,
    `Margem: ${recipe.margin_percent}% | Imposto: ${recipe.tax_percent}%`,
    `Nutrição total (TACO): ${nutrition.kcal} kcal; P ${nutrition.proteinG} g; CHO ${nutrition.carbG} g; L ${nutrition.lipidG} g`,
    `Por porção: ${perPortion.kcal} kcal; P ${perPortion.proteinG} g; CHO ${perPortion.carbG} g; L ${perPortion.lipidG} g`,
    `Profissional: ${meta.professionalName} — CRN ${meta.professionalCrn || "—"}`,
  ];

  for (const row of rows) {
    next = ensureSpace(next, 14);
    drawText(next, row, MX, next.y, 8, false, COL.muted);
    next = { ...next, y: next.y - 12 };
  }

  next = ensureSpace(next, 16);
  drawText(
    next,
    "Valores nutricionais indicativos com base na tabela TACO e nas quantidades informadas.",
    MX,
    next.y,
    7.5,
    false,
    COL.muted,
  );
  return { ...next, y: next.y - 12 };
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
  const recipeImage = meta.recipeImageBuffer
    ? await embedImageBuffer(pdf, meta.recipeImageBuffer)
    : null;

  let ctx: PdfCtx = {
    pdf,
    page: pdf.addPage([PAGE_W, PAGE_H]),
    font,
    fontBold,
    y: PAGE_H - MY,
  };

  ctx = drawTenantHeader(ctx, meta.tenantName, tenantLogo);
  ctx = drawDocumentTitle(ctx);
  ctx = drawHeroSection(ctx, meta, recipe, recipeImage);
  ctx = drawItemsTable(ctx, recipe);
  ctx = drawPreparationSection(ctx, recipe);
  ctx = drawSummaryFooter(ctx, recipe, meta);

  return pdf.save();
}
