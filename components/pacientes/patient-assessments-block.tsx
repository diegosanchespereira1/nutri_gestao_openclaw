import Link from "next/link";
import { ClipboardList, TrendingUp, ChevronDown, FileDown } from "lucide-react";

import { formSectionLegendClass } from "@/components/forms/form-section";
import {
  AnthroEvolutionCharts,
  type AnthroChartPoint,
} from "@/components/pacientes/assessment-evolution-charts";
import { GeriatricAssessmentHistoryItem } from "@/components/pacientes/geriatric-assessment-history-item";
import { ChildAssessmentHistoryItem } from "@/components/pacientes/child-assessment-history-item";
import { SemestralReminder } from "@/components/pacientes/child-assessments-section";
import {
  ChildAssessmentEvolution,
  type ChildEvolutionPoint,
} from "@/components/pacientes/child-assessment-evolution";
import { NutritionAssessmentsTabs } from "@/components/pacientes/nutrition-assessments-tabs";
import { loadAdultNutritionAssessmentsForPatient } from "@/lib/actions/adult-nutrition-assessments";
import { loadGeriatricAssessmentsForPatient } from "@/lib/actions/geriatric-assessments";
import { loadChildAssessmentsForPatient } from "@/lib/actions/child-assessments";
import {
  assessmentVisibilityForCategory,
  patientAgeCategory,
} from "@/lib/pacientes/age-category";
import { CHILD_COLOR_CLASSES, CHILD_INDICATOR_UNIT } from "@/lib/nutrition/child/labels";
import type { ChildColor, ChildIndicator } from "@/lib/nutrition/child/types";
import type { ChildAssessmentRow } from "@/lib/types/child-assessments";
import {
  PATIENT_GROUP_LABELS,
  NUTRITIONAL_RISK_LABELS,
} from "@/lib/types/geriatric-assessments";
import type { AdultNutritionAssessmentRow } from "@/lib/types/adult-nutrition-assessments";
import { buttonVariants } from "@/components/ui/button-variants";
import { withReturnTo } from "@/lib/navigation/return-to";
import { cn } from "@/lib/utils";

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function fmtDateFull(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null || !Number.isFinite(n)) return "–";
  return n.toFixed(decimals).replace(".", ",");
}


function DataItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          highlight
            ? "font-mono font-semibold tabular-nums text-foreground"
            : "tabular-nums text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}

// Adultos não têm edit/delete na implementação actual — só leitura
function AdultHistoryItem({ row }: { row: AdultNutritionAssessmentRow }) {
  const riskLabel = row.nutritional_risk
    ? NUTRITIONAL_RISK_LABELS[row.nutritional_risk]
    : null;
  const summary = [
    row.estimated_weight_kg ? `PE ${fmt(row.estimated_weight_kg)} kg` : null,
    row.bmi ? `IMC ${fmt(row.bmi)}` : null,
    riskLabel ? riskLabel.split("—")[0].trim() : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-muted/30">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/50 marker:content-none [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <span className="text-sm font-medium text-foreground">
              {fmtDateFull(row.recorded_at)}
            </span>
            <span className="text-xs text-muted-foreground">
              {PATIENT_GROUP_LABELS[row.patient_group]}
              {row.has_amputation ? " · Amputado" : ""}
              {summary ? ` · ${summary}` : ""}
            </span>
          </div>
        </summary>

        <div className="space-y-4 border-t border-border bg-card px-4 py-4 text-sm">
          <div>
            <p className={formSectionLegendClass}>Medidas antropométricas</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <DataItem label="CB" value={row.cb_cm != null ? `${fmt(row.cb_cm)} cm` : "–"} />
              <DataItem label="DCT" value={row.dct_mm != null ? `${fmt(row.dct_mm)} mm` : "–"} />
              <DataItem label="CMB" value={row.cmb_cm != null ? `${fmt(row.cmb_cm)} cm` : "–"} />
              <DataItem label="CP" value={row.cp_cm != null ? `${fmt(row.cp_cm)} cm` : "–"} />
              <DataItem label="AJ" value={row.aj_cm != null ? `${fmt(row.aj_cm)} cm` : "–"} />
              <DataItem label="Peso Real" value={row.weight_real_kg != null ? `${fmt(row.weight_real_kg)} kg` : "–"} />
            </dl>
          </div>

          <div>
            <p className={formSectionLegendClass}>Valores calculados</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <DataItem label="Peso Estimado" value={row.estimated_weight_kg != null ? `${fmt(row.estimated_weight_kg)} kg` : "–"} highlight />
              <DataItem label="Altura Estimada" value={row.estimated_height_m != null ? `${fmt(row.estimated_height_m, 3)} m` : "–"} />
              <DataItem label="IMC" value={row.bmi != null ? `${fmt(row.bmi)} kg/m²` : "–"} highlight />
            </dl>
          </div>

          <div>
            <p className={formSectionLegendClass}>Prescrição energético-proteica</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              <DataItem
                label="Nec. Energética"
                value={row.energy_needs_kcal != null ? `${Math.round(row.energy_needs_kcal).toLocaleString("pt-BR")} kcal/dia` : "–"}
                highlight
              />
              <DataItem
                label="Nec. Proteica"
                value={row.protein_needs_g != null ? `${fmt(row.protein_needs_g, 1)} g/dia` : "–"}
                highlight
              />
            </dl>
          </div>

          <div className="space-y-1.5">
            <p className={formSectionLegendClass}>Avaliação clínica</p>
            {riskLabel ? (
              <p><span className="font-medium">Risco: </span>{riskLabel}</p>
            ) : <p className="text-muted-foreground">Risco: –</p>}
            {row.nutritional_diagnosis ? (
              <p><span className="font-medium">Diagnóstico: </span>{row.nutritional_diagnosis}</p>
            ) : null}
            {row.clinical_notes ? (
              <p className="whitespace-pre-wrap text-muted-foreground">{row.clinical_notes}</p>
            ) : null}
          </div>
        </div>
      </details>
    </li>
  );
}

