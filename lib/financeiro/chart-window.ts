import { parseChartMonths, type ChartPeriodMonths } from "@/lib/financeiro/chart-period";

/** Modo de janela temporal dos gráficos financeiros (URL + resolução no servidor). */
export type ChartWindowMode = "months" | "total" | "range";

export type ResolvedChartWindow =
  | { mode: "months"; months: ChartPeriodMonths }
  | { mode: "total" }
  | { mode: "range"; fromDayKey: string; toDayKey: string };

const WIN_VALUES: ChartWindowMode[] = ["months", "total", "range"];

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDayKey(s: string): boolean {
  if (!DAY_KEY_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function parseWin(raw: string | undefined): ChartWindowMode {
  const t = (raw ?? "").trim().toLowerCase();
  return WIN_VALUES.includes(t as ChartWindowMode)
    ? (t as ChartWindowMode)
    : "months";
}

/** Ordena e limita intervalo a datas civis válidas; `to` não ultrapassa `todayKey`. */
export function normalizeRangeDayKeys(
  fromRaw: string | undefined,
  toRaw: string | undefined,
  todayKeyStr: string,
): { fromDayKey: string; toDayKey: string } | null {
  const a = (fromRaw ?? "").trim();
  const b = (toRaw ?? "").trim();
  if (!isValidDayKey(a) || !isValidDayKey(b)) return null;
  let from = a <= b ? a : b;
  let to = a <= b ? b : a;
  if (from > todayKeyStr) from = todayKeyStr;
  if (to > todayKeyStr) to = todayKeyStr;
  if (from > to) return { fromDayKey: to, toDayKey: to };
  return { fromDayKey: from, toDayKey: to };
}

export type ChartQueryKeys = {
  win: string;
  m: string;
  from: string;
  to: string;
};

export const FIN_CHART_QUERY: Record<"rec" | "flux" | "atr", ChartQueryKeys> = {
  rec: { win: "win_rec", m: "m_rec", from: "from_rec", to: "to_rec" },
  flux: { win: "win_flux", m: "m_flux", from: "from_flux", to: "to_flux" },
  atr: { win: "win_atr", m: "m_atr", from: "from_atr", to: "to_atr" },
};

export function parseChartWindow(
  keys: ChartQueryKeys,
  pick: (k: string) => string | undefined,
  todayKeyStr: string,
): ResolvedChartWindow {
  const win = parseWin(pick(keys.win));
  if (win === "total") {
    return { mode: "total" };
  }
  if (win === "range") {
    const norm = normalizeRangeDayKeys(pick(keys.from), pick(keys.to), todayKeyStr);
    if (norm) {
      return {
        mode: "range",
        fromDayKey: norm.fromDayKey,
        toDayKey: norm.toDayKey,
      };
    }
    return {
      mode: "range",
      fromDayKey: todayKeyStr,
      toDayKey: todayKeyStr,
    };
  }
  return {
    mode: "months",
    months: parseChartMonths(pick(keys.m), 6),
  };
}

export function serializeChartWindow(
  keys: ChartQueryKeys,
  w: ResolvedChartWindow,
): Record<string, string> {
  if (w.mode === "months") {
    return { [keys.win]: "months", [keys.m]: String(w.months) };
  }
  if (w.mode === "total") {
    return { [keys.win]: "total" };
  }
  return {
    [keys.win]: "range",
    [keys.from]: w.fromDayKey,
    [keys.to]: w.toDayKey,
  };
}

export function chartWindowSummaryLabel(w: ResolvedChartWindow): string {
  if (w.mode === "months") {
    return `Últimos ${w.months} meses`;
  }
  if (w.mode === "total") {
    return "Total até hoje";
  }
  const fmt = (dk: string) => {
    const [y, m, d] = dk.split("-");
    if (!y || !m || !d) return dk;
    return `${d}/${m}/${y}`;
  };
  return `${fmt(w.fromDayKey)} — ${fmt(w.toDayKey)}`;
}

/** Chave YYYY-MM a partir de YYYY-MM-DD. */
export function dayKeyToMonthKey(dayKey: string): string {
  return dayKey.slice(0, 7);
}

/** Comparação lexicográfica de YYYY-MM. */
export function compareMonthKeys(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
