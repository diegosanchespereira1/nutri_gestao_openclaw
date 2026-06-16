/**
 * Relatório de Avaliação Nutricional Infantil — PDF voltado ao paciente.
 *
 * Layout premium e linguagem clara: cabeçalho com a marca do tenant, resumo do
 * estado nutricional atual (semáforo), tabela comparativa das avaliações
 * (evolução), "como ler" e orientações. Gerado com pdf-lib (convenção do projeto).
 *
 * Página 2 (opcional): curvas de crescimento OMS 2006 com trajetória do paciente.
 */
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";

import { foldTextForPdf } from "./dossier-pdf";

// ── Tipos exportados ───────────────────────────────────────────────────────────

export type ChildReportColor = "green" | "yellow" | "red";

export type ChildReportIndicator = {
  label: string;
  status: string;
  color: ChildReportColor;
  valueLabel: string;
  rangeLabel: string;
  percent: number | null; // 0–100, posição do marcador
};

export type ChildReportHistoryRow = {
  dateLabel: string;
  ageLabel: string;
  weightLabel: string;
  heightLabel: string;
  bmiLabel: string;
  bmiPercentileLabel: string;
  bmiClassification: string;
  color: ChildReportColor;
  current: boolean;
  // Novos campos (opcionais — presentes apenas nas avaliações que os incluem)
  cbLabel?: string;
  pctLabel?: string;
  seLabel?: string;
  pcLabel?: string;
};

/** Ponto de uma curva de referência OMS (coluna = percentil, chave = idade em meses). */
export type GrowthCurvePoint = {
  age: number;
  p3: number | null;
  p15: number | null;
  p50: number | null;
  p85: number | null;
  p97: number | null;
};

/** Dados completos de um gráfico de crescimento para um indicador. */
export type ChildReportGrowthChart = {
  title: string;
  unit: string;
  curvePoints: GrowthCurvePoint[];
  patientHistory: Array<{ age: number; value: number }>;
};

export type ChildReportInput = {
  tenantName: string;
  tenantInitials: string;
  logoBuffer: Buffer | null;
  signatureBuffer: Buffer | null;
  emittedAtLabel: string;
  patient: { name: string; birthLabel: string; ageLabel: string; sexLabel: string };
  summary: ChildReportIndicator[];
  /** Indicadores complementares (CB/I, PCT/I, SE/I, PC/I) — seção extra na página 1. */
  extraSummary?: ChildReportIndicator[];
  history: ChildReportHistoryRow[];
  professionalName: string;
  crn: string;
  clinicalNotes: string | null;
  /** Gráficos de curva de crescimento — página 2. */
  growthCharts?: ChildReportGrowthChart[];
};

// ── Paleta ─────────────────────────────────────────────────────────────────────

const COL = {
  ink:      rgb(0.169, 0.169, 0.157),
  muted:    rgb(0.424, 0.416, 0.388),
  line:     rgb(0.871, 0.855, 0.808),
  cream:    rgb(0.969, 0.957, 0.925),
  brand:    rgb(0.373, 0.573, 0.2),
  brandDark:rgb(0.247, 0.416, 0.122),
  accent:   rgb(0.878, 0.537, 0.165),
  white:    rgb(1, 1, 1),
  headerBg: rgb(0.949, 0.965, 0.918),
  track:    rgb(0.886, 0.882, 0.855),
};

const CHART_PAL = {
  p97:     rgb(0.78, 0.22, 0.18),
  p85:     rgb(0.82, 0.55, 0.10),
  p50:     rgb(0.25, 0.60, 0.20),
  p15:     rgb(0.82, 0.55, 0.10),
  p3:      rgb(0.78, 0.22, 0.18),
  patient: rgb(0.06, 0.45, 0.70),
};

function palette(color: ChildReportColor): { ink: RGB; bg: RGB; dot: RGB } {
  switch (color) {
    case "green":
      return { ink: rgb(0.247, 0.416, 0.122), bg: rgb(0.933, 0.961, 0.89),  dot: rgb(0.373, 0.573, 0.2)  };
    case "yellow":
      return { ink: rgb(0.78,  0.467, 0),     bg: rgb(0.984, 0.941, 0.859), dot: rgb(0.78,  0.467, 0)    };
    case "red":
      return { ink: rgb(0.71,  0.2,   0.169), bg: rgb(0.969, 0.902, 0.89),  dot: rgb(0.71,  0.2,   0.169)};
  }
}

