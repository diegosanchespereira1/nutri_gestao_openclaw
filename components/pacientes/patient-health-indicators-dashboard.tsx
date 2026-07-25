"use client";

import {
  ArrowLeft,
  ClipboardList,
  FileDown,
  Info,
  Pencil,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { ClientAvatar } from "@/components/clientes/client-avatar";
import { HealthIndicatorKpiCard } from "@/components/pacientes/health-indicator-kpi-card";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CHILD_HEALTH_INDICATOR_SECTIONS,
  HEALTH_INDICATOR_SECTIONS,
  categorySeriesFromRows,
  childRowsWithNumericFields,
  deltaFromCategories,
  deltaFromSeries,
  formatAssessmentShortDate,
  numericSeriesFromRows,
  sliceLastN,
  type HealthIndicatorSection,
} from "@/lib/pacientes/health-indicator-series";
import type { AdultNutritionAssessmentRow } from "@/lib/types/adult-nutrition-assessments";
import type { ChildAssessmentRow } from "@/lib/types/child-assessments";
import {
  NUTRITIONAL_RISK_LABELS,
  PATIENT_GROUP_LABELS,
} from "@/lib/types/geriatric-assessments";
import { cn } from "@/lib/utils";

type PeriodValue = "3" | "4" | "6" | "all";

const PERIOD_OPTIONS: Array<{ value: PeriodValue; label: string }> = [
  { value: "3", label: "Últimas 3" },
  { value: "4", label: "Últimas 4" },
  { value: "6", label: "Últimas 6" },
  { value: "all", label: "Todas" },
];

type EffectiveMode = "adult" | "geriatric" | "child";

const MODE_LABEL: Record<EffectiveMode, string> = {
  adult: "Avaliação adultos",
  geriatric: "Avaliação idosos",
  child: "Avaliação infantil",
};

export type PatientHealthIndicatorsDashboardProps = {
  patientName: string;
  patientSubtitle: string;
  photoUrl: string | null;
  /** Avaliações de adulto/idoso, ordenadas da mais antiga para a mais recente. */
  rowsAsc: AdultNutritionAssessmentRow[];
  mode: "adult" | "geriatric";
  novaAvaliacaoHref: string;
  backHref: string;
  backLabel?: string;
  editarHref?: string;
  /** Rota GET que gera o PDF do relatório de indicadores. */
  exportPdfHref: string;
  /** Avaliações infantis (paciente criança) — quando presente, substitui a visão adulto/idoso. */
  childRows?: ChildAssessmentRow[];
  /**
   * Quando true, omite identidade/navegação do paciente (já renderizada fora)
   * e mostra só controles de período, dica e gráficos.
   */
  embedded?: boolean;
};

function BadgePill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "muted";
  children: ReactNode;
}) {
  const toneClass: Record<typeof tone, string> = {
    ok: "border-primary/20 bg-primary/10 text-primary",
    warn: "border-amber-200 bg-amber-50 text-amber-700",
    muted: "border-border bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClass[tone],
      )}
    >
      {children}
    </span>
  );
}