// ── Indicadores ──────────────────────────────────────────────────────────────

function IndicatorCard({
  label,
  value,
  unit,
  date,
  accent = false,
}: {
  label: string;
  value: string;
  unit?: string;
  date?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border px-3 py-2.5",
      accent ? "border-primary/20 bg-primary/5" : "border-border bg-card",
    )}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/70">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-foreground leading-none">
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
        )}
      </p>
      {date && (
        <p className="mt-1 text-[10px] text-muted-foreground">{date}</p>
      )}
    </div>
  );
}

/** "< P1" / "> P99" / "≈ P52" / "–" — mesmo formato usado em ChildAssessmentResultCards. */
function fmtChildPercentile(r: {
  percentile: number | null;
  boundary: "below_p1" | "above_p99" | null;
}): string {
  if (r.boundary === "below_p1") return "< P1";
  if (r.boundary === "above_p99") return "> P99";
  if (r.percentile == null) return "–";
  return `≈ P${Math.round(r.percentile)}`;
}

/** "Adequado: 14,2–24,3 kg" / "Adequado: ≥ 100,6 cm" — mesmo formato usado em ChildAssessmentResultCards. */
function fmtAdequateRange(
  r: { adequateLow: number | null; adequateHigh: number | null },
  unit: string,
): string | null {
  if (r.adequateLow != null && r.adequateHigh != null) {
    return `Adequado: ${fmt(r.adequateLow, 1)}–${fmt(r.adequateHigh, 1)} ${unit}`;
  }
  if (r.adequateLow != null) {
    return `Adequado: ≥ ${fmt(r.adequateLow, 1)} ${unit}`;
  }
  return null;
}

// Card de estado nutricional infantil (com cor do semáforo + valor medido + faixa adequada).
function ChildStatusCard({
  label,
  classification,
  color,
  value,
  unit,
  percentileLabel,
  range,
  date,
}: {
  label: string;
  classification: string;
  color: ChildColor;
  value: number | null;
  unit: string;
  percentileLabel: string;
  range: string | null;
  date: string;
}) {
  return (
    <div className={cn("rounded-lg border px-3 py-2.5", CHILD_COLOR_CLASSES[color])}>
      <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold leading-tight">{classification}</p>
      <p className="mt-0.5 font-mono text-xs tabular-nums opacity-90">
        {value != null ? `${fmt(value, 1)} ${unit} · ` : ""}
        {percentileLabel}
      </p>
      {range && <p className="mt-0.5 text-[10px] leading-snug opacity-70">{range}</p>}
      <p className="mt-1 text-[10px] opacity-70">{date}</p>
    </div>
  );
}