// ── Dimensões ──────────────────────────────────────────────────────────────────

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MX     = 42;
const BAND_H = 78;

// Gráficos de crescimento (página 2)
const CCOLS  = 3;
const CCOL_W = (PAGE_W - 2 * MX) / CCOLS;  // ≈ 170.4
const CY_W   = 24;                            // largura da área de rótulos Y
const CBOX_W = CCOL_W - CY_W - 4;            // largura do retângulo do gráfico ≈ 142
const CBOX_H = 128;                           // altura do retângulo do gráfico
const CX_H   = 14;                            // altura dos rótulos do eixo X
const CT_H   = 14;                            // altura do título do gráfico
const CCELL_H = CT_H + CBOX_H + CX_H + 10;  // altura total de cada célula ≈ 166

// ── Helpers internos ───────────────────────────────────────────────────────────

/** Remove glifos que Helvetica (WinAnsi) não suporta. */
function safe(s: string): string {
  return foldTextForPdf(s)
    .replace(/≈/g, "~")
    .replace(/≥/g, ">=")
    .replace(/[↑↓→←]/g, "")
    .trim();
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function fmtVal(n: number): string {
  return n.toFixed(Math.abs(n) < 100 ? 1 : 0);
}

async function embedImg(pdf: PDFDocument, buf: Buffer | null): Promise<PDFImage | null> {
  if (!buf) return null;
  try { return await pdf.embedPng(buf); } catch {
    try { return await pdf.embedJpg(buf); } catch { return null; }
  }
}

type Ctx = { page: PDFPage; font: PDFFont; bold: PDFFont };

function text(
  ctx: Ctx, s: string, x: number, y: number, size: number,
  bold = false, color: RGB = COL.ink,
): void {
  ctx.page.drawText(safe(s), { x, y, size, font: bold ? ctx.bold : ctx.font, color });
}

function widthOf(ctx: Ctx, s: string, size: number, bold = false): number {
  return (bold ? ctx.bold : ctx.font).widthOfTextAtSize(safe(s), size);
}

function wrap(ctx: Ctx, s: string, size: number, maxW: number, bold = false): string[] {
  const words = safe(s).split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (widthOf(ctx, next, size, bold) <= maxW) cur = next;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

/**
 * Trunca texto com "..." se exceder maxW. Garante que nenhum elemento
 * de texto vaze para além da borda do seu card.
 */
function trunc(ctx: Ctx, s: string, maxW: number, size: number, bold = false): string {
  const ss = safe(s);
  if (widthOf(ctx, ss, size, bold) <= maxW) return ss;
  let t = ss;
  while (t.length > 1 && widthOf(ctx, t + "...", size, bold) > maxW) {
    t = t.slice(0, -1);
  }
  return t + "...";
}

function sectionTitle(ctx: Ctx, label: string, y: number): number {
  text(ctx, label.toUpperCase(), MX, y, 9, true, COL.brandDark);
  ctx.page.drawLine({
    start: { x: MX, y: y - 5 },
    end:   { x: PAGE_W - MX, y: y - 5 },
    thickness: 0.7,
    color: COL.line,
  });
  return y - 18;
}

// ── Cabeçalho (reutilizável nas 2 páginas) ────────────────────────────────────

function drawHeader(ctx: Ctx, logo: PDFImage | null, input: ChildReportInput): void {
  const { page } = ctx;
  const bandY = PAGE_H - BAND_H;
  page.drawRectangle({ x: 0, y: bandY, width: PAGE_W, height: BAND_H, color: COL.headerBg });
  page.drawRectangle({ x: 0, y: bandY - 3, width: PAGE_W, height: 3, color: COL.brand });

  const logoSize = 44;
  const logoX = MX;
  const logoY = bandY + (BAND_H - logoSize) / 2;
  page.drawRectangle({
    x: logoX, y: logoY, width: logoSize, height: logoSize,
    color: COL.white, borderColor: COL.line, borderWidth: 1,
  });
  if (logo) {
    const r = logo.width / logo.height;
    let w = logoSize - 8;
    let h = logoSize - 8;
    if (r > 1) h = (logoSize - 8) / r; else w = (logoSize - 8) * r;
    page.drawImage(logo, {
      x: logoX + (logoSize - w) / 2,
      y: logoY + (logoSize - h) / 2,
      width: w, height: h,
    });
  } else {
    const tw = widthOf(ctx, input.tenantInitials, 15, true);
    text(ctx, input.tenantInitials, logoX + (logoSize - tw) / 2, logoY + logoSize / 2 - 6, 15, true, COL.brandDark);
  }

  const tX = logoX + logoSize + 14;
  text(ctx, input.tenantName, tX, bandY + BAND_H - 30, 15, true, COL.brandDark);
  text(ctx, "Relatório de Avaliação Nutricional", tX, bandY + BAND_H - 47, 10, false, COL.ink);
  text(ctx, `Emitido em ${input.emittedAtLabel} · Avaliação infantil`, tX, bandY + BAND_H - 60, 8.5, false, COL.muted);
}

// ── Rodapé (reutilizável nas 2 páginas) ───────────────────────────────────────

function drawFooter(ctx: Ctx, signature: PDFImage | null, input: ChildReportInput): void {
  const { page } = ctx;
  const footY = 70;
  page.drawLine({
    start: { x: MX, y: footY + 28 },
    end:   { x: PAGE_W - MX, y: footY + 28 },
    thickness: 0.6, color: COL.line,
  });
  wrap(
    ctx,
    "Documento gerado a partir das avaliações no NutriGestão. Referência: curvas OMS 2006/2007. Não substitui consulta médica.",
    7.5, 250,
  ).forEach((ln, i) => text(ctx, ln, MX, footY + 8 - i * 10, 7.5, false, COL.muted));

  const sigW = 220;
  const sigX = PAGE_W - MX - sigW;
  if (signature) {
    const r = signature.width / signature.height;
    let h = 30;
    let w = h * r;
    if (w > sigW) { w = sigW; h = w / r; }
    page.drawImage(signature, { x: sigX + (sigW - w) / 2, y: footY + 20, width: w, height: h });
  }
  page.drawLine({ start: { x: sigX, y: footY + 18 }, end: { x: sigX + sigW, y: footY + 18 }, thickness: 0.8, color: COL.ink });
  const pnW = widthOf(ctx, input.professionalName, 10, true);
  text(ctx, input.professionalName, sigX + (sigW - pnW) / 2, footY + 6, 10, true);
  const sub = input.crn
    ? `Nutricionista · CRN ${input.crn} · ${input.emittedAtLabel}`
    : `Nutricionista · ${input.emittedAtLabel}`;
  const sW = widthOf(ctx, sub, 7.5);
  text(ctx, sub, sigX + (sigW - sW) / 2, footY - 5, 7.5, false, COL.muted);
}

// ── Gráfico de crescimento ────────────────────────────────────────────────────

function drawGrowthChart(
  ctx: Ctx,
  chart: ChildReportGrowthChart,
  cellLeft: number,   // X da célula (inclui área de rótulos Y)
  cellTop: number,    // Y do topo da célula (coordenadas PDF)
): void {
  const { page } = ctx;
  const boxX    = cellLeft + CY_W;
  const boxTopY = cellTop - CT_H;
  const boxBotY = boxTopY - CBOX_H;

  // Título — começa em boxX (evita sobreposição com rótulos do eixo Y)
  const titleWithUnit = `${safe(chart.title)} (${chart.unit})`;
  text(ctx, trunc(ctx, titleWithUnit, CBOX_W, 6, true), boxX, cellTop - 4, 6, true, COL.ink);

  // Intervalo de valores
  const allVals: number[] = [];
  for (const pt of chart.curvePoints) {
    if (pt.p3  != null) allVals.push(pt.p3);
    if (pt.p97 != null) allVals.push(pt.p97);
  }
  for (const h of chart.patientHistory) allVals.push(h.value);
  if (allVals.length === 0) return;

  const vMin = Math.min(...allVals);
  const vMax = Math.max(...allVals);
  const vRange = vMax - vMin || 1;

  const allAges = chart.curvePoints.map((p) => p.age);
  if (allAges.length === 0) return;
  const aMin = Math.min(...allAges);
  const aMax = Math.max(...allAges);
  const aRange = aMax - aMin || 1;

  const toX = (age: number): number => boxX    + clamp((age - aMin) / aRange, 0, 1) * CBOX_W;
  const toY = (val: number): number => boxBotY + clamp((val - vMin) / vRange, 0, 1) * CBOX_H;

  // Borda do retângulo (4 linhas — pdf-lib não suporta fill+border combinados)
  const bc = COL.line;
  const bt = 0.6;
  page.drawLine({ start: { x: boxX,          y: boxBotY }, end: { x: boxX + CBOX_W, y: boxBotY }, thickness: bt, color: bc });
  page.drawLine({ start: { x: boxX,          y: boxTopY }, end: { x: boxX + CBOX_W, y: boxTopY }, thickness: bt, color: bc });
  page.drawLine({ start: { x: boxX,          y: boxBotY }, end: { x: boxX,           y: boxTopY }, thickness: bt, color: bc });
  page.drawLine({ start: { x: boxX + CBOX_W, y: boxBotY }, end: { x: boxX + CBOX_W, y: boxTopY }, thickness: bt, color: bc });

  // Gridlines horizontais
  for (const frac of [0.25, 0.5, 0.75]) {
    const gy = toY(vMin + vRange * frac);
    page.drawLine({ start: { x: boxX, y: gy }, end: { x: boxX + CBOX_W, y: gy }, thickness: 0.3, color: COL.line });
  }

  // Curvas de percentil
  const curves: Array<{ key: "p3" | "p15" | "p50" | "p85" | "p97"; color: RGB; thick: number }> = [
    { key: "p97", color: CHART_PAL.p97, thick: 0.7 },
    { key: "p85", color: CHART_PAL.p85, thick: 0.7 },
    { key: "p50", color: CHART_PAL.p50, thick: 1.1 },
    { key: "p15", color: CHART_PAL.p15, thick: 0.7 },
    { key: "p3",  color: CHART_PAL.p3,  thick: 0.7 },
  ];
  for (const curve of curves) {
    let px: number | null = null;
    let py: number | null = null;
    for (const pt of chart.curvePoints) {
      const val = pt[curve.key];
      if (val == null) { px = null; py = null; continue; }
      const cx = toX(pt.age);
      const cy = toY(val);
      if (px != null && py != null) {
        page.drawLine({ start: { x: px, y: py }, end: { x: cx, y: cy }, thickness: curve.thick, color: curve.color });
      }
      px = cx; py = cy;
    }
  }

  // Trajetória do paciente (linha azul + círculos + rótulo do valor medido)
  const hist = [...chart.patientHistory].sort((a, b) => a.age - b.age);
  let ppx: number | null = null;
  let ppy: number | null = null;
  for (let pi = 0; pi < hist.length; pi++) {
    const h  = hist[pi]!;
    const hx = toX(h.age);
    const hy = toY(h.value);
    if (ppx != null && ppy != null) {
      page.drawLine({ start: { x: ppx, y: ppy }, end: { x: hx, y: hy }, thickness: 1.6, color: CHART_PAL.patient });
    }
    page.drawCircle({ x: hx, y: hy, size: 2.5, color: CHART_PAL.patient });

    // Rótulo do valor junto ao ponto, alternando acima/abaixo para evitar sobreposição
    const valStr = fmtVal(h.value);
    const vlW    = widthOf(ctx, valStr, 5, false);
    const vlX    = clamp(hx - vlW / 2, boxX + 1, boxX + CBOX_W - vlW - 1);
    const aboveY = hy + 6;
    const belowY = hy - 9;
    const prefY  = (pi % 2 === 0) ? aboveY : belowY;
    // Mantém dentro dos limites verticais do box
    const vlY = (prefY > boxBotY + 2 && prefY + 5 < boxTopY)
              ? prefY
              : (aboveY > boxBotY + 2 && aboveY + 5 < boxTopY ? aboveY : belowY);
    if (vlY > boxBotY + 1 && vlY + 5 < boxTopY + 2) {
      text(ctx, valStr, vlX, vlY, 5, false, CHART_PAL.patient);
    }

    ppx = hx; ppy = hy;
  }

  // Rótulos do eixo Y
  for (const tv of [vMin, vMin + vRange / 2, vMax]) {
    const ty = toY(tv);
    const label = fmtVal(tv);
    const lw = widthOf(ctx, label, 5.5);
    text(ctx, label, boxX - lw - 2, ty - 2.5, 5.5, false, COL.muted);
  }

  // Rótulos do eixo X
  const step = Math.max(1, Math.ceil(aRange / 4));
  const xTicks = new Set<number>();
  for (let a = aMin; a <= aMax; a += step) xTicks.add(a);
  xTicks.add(aMax);
  for (const age of [...xTicks].sort((a, b) => a - b)) {
    const lx = toX(age);
    const label = age < 24 ? `${age}m` : `${Math.floor(age / 12)}a`;
    const lw = widthOf(ctx, label, 5.5);
    text(ctx, label, lx - lw / 2, boxBotY - 9, 5.5, false, COL.muted);
  }
}

// ── Exportação principal ───────────────────────────────────────────────────────

export async function buildChildAssessmentReportPdfBytes(
  input: ChildReportInput,
): Promise<Uint8Array> {
  const pdf  = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo      = await embedImg(pdf, input.logoBuffer);
  const signature = await embedImg(pdf, input.signatureBuffer);

  // ════════════════════════════════════════════════════════════════════════════
  // PÁGINA 1
  // ════════════════════════════════════════════════════════════════════════════
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const ctx: Ctx = { page, font, bold };

  drawHeader(ctx, logo, input);

  let y = PAGE_H - BAND_H - 24;

  // ── Dados do paciente ──────────────────────────────────────────────────────
  y = sectionTitle(ctx, "Dados do paciente", y);
  const cols = [
    ["Nome", input.patient.name],
    ["Data de nascimento", input.patient.birthLabel],
    ["Idade na avaliação", input.patient.ageLabel],
    ["Sexo", input.patient.sexLabel],
  ];
  const colW = (PAGE_W - 2 * MX) / 4;
  cols.forEach(([label, value], i) => {
    const cx = MX + i * colW;
    text(ctx, label.toUpperCase(), cx, y, 7, false, COL.muted);
    for (const [li, ln] of wrap(ctx, value, 9.5, colW - 8, true).slice(0, 2).entries()) {
      text(ctx, ln, cx, y - 12 - li * 11, 9.5, true);
    }
  });
  y -= 40;

  // ── Resumo principal (IMC/I, P/I, E/I) ────────────────────────────────────
  y = sectionTitle(ctx, "Resumo do estado nutricional — avaliação atual", y);
  const gap   = 12;
  const cardW = (PAGE_W - 2 * MX - 2 * gap) / 3;
  const cardH = 104;
  input.summary.slice(0, 3).forEach((ind, i) => {
    const cx  = MX + i * (cardW + gap);
    const pal = palette(ind.color);
    page.drawRectangle({ x: cx, y: y - cardH, width: cardW, height: cardH, color: pal.bg, borderColor: COL.line, borderWidth: 0.5 });
    const pad = 12;
    text(ctx, ind.label.toUpperCase(), cx + pad, y - 16, 7, false, COL.muted);
    page.drawCircle({ x: cx + cardW - pad - 4, y: y - 14, size: 5, color: pal.dot });
    for (const [li, ln] of wrap(ctx, ind.status, 13, cardW - 2 * pad, true).slice(0, 2).entries()) {
      text(ctx, ln, cx + pad, y - 34 - li * 14, 13, true, pal.ink);
    }
    text(ctx, ind.valueLabel, cx + pad, y - 62, 8.5, false, COL.muted);
    const barY = y - 74;
    const barW = cardW - 2 * pad;
    page.drawRectangle({ x: cx + pad, y: barY, width: barW, height: 6, color: COL.track });
    if (ind.percent != null) {
      const mx = cx + pad + clamp(ind.percent, 0, 100) / 100 * barW;
      page.drawRectangle({ x: mx - 1.5, y: barY - 3, width: 3, height: 12, color: COL.ink });
    }
    text(ctx, ind.rangeLabel, cx + pad, y - cardH + 12, 7.5, false, COL.muted);
  });
  y -= cardH + 22;

  // ── Indicadores complementares (CB/I, PCT/I, SE/I, PC/I) ──────────────────
  const hasExtra = (input.extraSummary?.length ?? 0) > 0;
  if (hasExtra) {
    y = sectionTitle(ctx, "Medidas Antropométricas Complementares", y);
    const extras  = input.extraSummary!.slice(0, 4);
    const eGap    = 8;
    const eCardW  = (PAGE_W - 2 * MX - (extras.length - 1) * eGap) / extras.length;
    const eCardH  = 88;  // altura suficiente para 2 linhas de status
    extras.forEach((ind, i) => {
      const cx  = MX + i * (eCardW + eGap);
      const pal = palette(ind.color);
      page.drawRectangle({ x: cx, y: y - eCardH, width: eCardW, height: eCardH, color: pal.bg, borderColor: COL.line, borderWidth: 0.5 });
      const pad  = 10;
      const maxW = eCardW - 2 * pad;
      // Label — reserva 8pt para o círculo de status à direita
      text(ctx, trunc(ctx, ind.label.toUpperCase(), maxW - 8, 6.5, false), cx + pad, y - 13, 6.5, false, COL.muted);
      page.drawCircle({ x: cx + eCardW - pad - 3.5, y: y - 11.5, size: 3.5, color: pal.dot });
      // Status: até 2 linhas (classificação como "Adequado para a idade" pode não caber em 1)
      for (const [li, ln] of wrap(ctx, ind.status, 11, maxW, true).slice(0, 2).entries()) {
        text(ctx, ln, cx + pad, y - 28 - li * 12, 11, true, pal.ink);
      }
      text(ctx, trunc(ctx, ind.valueLabel, maxW, 7.5, false), cx + pad, y - 54, 7.5, false, COL.muted);
      const barY = y - 64;
      const barW = maxW;
      page.drawRectangle({ x: cx + pad, y: barY, width: barW, height: 5, color: COL.track });
      if (ind.percent != null) {
        const mx = cx + pad + clamp(ind.percent, 0, 100) / 100 * barW;
        page.drawRectangle({ x: mx - 1.5, y: barY - 2, width: 3, height: 9, color: COL.ink });
      }
      text(ctx, trunc(ctx, ind.rangeLabel, maxW, 6.5, false), cx + pad, y - eCardH + 8, 6.5, false, COL.muted);
    });
    y -= eCardH + 18;
  }

  // ── Evolução comparativa ───────────────────────────────────────────────────
  y = sectionTitle(ctx, "Evolução — comparativo das avaliações", y);
  const headers = ["Data", "Idade", "Peso", "Estatura", "IMC", "Perc. IMC", "Classificação"];
  const widths  = [86, 48, 56, 60, 42, 56, 0];
  widths[6] = PAGE_W - 2 * MX - widths.slice(0, 6).reduce((a, b) => a + b, 0);
  const rowH = 20;
  const colX = (idx: number): number => MX + widths.slice(0, idx).reduce((a, b) => a + b, 0);

  headers.forEach((h, i) => text(ctx, h.toUpperCase(), colX(i) + 4, y, 7, false, COL.muted));
  y -= 6;
  page.drawLine({ start: { x: MX, y }, end: { x: PAGE_W - MX, y }, thickness: 0.7, color: COL.line });
  y -= rowH - 6;

  const maxRows = hasExtra ? 6 : 9;
  for (const row of input.history.slice(0, maxRows)) {
    if (row.current) {
      page.drawRectangle({ x: MX, y: y - 5, width: PAGE_W - 2 * MX, height: rowH, color: COL.cream });
    }
    const cells = [
      row.dateLabel + (row.current ? "  (atual)" : ""),
      row.ageLabel,
      row.weightLabel,
      row.heightLabel,
      row.bmiLabel,
      row.bmiPercentileLabel,
      "",
    ];
    cells.forEach((c, i) => {
      if (i === 6) return;
      text(ctx, c, colX(i) + 4, y, 8.5, i >= 2 || row.current);
    });
    const pal    = palette(row.color);
    const pillX  = colX(6) + 4;
    const pillTxt = row.bmiClassification;
    const pw = Math.min(widths[6] - 8, widthOf(ctx, pillTxt, 7.5) + 12);
    page.drawRectangle({ x: pillX, y: y - 4, width: pw, height: 14, color: pal.bg });
    text(ctx, pillTxt, pillX + 6, y, 7.5, false, pal.ink);
    page.drawLine({ start: { x: MX, y: y - 6 }, end: { x: PAGE_W - MX, y: y - 6 }, thickness: 0.4, color: COL.line });
    y -= rowH;
  }
  y -= 8;

  // ── Como ler · Orientações ─────────────────────────────────────────────────
  y = sectionTitle(ctx, "Como ler · Orientações", y);
  const half = (PAGE_W - 2 * MX - gap) / 2;
  const boxH = 96;
  page.drawRectangle({ x: MX, y: y - boxH, width: half, height: boxH, color: COL.cream });
  const lerLines = wrap(
    ctx,
    "O percentil compara a criança com 100 outras da mesma idade e sexo. Percentil 50 significa estar bem no meio, dentro do esperado.",
    8.5, half - 20,
  );
  lerLines.slice(0, 4).forEach((ln, i) => text(ctx, ln, MX + 10, y - 16 - i * 11, 8.5, false, COL.ink));
  let ly = y - 16 - Math.min(lerLines.length, 4) * 11 - 4;
  const legend: Array<[ChildReportColor, string]> = [
    ["green",  "Verde — dentro do padrão"],
    ["yellow", "Amarelo — atenção"],
    ["red",    "Vermelho — fora do padrão"],
  ];
  for (const [c, lab] of legend) {
    page.drawCircle({ x: MX + 13, y: ly + 3, size: 3.5, color: palette(c).dot });
    text(ctx, lab, MX + 22, ly, 8, false, COL.muted);
    ly -= 12;
  }
  const oX = MX + half + gap;
  page.drawRectangle({ x: oX, y: y - boxH, width: half, height: boxH, color: COL.white, borderColor: COL.line, borderWidth: 0.5 });
  page.drawRectangle({ x: oX, y: y - boxH, width: 3, height: boxH, color: COL.accent });
  text(ctx, "Orientações da nutricionista", oX + 12, y - 16, 9, true, COL.brandDark);
  const notes = input.clinicalNotes?.trim()
    ? input.clinicalNotes
    : "Sem observações adicionais nesta avaliação.";
  wrap(ctx, notes, 8.5, half - 24).slice(0, 5).forEach((ln, i) =>
    text(ctx, ln, oX + 12, y - 32 - i * 11, 8.5, false, COL.ink),
  );

  drawFooter(ctx, signature, input);

  // ════════════════════════════════════════════════════════════════════════════
  // PÁGINA 2 — Curvas de Crescimento (opcional)
  // ════════════════════════════════════════════════════════════════════════════
  if (input.growthCharts && input.growthCharts.length > 0) {
    const page2 = pdf.addPage([PAGE_W, PAGE_H]);
    const ctx2: Ctx = { page: page2, font, bold };

    drawHeader(ctx2, logo, input);

    let y2 = PAGE_H - BAND_H - 24;
    y2 = sectionTitle(ctx2, "Curvas de Crescimento (Referência OMS 2006)", y2);

    // Legenda de cores
    const legendDefs: Array<{ label: string; color: RGB }> = [
      { label: "P3 / P97",  color: CHART_PAL.p3      },
      { label: "P15 / P85", color: CHART_PAL.p85     },
      { label: "P50",       color: CHART_PAL.p50     },
      { label: "Paciente",  color: CHART_PAL.patient },
    ];
    let lx = MX;
    for (const item of legendDefs) {
      page2.drawRectangle({ x: lx, y: y2 - 8, width: 14, height: 3, color: item.color });
      text(ctx2, item.label, lx + 17, y2 - 5, 7, false, COL.muted);
      lx += 17 + widthOf(ctx2, item.label, 7) + 16;
    }
    y2 -= 20;

    // Gráficos em grade de 3 colunas
    for (let i = 0; i < input.growthCharts.length; i++) {
      const col      = i % CCOLS;
      const rowIdx   = Math.floor(i / CCOLS);
      const cellLeft = MX + col * CCOL_W;
      const cellTop  = y2 - rowIdx * (CCELL_H + 10);
      drawGrowthChart(ctx2, input.growthCharts[i], cellLeft, cellTop);
    }

    drawFooter(ctx2, signature, input);
  }

  return pdf.save();
}
