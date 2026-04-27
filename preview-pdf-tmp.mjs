import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync } from "fs";

// Inline the theme colors (mirroring dossier-pdf-theme.ts)
const C = {
  navy:        rgb(0.106, 0.165, 0.290),
  navyDeep:    rgb(0.063, 0.110, 0.212),
  navyLight:   rgb(0.208, 0.302, 0.498),
  sky:         rgb(0.055, 0.647, 0.914),
  skyLight:    rgb(0.816, 0.929, 0.980),
  navyOnLight: rgb(0.72,  0.79,  0.92),
  pageBg:      rgb(0.945, 0.949, 0.957),
  cardBg:      rgb(1, 1, 1),
  white:       rgb(1, 1, 1),
  cardBorder:  rgb(0.878, 0.894, 0.914),
  softBorder:  rgb(0.922, 0.933, 0.945),
  rowAlt:      rgb(0.973, 0.976, 0.984),
  textPrimary: rgb(0.098, 0.118, 0.157),
  textMuted:   rgb(0.408, 0.435, 0.490),
  textFaint:   rgb(0.612, 0.635, 0.690),
  green:       rgb(0.106, 0.475, 0.243),
  greenLight:  rgb(0.910, 0.961, 0.933),
  greenBorder: rgb(0.690, 0.886, 0.741),
  amber:       rgb(0.851, 0.467, 0.024),
  amberLight:  rgb(0.996, 0.953, 0.780),
  amberBorder: rgb(0.988, 0.824, 0.498),
  red:         rgb(0.725, 0.110, 0.110),
  redLight:    rgb(0.996, 0.886, 0.886),
  redBorder:   rgb(0.988, 0.729, 0.729),
  redStripe:   rgb(0.863, 0.149, 0.149),
  graySoft:    rgb(0.961, 0.965, 0.973),
  grayBorder:  rgb(0.878, 0.894, 0.914),
  grayInk:     rgb(0.341, 0.369, 0.439),
};

function drawText(page, text, x, topY, size, font, color) {
  page.drawText(text, { x, y: topY - size, size, font, color });
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 36;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
const page = pdf.addPage([PAGE_W, PAGE_H]);

// Page background
page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.pageBg });

// ── Header band ──
const BAND_H = 108;
const bandBottom = PAGE_H - BAND_H;
page.drawRectangle({ x: 0, y: bandBottom, width: PAGE_W, height: BAND_H, color: C.navy });
page.drawRectangle({ x: 0, y: bandBottom, width: PAGE_W, height: 3, color: C.sky });
drawText(page, "DOSSIE DE AUDITORIA", MARGIN_X, PAGE_H - 18, 7.5, fontBold, C.sky);
drawText(page, "Checklist de Seguranca Alimentar - Cozinha Industrial", MARGIN_X, PAGE_H - 32, 16, fontBold, C.white);
drawText(page, "Restaurante Central LTDA", MARGIN_X, PAGE_H - 54, 9.5, font, rgb(0.78, 0.82, 0.88));
drawText(page, "25/04/2026  |  Dr. Ana Paula Ferreira  |  CRN 1234567", MARGIN_X, PAGE_H - 68, 8, font, rgb(0.62, 0.67, 0.76));

// Score box
const scoreBoxW = 110;
const boxX = PAGE_W - MARGIN_X - scoreBoxW;
const boxH = BAND_H - 20;
const boxY = bandBottom + (BAND_H - boxH) / 2;
page.drawRectangle({ x: boxX, y: boxY, width: scoreBoxW, height: boxH, color: rgb(0.11, 0.19, 0.34), borderColor: C.green, borderWidth: 1 });
page.drawRectangle({ x: boxX, y: boxY + boxH - 4, width: scoreBoxW, height: 4, color: C.green });
const pctStr = "87%";
const pctW = fontBold.widthOfTextAtSize(pctStr, 30);
drawText(page, pctStr, boxX + (scoreBoxW - pctW) / 2, boxY + boxH - 14, 30, fontBold, C.white);
const bom = "BOM";
const bomW = fontBold.widthOfTextAtSize(bom, 8);
drawText(page, bom, boxX + (scoreBoxW - bomW) / 2, boxY + boxH - 48, 8, fontBold, C.green);
const ptStr = "52/60 pts";
const ptW = font.widthOfTextAtSize(ptStr, 7.5);
drawText(page, ptStr, boxX + (scoreBoxW - ptW) / 2, boxY + 14, 7.5, font, rgb(0.72, 0.76, 0.84));

