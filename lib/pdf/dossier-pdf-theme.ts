/**
 * Design System — NutriGestão Dossier PDF (V2)
 *
 * Centraliza todas as decisões visuais do PDF. Para mudar a identidade visual,
 * edite apenas este arquivo. Todos os tokens são importados pelo dossier-pdf.ts.
 *
 * Estrutura:
 *   PdfTheme.colors   — paleta completa (brand, status, neutros)
 *   PdfTheme.type     — escala tipográfica (tamanhos em pt)
 *   PdfTheme.space    — espaçamentos e dimensões estruturais (em pt)
 */

import { rgb } from "pdf-lib";

/* ────────────────────────────────────────────────────────────────────────────
   CORES
   ──────────────────────────────────────────────────────────────────────────── */

export const PdfColors = {

  /* ── Brand ──────────────────────────────────────────────────────────────── */

  /** Azul navy escuro — fundo do cabeçalho, badges de seção, barras de card */
  navy:         rgb(0.106, 0.165, 0.290),   // #1B2A4A
  /** Navy ainda mais escuro — captions de foto, detalhes */
  navyDeep:     rgb(0.063, 0.110, 0.212),   // #102036
  /** Navy médio — uso secundário */
  navyLight:    rgb(0.208, 0.302, 0.498),   // #354D7F
  /** Acento sky — realce, borda de logo, label eyebrow */
  sky:          rgb(0.055, 0.647, 0.914),   // #0EA5E9
  /** Sky claro — fundo de badge "Bom" */
  skyLight:     rgb(0.816, 0.929, 0.980),   // #D0EDFA
  /** Texto navy para fundo branco — rótulos dentro de caixas brand */
  navyOnLight:  rgb(0.72,  0.79,  0.92),   // ~#B8CAEB

  /* ── Página / Card ──────────────────────────────────────────────────────── */

  /** Cinza muito suave — fundo da página */
  pageBg:       rgb(0.945, 0.949, 0.957),   // #F1F2F4
  /** Branco puro — fundo de cards */
  cardBg:       rgb(1,     1,     1),
  /** Branco puro (alias) */
  white:        rgb(1,     1,     1),
  /** Borda padrão de card */
  cardBorder:   rgb(0.878, 0.894, 0.914),   // #E0E4E9
  /** Borda suave para divisores */
  softBorder:   rgb(0.922, 0.933, 0.945),   // #EBF0F1
  /** Fundo alternado de linha de tabela */
  rowAlt:       rgb(0.973, 0.976, 0.984),   // #F8F9FB

  /* ── Texto ──────────────────────────────────────────────────────────────── */

  /** Texto principal — títulos e valores */
  textPrimary:  rgb(0.098, 0.118, 0.157),   // #191E28
  /** Texto secundário — rótulos de campo */
  textMuted:    rgb(0.408, 0.435, 0.490),   // #686F7D
  /** Texto tênue — labels de colunas, captions */
  textFaint:    rgb(0.612, 0.635, 0.690),   // #9CA2B0

  /* ── Status: Verde — Conforme / Excelente ───────────────────────────────── */

  green:        rgb(0.106, 0.475, 0.243),   // #1B7A3E
  greenLight:   rgb(0.910, 0.961, 0.933),   // #E8F5EE
  greenBorder:  rgb(0.690, 0.886, 0.741),   // #B0E2BD

  /* ── Status: Âmbar — Regular ────────────────────────────────────────────── */

  amber:        rgb(0.851, 0.467, 0.024),   // #D97706
  amberLight:   rgb(0.996, 0.953, 0.780),   // #FEF3C7
  amberBorder:  rgb(0.988, 0.824, 0.498),   // #FCD27F

  /* ── Status: Vermelho — NC / Crítico ────────────────────────────────────── */

  red:          rgb(0.725, 0.110, 0.110),   // #B91C1C
  redLight:     rgb(0.996, 0.886, 0.886),   // #FEE2E2
  redBorder:    rgb(0.988, 0.729, 0.729),   // #FCBABA
  /** Faixa lateral de bloco NC */
  redStripe:    rgb(0.863, 0.149, 0.149),   // #DC2626

  /* ── Neutro / N.A. ──────────────────────────────────────────────────────── */

  graySoft:     rgb(0.961, 0.965, 0.973),
  grayBorder:   rgb(0.878, 0.894, 0.914),
  grayInk:      rgb(0.341, 0.369, 0.439),

} as const;

/* ────────────────────────────────────────────────────────────────────────────
   TIPOGRAFIA  (tamanhos em pt — Helvetica WinAnsi)
   ──────────────────────────────────────────────────────────────────────────── */

export const PdfType = {
  /** Rótulo de coluna / eyebrow de card (ex: "INFORMACOES DA AUDITORIA") */
  cardHeader:   6.5,
  /** Rótulo de campo (ex: "ESTABELECIMENTO") */
  fieldLabel:   7,
  /** Caption / rodapé */
  caption:      7.5,
  /** Texto de badge / pill */
  badge:        8,
  /** Texto corrido de anotação/nota */
  body:         9,
  /** Descrição de item de checklist */
  itemBody:     9.5,
  /** Valor de campo de metadado */
  fieldValue:   10,
  /** Título de seção (uma linha) */
  sectionTitle: 11,
  /** Título principal do checklist */
  heading:      16,
  /** Valor KPI (contagens) */
  kpiValue:     22,
  /** Pontuação geral no cabeçalho */
  scoreValue:   30,
} as const;

/* ────────────────────────────────────────────────────────────────────────────
   ESPAÇAMENTOS  (em pt — coordenadas pdf-lib)
   ──────────────────────────────────────────────────────────────────────────── */

export const PdfSpace = {
  /* Página */
  marginX:        36,    // margem horizontal (esq. e dir.)
  marginBottom:   48,    // área do rodapé reservada
  pageTopStart:   16,    // y inicial em páginas 2+

  /* Cabeçalho */
  headerBandH:   108,    // altura da banda navy full-width
  kpiStripH:      52,    // altura da faixa KPI

  /* Cards genéricos */
  cardHeaderH:    18,    // altura da barra de título navy nos cards
  cardPadding:    12,    // padding interno dos cards
  cardGap:        14,    // espaço vertical entre cards

  /* Tabela de resultado */
  tableRowH:      22,    // altura de linha de dados
  tableColHeaderH:26,    // altura da linha de cabeçalho de colunas

  /* Seções e itens */
  sectionHeaderH: 36,    // altura do cabeçalho de seção
  sectionGap:     10,    // espaço abaixo de cada seção
  itemRowMinH:    22,    // altura mínima de linha de item
  itemRowPadH:     8,    // padding vertical de linha de item

  /* Fotos */
  photoH:        140,    // altura de foto de evidência
  photoCaptionH:  18,    // altura da caption navy abaixo da foto
  photoGap:        6,    // espaço entre fotos

  /* Rodapé */
  footerH:        28,    // altura da área de rodapé
} as const;

/* ────────────────────────────────────────────────────────────────────────────
   TEMA COMPLETO  (ponto único de importação)
   ──────────────────────────────────────────────────────────────────────────── */

export const PdfTheme = {
  colors: PdfColors,
  type:   PdfType,
  space:  PdfSpace,
} as const;

export type PdfPalette = {
  soft:   (typeof PdfColors)[keyof typeof PdfColors];
  border: (typeof PdfColors)[keyof typeof PdfColors];
  ink:    (typeof PdfColors)[keyof typeof PdfColors];
};