function AssessmentIndicatorStrip({
  adultRows,
  geriatricRows,
  childRows,
  showAdult,
  showGeriatric,
  showChild,
}: {
  adultRows: AdultNutritionAssessmentRow[];
  geriatricRows: Awaited<ReturnType<typeof loadGeriatricAssessmentsForPatient>>["rows"];
  childRows: ChildAssessmentRow[];
  /** Categoria relevante para este paciente — mostra os cartões (com "–" se vazio)
   *  mesmo sem nenhuma avaliação registrada ainda, para o profissional saber o que
   *  esperar assim que fizer o primeiro registro. */
  showAdult: boolean;
  showGeriatric: boolean;
  showChild: boolean;
}) {
  const cards: React.ReactNode[] = [];

  // ── Adulto / geriátrico (peso estimado, IMC, necessidades, risco) ─────────
  if (showAdult || showGeriatric) {
    const latestAdult = adultRows[0] ?? null;
    const latestGeriatric = geriatricRows[0] ?? null;
    const latestAnthro = latestAdult ?? latestGeriatric;

    const date = latestAnthro ? fmtDate(latestAnthro.recorded_at) : undefined;
    const riskLabel = latestAnthro?.nutritional_risk
      ? NUTRITIONAL_RISK_LABELS[latestAnthro.nutritional_risk]?.split("—")[0].trim() ?? null
      : null;

    cards.push(
      <IndicatorCard
        key="pe"
        label="Peso Estimado"
        value={fmt(latestAnthro?.estimated_weight_kg)}
        unit="kg"
        date={date}
      />,
    );
    cards.push(
      <IndicatorCard key="imc-a" label="IMC" value={fmt(latestAnthro?.bmi)} unit="kg/m²" date={date} accent />,
    );
    cards.push(
      <IndicatorCard
        key="ne"
        label="Nec. Energética"
        value={
          latestAnthro?.energy_needs_kcal != null
            ? Math.round(latestAnthro.energy_needs_kcal).toLocaleString("pt-BR")
            : "–"
        }
        unit="kcal/dia"
        date={date}
      />,
    );
    cards.push(
      <IndicatorCard
        key="np"
        label="Nec. Proteica"
        value={fmt(latestAnthro?.protein_needs_g, 1)}
        unit="g/dia"
        date={date}
      />,
    );
    cards.push(
      <IndicatorCard key="risco" label="Risco Nutricional" value={riskLabel ?? "–"} date={date} accent />,
    );
  }

  // ── Estado nutricional infantil (classificação da avaliação mais recente) ──
  if (showChild) {
    const latestChild = childRows[0] ?? null;
    const order: Array<{ indicator: ChildIndicator; label: string }> = [
      { indicator: "bmi_for_age", label: "IMC / Idade" },
      { indicator: "height_for_age", label: "Estatura / Idade" },
      { indicator: "weight_for_age", label: "Peso / Idade" },
      { indicator: "weight_for_height", label: "Peso / Estatura" },
    ];

    if (latestChild) {
      const date = fmtDate(latestChild.recorded_at);
      const results = Array.isArray(latestChild.results) ? latestChild.results : [];
      for (const { indicator, label } of order) {
        const r = results.find((x) => x.indicator === indicator);
        cards.push(
          r?.classification && r.color ? (
            <ChildStatusCard
              key={`child-${indicator}`}
              label={label}
              classification={r.classification}
              color={r.color}
              value={r.value}
              unit={CHILD_INDICATOR_UNIT[indicator]}
              percentileLabel={fmtChildPercentile(r)}
              range={fmtAdequateRange(r, CHILD_INDICATOR_UNIT[indicator])}
              date={date}
            />
          ) : (
            <IndicatorCard key={`child-${indicator}`} label={label} value="–" date={date} />
          ),
        );
      }
    } else {
      for (const { indicator, label } of order) {
        cards.push(<IndicatorCard key={`child-${indicator}`} label={label} value="–" />);
      }
    }
  }

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {cards}
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {count > 0 && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {count} {count === 1 ? "registro" : "registros"}
        </span>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground py-2">
      Sem {label} registradas.{" "}
      <span className="text-foreground">
        Use &quot;Realizar avaliação&quot; para o primeiro registro.
      </span>
    </p>
  );
}

// ── Tab content por tipo ──────────────────────────────────────────────────────