// ── KPI Strip ──
let curY = bandBottom - 14;
const stripH = 52;
const stripTop = curY;
const stripBottom = stripTop - stripH;
const cellW = CONTENT_W / 4;
const cells = [
  { topColor: C.sky,   label: "ITENS AVALIADOS", value: "30",  sub: "2 N/A" },
  { topColor: C.green, label: "CONFORMES",        value: "22",  sub: "79%" },
  { topColor: C.red,   label: "NAO CONFORMES",    value: "6",   sub: "21%" },
  { topColor: C.green, label: "PONTUACAO",         value: "87%", sub: "52/60" },
];
for (let i = 0; i < cells.length; i++) {
  const cell = cells[i];
  const cellX = MARGIN_X + i * cellW;
  page.drawRectangle({ x: cellX, y: stripBottom, width: cellW, height: stripH, color: C.cardBg, borderColor: C.cardBorder, borderWidth: 0.5 });
  page.drawRectangle({ x: cellX, y: stripTop - 3, width: cellW, height: 3, color: cell.topColor });
  drawText(page, cell.label, cellX + 10, stripTop - 12, 6.5, fontBold, C.textFaint);
  const vSize = i === 3 ? 18 : 22;
  drawText(page, cell.value, cellX + 10, stripTop - 22, vSize, fontBold, C.textPrimary);
  const vW = fontBold.widthOfTextAtSize(cell.value, vSize);
  drawText(page, cell.sub, cellX + 10 + vW + 5, stripTop - 32, 8, font, C.textMuted);
}
curY = stripBottom - 14;

// ── Card INFORMACOES DA AUDITORIA (BAR_H = 18, FIXED) ──
const BAR_H = 18;
const padding = 12;
const items = [
  { label: "ESTABELECIMENTO", value: "Restaurante Central LTDA" },
  { label: "CHECKLIST",       value: "Seguranca Alimentar - Cozinha Industrial" },
  { label: "PROFISSIONAL",    value: "Dr. Ana Paula Ferreira" },
  { label: "CRN",             value: "1234567" },
  { label: "DATA DE EXECUCAO",value: "25/04/2026" },
];
const rowsNeeded = Math.ceil(items.length / 2);
const rowH_meta = 28;
const totalRowH = rowsNeeded * rowH_meta;
const cardH = padding * 2 + totalRowH + 8 * (rowsNeeded - 1) + BAR_H;
const cardTop = curY;
const cardBottom = cardTop - cardH;

page.drawRectangle({ x: MARGIN_X, y: cardBottom, width: CONTENT_W, height: cardH, color: C.cardBg, borderColor: C.cardBorder, borderWidth: 0.5 });
page.drawRectangle({ x: MARGIN_X, y: cardTop - BAR_H, width: CONTENT_W, height: BAR_H, color: C.navy });
drawText(page, "INFORMACOES DA AUDITORIA", MARGIN_X + 10, cardTop - 6, 6.5, fontBold, C.navyOnLight);

const colW = (CONTENT_W - padding * 2 - 10) / 2;
let cTop = cardTop - BAR_H - padding;
for (let r = 0; r < rowsNeeded; r++) {
  for (let c = 0; c < 2; c++) {
    const idx = r * 2 + c;
    if (idx >= items.length) continue;
    const x = MARGIN_X + padding + c * (colW + 10);
    drawText(page, items[idx].label, x, cTop, 7, fontBold, C.textFaint);
    drawText(page, items[idx].value, x, cTop - 10, 10, fontBold, C.textPrimary);
  }
  cTop -= rowH_meta + 8;
}
curY = cardBottom - 14;

// ── Tabela RESULTADO POR SECAO (BAR_H = 18, FIXED) ──
const ROW_H = 22;
const HEADER_H = 26;
const sections = [
  { title: "Higiene Pessoal",        items: 8, ok: 7, nc: 1, na: 0, pct: 88 },
  { title: "Armazenamento",          items: 7, ok: 5, nc: 2, na: 0, pct: 71 },
  { title: "Processamento",          items: 10, ok: 8, nc: 1, na: 1, pct: 89 },
  { title: "Equipamentos",           items: 5,  ok: 2, nc: 2, na: 1, pct: 50 },
];
const totalH = BAR_H + HEADER_H + sections.length * ROW_H + 10;
const tableTop = curY;
const tableBottom = tableTop - totalH;

page.drawRectangle({ x: MARGIN_X, y: tableBottom, width: CONTENT_W, height: totalH, color: C.cardBg, borderColor: C.cardBorder, borderWidth: 0.5 });
page.drawRectangle({ x: MARGIN_X, y: tableTop - BAR_H, width: CONTENT_W, height: BAR_H, color: C.navy });
drawText(page, "RESULTADO POR SECAO", MARGIN_X + 10, tableTop - 6, 6.5, fontBold, C.navyOnLight);

