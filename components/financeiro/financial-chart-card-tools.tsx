"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CHART_PERIOD_MONTHS,
  type ChartPeriodMonths,
} from "@/lib/financeiro/chart-period";
import {
  FIN_CHART_QUERY,
  serializeChartWindow,
  type ChartWindowMode,
  type ResolvedChartWindow,
} from "@/lib/financeiro/chart-window";
import { downloadCsv } from "@/lib/csv/download-csv";
import { cn } from "@/lib/utils";

const selectClassName =
  "border-input bg-background text-foreground focus-visible:ring-ring h-9 min-w-[9.5rem] rounded-md border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export type FinancialChartId = keyof typeof FIN_CHART_QUERY;

type Props = {
  chartId: FinancialChartId;
  window: ResolvedChartWindow;
  todayDayKey: string;
  /** Ao entrar em «intervalo», usa estes limites até o utilizador aplicar outro. */
  rangeDefaults: { fromDayKey: string; toDayKey: string };
  csvFilename: string;
  csvHeaders: string[];
  csvRows: (string | number)[][];
};

function mergeChartWindowIntoParams(
  p: URLSearchParams,
  chartId: FinancialChartId,
  w: ResolvedChartWindow,
) {
  const keys = FIN_CHART_QUERY[chartId];
  for (const k of [keys.win, keys.m, keys.from, keys.to]) {
    p.delete(k);
  }
  const ser = serializeChartWindow(keys, w);
  for (const [k, v] of Object.entries(ser)) {
    p.set(k, v);
  }
}

export function FinancialChartCardTools({
  chartId,
  window,
  todayDayKey,
  rangeDefaults,
  csvFilename,
  csvHeaders,
  csvRows,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const monthsValue: ChartPeriodMonths =
    window.mode === "months" ? window.months : 6;

  const [localFrom, setLocalFrom] = useState(
    window.mode === "range" ? window.fromDayKey : rangeDefaults.fromDayKey,
  );
  const [localTo, setLocalTo] = useState(
    window.mode === "range" ? window.toDayKey : rangeDefaults.toDayKey,
  );

  useEffect(() => {
    if (window.mode !== "range") return;
    const from = window.fromDayKey;
    const to = window.toDayKey;
    queueMicrotask(() => {
      setLocalFrom(from);
      setLocalTo(to);
    });
  }, [window]);

  function pushWindow(next: ResolvedChartWindow) {
    const p = new URLSearchParams(searchParams.toString());
    mergeChartWindowIntoParams(p, chartId, next);
    p.set("tab", "resumo");
    router.push(`${pathname}?${p.toString()}`);
  }

  function handleModeChange(mode: ChartWindowMode) {
    if (mode === "months") {
      pushWindow({ mode: "months", months: monthsValue });
      return;
    }
    if (mode === "total") {
      pushWindow({ mode: "total" });
      return;
    }
    pushWindow({
      mode: "range",
      fromDayKey: rangeDefaults.fromDayKey,
      toDayKey: rangeDefaults.toDayKey,
    });
  }

  function handleMonthsChange(n: ChartPeriodMonths) {
    pushWindow({ mode: "months", months: n });
  }

  function handleApplyRange() {
    pushWindow({
      mode: "range",
      fromDayKey: localFrom,
      toDayKey: localTo,
    });
  }

  function handleExport() {
    downloadCsv(csvFilename, csvHeaders, csvRows, ",");
  }

  const modeSelectValue: ChartWindowMode = window.mode;

  return (
    <div
      className="flex flex-col gap-3 border-border/60 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
      role="group"
      aria-label="Período e exportação do gráfico"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1.5">
          <Label
            htmlFor={`fin-chart-mode-${chartId}`}
            className="text-xs font-medium"
          >
            Tipo de período
          </Label>
          <select
            id={`fin-chart-mode-${chartId}`}
            className={selectClassName}
            value={modeSelectValue}
            onChange={(e) =>
              handleModeChange(e.target.value as ChartWindowMode)
            }
          >
            <option value="months">Últimos N meses</option>
            <option value="total">Total até hoje</option>
            <option value="range">Intervalo (datas)</option>
          </select>
        </div>

        {window.mode === "months" ? (
          <div className="space-y-1.5">
            <Label
              htmlFor={`fin-chart-m-${chartId}`}
              className="text-xs font-medium"
            >
              N.º de meses
            </Label>
            <select
              id={`fin-chart-m-${chartId}`}
              className={selectClassName}
              value={monthsValue}
              onChange={(e) =>
                handleMonthsChange(Number(e.target.value) as ChartPeriodMonths)
              }
            >
              {CHART_PERIOD_MONTHS.map((n) => (
                <option key={n} value={n}>
                  {n} meses
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {window.mode === "range" ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <Label
                htmlFor={`fin-chart-from-${chartId}`}
                className="text-xs font-medium"
              >
                Data inicial
              </Label>
              <input
                id={`fin-chart-from-${chartId}`}
                type="date"
                className={selectClassName}
                max={todayDayKey}
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor={`fin-chart-to-${chartId}`}
                className="text-xs font-medium"
              >
                Data final
              </Label>
              <input
                id={`fin-chart-to-${chartId}`}
                type="date"
                className={selectClassName}
                max={todayDayKey}
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full sm:mt-0 sm:w-auto"
              onClick={handleApplyRange}
            >
              Aplicar intervalo
            </Button>
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("w-full sm:w-auto")}
        onClick={handleExport}
      >
        Exportar CSV
      </Button>
    </div>
  );
}