function IndicatorSectionCard<TRow extends { recorded_at: string }>({
  section,
  rowsVisible,
}: {
  section: HealthIndicatorSection<TRow>;
  rowsVisible: TRow[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/70 pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
          <p className="text-sm text-muted-foreground">{section.subtitle}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {section.indicators.length} indicadores
        </span>
      </div>
      <div
        className={cn(
          "mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2",
          section.cols ?? "xl:grid-cols-3",
        )}
      >
        {section.indicators.map((def) => {
          if (def.categorical) {
            const series = categorySeriesFromRows(rowsVisible, def);
            return (
              <HealthIndicatorKpiCard
                key={def.id}
                kind="categorical"
                label={def.label}
                code={def.code}
                tip={def.tip}
                note={def.note}
                highlight={def.highlight}
                series={series}
                colorForCategory={def.colorForCategory}
                delta={deltaFromCategories(series.map((point) => point.category))}
              />
            );
          }
          const series = numericSeriesFromRows(rowsVisible, def);
          return (
            <HealthIndicatorKpiCard
              key={def.id}
              kind="numeric"
              label={def.label}
              code={def.code}
              tip={def.tip}
              note={def.note}
              highlight={def.highlight}
              series={series}
              unit={def.unit}
              decimals={def.decimals}
              asInt={def.asInt}
              delta={deltaFromSeries(series.map((point) => point.value))}
            />
          );
        })}
      </div>
    </section>
  );
}

function EmptyIndicatorsState({ novaAvaliacaoHref }: { novaAvaliacaoHref: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">
        Nenhuma avaliação registrada ainda.
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Registre a primeira avaliação especializada para começar a acompanhar a
        evolução deste paciente.
      </p>
      <Link
        href={novaAvaliacaoHref}
        className={cn(buttonVariants({ size: "sm" }), "mt-4")}
      >
        <Plus className="mr-1.5 size-3.5" aria-hidden />
        Realizar avaliação
      </Link>
    </div>
  );
}

export function PatientHealthIndicatorsDashboard({
  patientName,
  patientSubtitle,
  photoUrl,
  rowsAsc,
  mode,
  novaAvaliacaoHref,
  backHref,
  backLabel = "Voltar",
  editarHref,
  exportPdfHref,
  childRows,
  embedded = false,
}: PatientHealthIndicatorsDashboardProps) {
  const [period, setPeriod] = useState<PeriodValue>("6");

  const effectiveMode: EffectiveMode = childRows ? "child" : mode;
  const periodN = period === "all" ? "all" : Number(period);

  const visibleAnthroRows = useMemo(
    () => sliceLastN(rowsAsc, periodN),
    [rowsAsc, periodN],
  );
  const visibleChildRows = useMemo(
    () => sliceLastN(childRowsWithNumericFields(childRows ?? []), periodN),
    [childRows, periodN],
  );

  const isChildMode = effectiveMode === "child";
  const visibleRowsForDates = isChildMode ? visibleChildRows : visibleAnthroRows;
  const hasAnyData = isChildMode ? (childRows ?? []).length > 0 : rowsAsc.length > 0;

  const latestAnthroRow = rowsAsc[rowsAsc.length - 1] ?? null;
  const riskLabel = latestAnthroRow?.nutritional_risk
    ? NUTRITIONAL_RISK_LABELS[latestAnthroRow.nutritional_risk]
    : null;
  const groupLabel =
    !isChildMode && latestAnthroRow ? PATIENT_GROUP_LABELS[latestAnthroRow.patient_group] : null;

  const subtitleParts = [patientSubtitle, groupLabel, MODE_LABEL[effectiveMode]].filter(
    (part): part is string => Boolean(part),
  );

  const legendDates = visibleRowsForDates
    .map((row) => formatAssessmentShortDate(row.recorded_at))
    .join(" → ");

  const periodControls = (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <div className="flex items-center gap-2">
        <Label
          htmlFor="indicadores-periodo"
          className="whitespace-nowrap text-sm text-muted-foreground"
        >
          Período
        </Label>
        <Select value={period} onValueChange={(value) => setPeriod(value as PeriodValue)}>
          <SelectTrigger id="indicadores-periodo" className="h-9 w-[10.5rem]">
            <SelectValue>
              {(selected) =>
                PERIOD_OPTIONS.find((option) => option.value === selected)?.label ?? "—"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <a
        href={exportPdfHref}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
      >
        <FileDown className="size-3.5" aria-hidden />
        Exportar relatório
      </a>

      {!embedded ? (
        <Link href={novaAvaliacaoHref} className={cn(buttonVariants({ size: "sm" }))}>
          <ClipboardList className="mr-1.5 size-3.5" aria-hidden />
          Nova avaliação
        </Link>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap gap-2 print:hidden">
              <Link
                href={backHref}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                {backLabel}
              </Link>
              {editarHref ? (
                <Link
                  href={editarHref}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <Pencil className="size-3.5" aria-hidden />
                  Editar dados
                </Link>
              ) : null}
            </div>

            <div className="flex min-w-0 items-center gap-4">
              <ClientAvatar
                name={patientName}
                imageUrl={photoUrl}
                size="lg"
                className="rounded-full"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Indicadores de saúde
                </p>
                <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {patientName}
                </h1>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {subtitleParts.join(" · ")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {riskLabel ? (
                <BadgePill tone={latestAnthroRow?.nutritional_risk === "c_rn" ? "warn" : "ok"}>
                  {riskLabel}
                </BadgePill>
              ) : null}
              <BadgePill tone="muted">
                {hasAnyData
                  ? `${visibleRowsForDates.length} avaliações no gráfico`
                  : "Sem avaliações"}
              </BadgePill>
            </div>
          </div>

          {periodControls}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {riskLabel ? (
              <BadgePill tone={latestAnthroRow?.nutritional_risk === "c_rn" ? "warn" : "ok"}>
                {riskLabel}
              </BadgePill>
            ) : null}
            <BadgePill tone="muted">
              {hasAnyData
                ? `${visibleRowsForDates.length} avaliações no gráfico`
                : "Sem avaliações"}
            </BadgePill>
          </div>
          {periodControls}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-3 text-xs text-muted-foreground print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <Info className="size-3.5 text-primary" aria-hidden />
            Acompanhamento dinâmico
          </span>
          <span>Passe o mouse no gráfico para ver valor e data da avaliação</span>
          <span>Altere o período acima — os gráficos se atualizam</span>
        </div>
        {legendDates ? (
          <span className="font-medium text-foreground">{legendDates}</span>
        ) : null}
      </div>

      {!hasAnyData ? (
        <EmptyIndicatorsState novaAvaliacaoHref={novaAvaliacaoHref} />
      ) : isChildMode ? (
        <div className="space-y-6">
          {CHILD_HEALTH_INDICATOR_SECTIONS.map((section) => (
            <IndicatorSectionCard
              key={section.id}
              section={section}
              rowsVisible={visibleChildRows}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {HEALTH_INDICATOR_SECTIONS.map((section) => (
            <IndicatorSectionCard
              key={section.id}
              section={section}
              rowsVisible={visibleAnthroRows}
            />
          ))}
        </div>
      )}
    </div>
  );
}