const colsTop = tableTop - BAR_H;
const colsBtm = colsTop - HEADER_H;
page.drawRectangle({ x: MARGIN_X, y: colsBtm, width: CONTENT_W, height: HEADER_H, color: C.rowAlt });

const COL_TITLE_W  = CONTENT_W * 0.42;
const COL_ITEMS_W  = CONTENT_W * 0.10;
const COL_OK_W     = CONTENT_W * 0.10;
const COL_NC_W     = CONTENT_W * 0.10;
const COL_NA_W     = CONTENT_W * 0.10;
const COL_SCORE_W  = CONTENT_W * 0.18;
const PAD_X = 8;
const colHeaders = [
  { w: COL_TITLE_W, label: "SECAO" },
  { w: COL_ITEMS_W, label: "ITENS" },
  { w: COL_OK_W,    label: "OK" },
  { w: COL_NC_W,    label: "NC" },
  { w: COL_NA_W,    label: "N/A" },
  { w: COL_SCORE_W, label: "RESULTADO" },
];
let cx = MARGIN_X + PAD_X;
for (const col of colHeaders) {
  drawText(page, col.label, cx, colsTop - (HEADER_H - 7) / 2, 7, fontBold, C.textFaint);
  cx += col.w;
}

function scoreColor(pct) {
  if (pct >= 90) return { soft: C.greenLight, border: C.greenBorder, ink: C.green, label: "EXCELENTE" };
  if (pct >= 75) return { soft: C.skyLight, border: C.sky, ink: C.navy, label: "BOM" };
  if (pct >= 50) return { soft: C.amberLight, border: C.amberBorder, ink: C.amber, label: "REGULAR" };
  return { soft: C.redLight, border: C.redBorder, ink: C.red, label: "CRITICO" };
}

let rowTop = colsBtm;
for (let i = 0; i < sections.length; i++) {
  const sec = sections[i];
  const rowBtm = rowTop - ROW_H;
  if (i % 2 === 1) {
    page.drawRectangle({ x: MARGIN_X, y: rowBtm, width: CONTENT_W, height: ROW_H, color: C.rowAlt });
  }
  page.drawLine({ start: { x: MARGIN_X, y: rowBtm }, end: { x: MARGIN_X + CONTENT_W, y: rowBtm }, thickness: 0.3, color: C.cardBorder });
  let rx = MARGIN_X + PAD_X;
  const midY = rowTop - ROW_H / 2 + 9 / 2;
  drawText(page, sec.title, rx, midY, 9, font, C.textPrimary);
  rx += COL_TITLE_W;
  const numCols = [
    { w: COL_ITEMS_W, val: String(sec.items), color: C.textPrimary },
    { w: COL_OK_W,    val: String(sec.ok),    color: C.green },
    { w: COL_NC_W,    val: String(sec.nc),    color: sec.nc > 0 ? C.red : C.textMuted },
    { w: COL_NA_W,    val: String(sec.na),    color: C.textMuted },
  ];
  for (const col of numCols) {
    const vw = fontBold.widthOfTextAtSize(col.val, 9);
    drawText(page, col.val, rx + (col.w - vw) / 2, midY, 9, fontBold, col.color);
    rx += col.w;
  }
  // Score pill
  const pal = scoreColor(sec.pct);
  const pillText = `${sec.pct}%  ${pal.label}`;
  const pillTW = fontBold.widthOfTextAtSize(pillText, 7.5);
  const pillW = Math.min(pillTW + 10, COL_SCORE_W - 6);
  const pillH = 14;
  const pillX = rx + (COL_SCORE_W - pillW) / 2;
  const pillY = rowBtm + (ROW_H - pillH) / 2;
  page.drawRectangle({ x: pillX, y: pillY, width: pillW, height: pillH, color: pal.soft, borderColor: pal.border, borderWidth: 0.5 });
  const tw = fontBold.widthOfTextAtSize(pillText, 7.5);
  drawText(page, pillText, pillX + (pillW - tw) / 2, pillY + pillH - 3, 7.5, fontBold, pal.ink);
  rowTop = rowBtm;
}
curY = tableBottom - 14;

