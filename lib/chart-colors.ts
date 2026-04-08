/**
 * NutriGestão — Paletas de Gráficos por Contexto
 * Design System 2.0 — 2026-04-07
 *
 * Usar a paleta semântica correta para cada domínio.
 * Nunca misturar paletas (ex: COMPLIANCE_COLORS em gráficos financeiros).
 */

// ── Conformidade Regulatória ──────────────────────────────────────────────
// Para gráficos de score de conformidade, distribuição de status, etc.
export const COMPLIANCE_COLORS = {
  conforme: "#22C55E", // green-500 — conformidade ok
  alerta: "#F59E0B", // amber-500 — atenção/vencendo
  critico: "#EF4444", // red-500   — vencido/crítico
  neutro: "#94A3B8", // slate-400 — sem dados
} as const;

// ── Tendência Clínica (evolução de paciente) ──────────────────────────────
// Para gráficos de evolução antropométrica, IMC, tendências de saúde
export const CLINICAL_COLORS = {
  weight: "#136C62", // teal-600  — peso actual
  target: "#22C55E", // green-500 — meta/eutrófico
  imc: "#0EA5E9", // sky-500   — IMC
  compare: "#94A3B8", // slate-400 — período anterior (tracejado)
  area: "#136C6218", // teal-600 10% — área sob curva
} as const;

// ── Financeiro ────────────────────────────────────────────────────────────
// Para gráficos de receita, pendências, fluxo de caixa
export const FINANCIAL_COLORS = {
  receita: "#136C62", // teal-600  — receita realizada
  pendente: "#F59E0B", // amber-500 — pendente/em atraso
  vencido: "#EF4444", // red-500   — vencido
  projecao: "#94A3B8", // slate-400 — projeção (tracejado)
  area: "#136C6214", // teal 8% — preenchimento de área
} as const;

// ── Visitas / Operacional ─────────────────────────────────────────────────
// Para gráficos de visitas por mês, distribuição de status de visita
export const VISITS_COLORS = {
  realizadas: "#136C62", // teal-600 — visitas concluídas
  agendadas: "#0EA5E9", // sky-500  — agendadas
  perdidas: "#EF4444", // red-500  — não realizadas
  area: "#0EA5E920", // sky 12% — área de visitas
} as const;

// ── Paleta Genérica ───────────────────────────────────────────────────────
// Para múltiplas séries sem contexto semântico definido
export const CHART_PALETTE = [
  "#136C62", // teal-600    (primário)
  "#22C55E", // green-500
  "#0EA5E9", // sky-500
  "#F59E0B", // amber-500
  "#7C3AED", // violet-600
  "#EF4444", // red-500
  "#EC4899", // pink-500
  "#94A3B8", // slate-400
] as const;

// ── Configuração base para todos os gráficos Recharts ────────────────────
export const CHART_BASE_CONFIG = {
  isAnimationActive: false, // obrigatório — sem jitter em dashboards
  margin: { top: 8, right: 8, left: 0, bottom: 0 },
} as const;

// ── Estilos de grid e eixo padrão ─────────────────────────────────────────
export const CHART_GRID_STROKE = "hsl(168 22% 85%)"; // --border
export const CHART_AXIS_TICK = {
  fontSize: 11,
  fill: "hsl(168 14% 40%)", // --muted-foreground
} as const;

// ── Tooltip padrão ────────────────────────────────────────────────────────
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "white",
  border: "1px solid hsl(168 22% 85%)",
  borderRadius: "0.5rem",
  fontSize: "12px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.10)",
} as const;