function AdultTabContent({
  chartData,
  rows,
}: {
  chartData: AnthroChartPoint[];
  rows: AdultNutritionAssessmentRow[];
}) {
  return (
    <div className="space-y-6 pt-2">
      <div>
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-foreground/70">
          <TrendingUp className="size-3.5" aria-hidden />
          Evolução
        </p>
        <AnthroEvolutionCharts data={chartData} />
      </div>

      <div>
        <SectionHeader title="Histórico" count={rows.length} />
        {rows.length === 0 ? (
          <EmptyState label="avaliações de adultos" />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <AdultHistoryItem key={r.id} row={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function GeriatricTabContent({
  chartData,
  rows,
}: {
  chartData: AnthroChartPoint[];
  rows: Awaited<ReturnType<typeof loadGeriatricAssessmentsForPatient>>["rows"];
}) {
  return (
    <div className="space-y-6 pt-2">
      <div>
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-foreground/70">
          <TrendingUp className="size-3.5" aria-hidden />
          Evolução
        </p>
        <AnthroEvolutionCharts data={chartData} />
      </div>

      <div>
        <SectionHeader title="Histórico" count={rows.length} />
        {rows.length === 0 ? (
          <EmptyState label="avaliações geriátricas" />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <GeriatricAssessmentHistoryItem key={r.id} row={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ChildTabContent({
  patientId,
  chartData,
  rows,
}: {
  patientId: string;
  chartData: ChildEvolutionPoint[];
  rows: ChildAssessmentRow[];
}) {
  return (
    <div className="space-y-6 pt-2">
      <SemestralReminder lastRecordedAt={rows[0]?.recorded_at ?? null} />

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/pacientes/${patientId}/relatorio-infantil/pdf`}
            download
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            <FileDown className="mr-1.5 size-3.5" aria-hidden />
            Baixar relatório (PDF)
          </a>
          <span className="text-xs text-muted-foreground">
            Relatório para enviar ao paciente, com a marca da sua clínica.
          </span>
        </div>
      )}

      <div>
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-foreground/70">
          <TrendingUp className="size-3.5" aria-hidden />
          Evolução (percentil por indicador)
        </p>
        <ChildAssessmentEvolution data={chartData} />
      </div>

      <div>
        <SectionHeader title="Histórico" count={rows.length} />
        {rows.length === 0 ? (
          <EmptyState label="avaliações infantis" />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <ChildAssessmentHistoryItem key={r.id} row={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Componente público ────────────────────────────────────────────────────────

export async function PatientAssessmentsBlock({
  patientId,
  birthDate = null,
  returnToOrigin,
}: {
  patientId: string;
  birthDate?: string | null;
  returnToOrigin: string;
}) {
  const [
    { rows: adultRows },
    { rows: geriatricRows },
    { rows: childRows },
  ] = await Promise.all([
    loadAdultNutritionAssessmentsForPatient(patientId),
    loadGeriatricAssessmentsForPatient(patientId),
    loadChildAssessmentsForPatient(patientId),
  ]);

  const adultAsc = [...adultRows].reverse().slice(-20);
  const geriatricAsc = [...geriatricRows].reverse().slice(-20);

  const toAnthroPoint = (r: AdultNutritionAssessmentRow): AnthroChartPoint => ({
    date: fmtDate(r.recorded_at),
    bmi: r.bmi,
    estimated_weight_kg: r.estimated_weight_kg,
    energy_needs_kcal: r.energy_needs_kcal,
    protein_needs_g: r.protein_needs_g,
  });

  const adultChartData: AnthroChartPoint[] = adultAsc.map(toAnthroPoint);
  const geriatricChartData: AnthroChartPoint[] = geriatricAsc.map(toAnthroPoint);

  const childAsc = [...childRows].reverse().slice(-20);
  const childChartData: ChildEvolutionPoint[] = childAsc.map((r) => {
    const byIndicator = (indicator: string) =>
      (Array.isArray(r.results) ? r.results : []).find(
        (i) => i.indicator === indicator,
      )?.percentile ?? null;
    return {
      date: fmtDate(r.recorded_at),
      weight_for_age: byIndicator("weight_for_age"),
      height_for_age: byIndicator("height_for_age"),
      bmi_for_age: byIndicator("bmi_for_age"),
    };
  });
  // Visibilidade por categoria etária; no prontuário também exibimos a aba se
  // houver histórico daquele tipo (para não esconder registos anteriores).
  const vis = assessmentVisibilityForCategory(patientAgeCategory(birthDate));
  const showChildTab = vis.showChild || childRows.length > 0;
  const showAdultTab = vis.showAdult || adultRows.length > 0;
  const showGeriatricTab = vis.showGeriatric || geriatricRows.length > 0;

  if (!showChildTab && !showAdultTab && !showGeriatricTab) {
    return (
      <p className="text-sm text-muted-foreground">
        Não há avaliações especializadas para a faixa etária deste paciente.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={withReturnTo(
            `/pacientes/${patientId}/avaliacao/nova`,
            returnToOrigin,
          )}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          <ClipboardList className="mr-1.5 size-3.5" aria-hidden />
          Realizar avaliação especializada
        </Link>
      </div>

      <AssessmentIndicatorStrip
        adultRows={adultRows}
        geriatricRows={geriatricRows}
        childRows={childRows}
        showAdult={showAdultTab}
        showGeriatric={showGeriatricTab}
        showChild={showChildTab}
      />

      <NutritionAssessmentsTabs
        showGeneral={false}
        showChild={showChildTab}
        showAdult={showAdultTab}
        showGeriatric={showGeriatricTab}
        childTab={
          <ChildTabContent
            patientId={patientId}
            chartData={childChartData}
            rows={childRows}
          />
        }
        adultTab={
          <AdultTabContent chartData={adultChartData} rows={adultRows} />
        }
        geriatricTab={
          <GeriatricTabContent chartData={geriatricChartData} rows={geriatricRows} />
        }
      />
    </div>
  );
}