// ── Sample Section Header ──
const sh_top = curY - 4;
const sh_btm = sh_top - 36;
const pal87 = { soft: C.skyLight, border: C.sky, ink: C.navy };
page.drawRectangle({ x: MARGIN_X, y: sh_btm, width: CONTENT_W, height: 36, color: pal87.soft, borderColor: pal87.border, borderWidth: 0.5 });
const badgeX = MARGIN_X + 10;
page.drawRectangle({ x: badgeX, y: sh_btm + 8, width: 28, height: 20, color: C.navy });
drawText(page, "01", badgeX + 8, sh_btm + 28, 10, fontBold, C.white);
drawText(page, "Higiene Pessoal", badgeX + 40, sh_top - 12, 11, fontBold, C.textPrimary);
drawText(page, "8 itens", badgeX + 40, sh_top - 26, 8, font, C.textMuted);
// Score badge
const scText = "88%  BOM";
const scBW = fontBold.widthOfTextAtSize(scText, 8) + 12;
const scBX = PAGE_W - MARGIN_X - 10 - scBW;
page.drawRectangle({ x: scBX, y: sh_btm + 10, width: scBW, height: 17, color: C.skyLight, borderColor: C.sky, borderWidth: 0.5 });
drawText(page, scText, scBX + 6, sh_btm + 27, 8, fontBold, C.navy);
curY = sh_btm - 2;

// ── Sample Item Rows ──
const itemsData = [
  { desc: "Funcionarios higienizam as maos corretamente antes de manipular alimentos", outcome: "conforme" },
  { desc: "Equipamentos de protecao individual (touca, luva, avental) em uso adequado", outcome: "conforme" },
  { desc: "Termometro calibrado e em uso para controle de temperatura dos alimentos", outcome: "nc" },
];
for (let j = 0; j < itemsData.length; j++) {
  const item = itemsData[j];
  const isNc = item.outcome === "nc";
  const rowH = 28;
  const top = curY;
  const btm = top - rowH;
  const rowBg = isNc ? C.redLight : (j % 2 === 0 ? C.cardBg : C.rowAlt);
  page.drawRectangle({ x: MARGIN_X, y: btm, width: CONTENT_W, height: rowH, color: rowBg });
  page.drawLine({ start: { x: MARGIN_X, y: btm }, end: { x: MARGIN_X + CONTENT_W, y: btm }, thickness: 0.4, color: isNc ? C.redBorder : C.cardBorder });
  const stripeColor = isNc ? C.red : (item.outcome === "conforme" ? C.green : C.grayInk);
  page.drawRectangle({ x: MARGIN_X, y: btm, width: 4, height: rowH, color: stripeColor });
  drawText(page, item.desc, MARGIN_X + 14, top - 9, 9.5, isNc ? fontBold : font, isNc ? C.red : C.textPrimary);
  const pillLabel = item.outcome === "conforme" ? "Conforme" : "Nao conforme";
  const pillW2 = fontBold.widthOfTextAtSize(pillLabel, 8) + 14;
  const pillX2 = MARGIN_X + CONTENT_W - pillW2 - 6;
  const pillY2 = btm + (rowH - 16) / 2;
  const pColor = item.outcome === "conforme" ? { soft: C.greenLight, border: C.greenBorder, ink: C.green } : { soft: C.redLight, border: C.redBorder, ink: C.red };
  page.drawRectangle({ x: pillX2, y: pillY2, width: pillW2, height: 16, color: pColor.soft, borderColor: pColor.border, borderWidth: 0.5 });
  drawText(page, pillLabel, pillX2 + 7, pillY2 + 12, 8, fontBold, pColor.ink);
  curY = btm;
}

// ── Footer ──
page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 28, color: C.pageBg });
page.drawLine({ start: { x: 0, y: 28 }, end: { x: PAGE_W, y: 28 }, thickness: 0.5, color: C.cardBorder });
page.drawText("Dr. Ana Paula Ferreira  |  CRN 1234567", { x: MARGIN_X, y: 9, size: 7.5, font, color: C.textMuted });
const centerTxt = "Documento gerado eletronicamente - NutriGestao";
const cw = font.widthOfTextAtSize(centerTxt, 7.5);
page.drawText(centerTxt, { x: (PAGE_W - cw) / 2, y: 9, size: 7.5, font, color: C.textFaint });
const pgTxt = "Pagina 1 de 1";
const pw = font.widthOfTextAtSize(pgTxt, 7.5);
page.drawText(pgTxt, { x: PAGE_W - MARGIN_X - pw, y: 9, size: 7.5, font, color: C.textMuted });

const bytes = await pdf.save();
writeFileSync("/sessions/determined-sleepy-carson/mnt/Nutricao_stratosTech/pdf-preview-v2.pdf", bytes);
console.log("PDF gerado: pdf-preview-v2.pdf");
