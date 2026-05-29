import Link from "next/link";
import { ClipboardList, TrendingUp } from "lucide-react";

import {
  GeneralEvolutionCharts,
  AnthroEvolutionCharts,
  type GeneralChartPoint,
  type AnthroChartPoint,
} from "@/components/pacientes/assessment-evolution-charts";
import { NutritionAssessmentHistoryItem } from "@/components/pacientes/nutrition-assessment-history-item";
import { GeriatricAssessmentHistoryItem } from "@/components/pacientes/geriatric-assessment-history-item";
import { NutritionAssessmentsTabs } from "@/components/pacientes/nutrition-assessments-tabs";
import { loadNutritionAssessmentsForPatient } from "@/lib/actions/nutrition-assessments";
import { loadAdultNutritionAssessmentsForPatient } from "@/lib/actions/adult-nutrition-assessments";
import { loadGeriatricAssessmentsForPatient } from "@/lib/actions/geriatric-assessments";
import {
  PATIENT_GROUP_LABELS,
  NUTRITIONAL_RISK_LABELS,
} from "@/lib/types/geriatric-assessments";
import type { AdultNutritionAssessmentRow } from "@/lib/types/adult-nutrition-assessments";
import { buttonVariants } from "@/components/ui/button-variants";
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

const legendClass =
  "text-xs font-semibold uppercase tracking-widest text-muted-foreground";

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
    row.estimated_weight_kg
      ? `PE ${fmt(row.estimated_weight_kg)} kg`
      : null,
    row.bmi ? `IMC ${fmt(row.bmi)}` : null,
    riskLabel ? riskLabel.split("—")[0].trim() : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-muted/30">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50 marker:content-none [&::-webkit-details-marker]:hidden">
          <div className="flex flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <span className="text-sm font-medium text-foreground">
              {fmtDateFull(row.recorded_at)}
            </span>
            <span className="text-xs text-muted-foreground">
              {PATIENT_GROUP_LABELS[row.patient_group]}
              {row.has_amputation ? " · Amputado" : ""}
              {summary ? ` · ${summary}` : ""}
            </span>
          </div>
          <span className="ml-2 shrink-0 text-xs text-muted-foreground transition-transform group-open:hidden">
            Ver detalhes ▾
          </span>
          <span className="ml-2 shrink-0 text-xs text-muted-foreground hidden group-open:inline">
            Fechar ▴
          </span>
        </summary>

        <div className="space-y-4 border-t border-border bg-card px-4 py-4 text-sm">
          <div>
            <p className={legendClass}>Medidas antropométricas</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              <DataItem label="CB" value={row.cb_cm != null ? `${fmt(row.cb_cm)} cm` : "–"} />
              <DataItem label="DCT" value={row.dct_mm != null ? `${fmt(row.dct_mm)} mm` : "–"} />
              <DataItem label="CMB" value={row.cmb_cm != null ? `${fmt(row.cmb_cm)} cm` : "–"} />
              <DataItem label="CP" value={row.cp_cm != null ? `${fmt(row.cp_cm)} cm` : "–"} />
              <DataItem label="AJ" value={row.aj_cm != null ? `${fmt(row.aj_cm)} cm` : "–"} />
              <DataItem label="Peso Real" value={row.weight_real_kg != null ? `${fmt(row.weight_real_kg)} kg` : "–"} />
            </dl>
          </div>

          <div>
            <p className={legendClass}>Valores calculados</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              <DataItem label="Peso Estimado" value={row.estimated_weight_kg != null ? `${fmt(row.estimated_weight_kg)} kg` : "–"} highlight />
              <DataItem label="Altura Estimada" value={row.estimated_height_m != null ? `${fmt(row.estimated_height_m, 3)} m` : "–"} />
              <DataItem label="IMC" value={row.bmi != null ? `${fmt(row.bmi)} kg/m²` : "–"} highlight />
            </dl>
          </div>

          {row.kcal_per_kg != null || row.ptn_per_kg != null ? (
            <div>
              <p className={legendClass}>Prescrição energético-proteica</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                <DataItem
                  label="Nec. Energética"
                  value={
                    row.energy_needs_kcal != null
                      ? `${Math.round(row.energy_needs_kcal).toLocaleString("pt-BR")} kcal/dia`
                      : "–"
                  }
                  highlight
                />
                <DataItem
                  label="Nec. Proteica"
                  value={row.protein_needs_g != null ? `${fmt(row.protein_needs_g, 1)} g/dia` : "–"}
                  highlight
                />
              </dl>
            </div>
          ) : null}

          {riskLabel || row.nutritional_diagnosis || row.clinical_notes ? (
            <div className="space-y-1.5">
              <p className={legendClass}>Avaliação clínica</p>
              {riskLabel ? (
                <p>
                  <span className="font-medium">Risco: </span>
                  {riskLabel}
                </p>
              ) : null}
              {row.nutritional_diagnosis ? (
                <p>
                  <span className="font-medium">Diagnóstico: </span>
                  {row.nutritional_diagnosis}
                </p>
              ) : null}
              {row.clinical_notes ? (
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {row.clinical_notes}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </details>
    </li>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {count > 0 && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {count} {count === 1 ? "registo" : "registos"}
        </span>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground py-2">
      Sem {label} registadas.{" "}
      <span className="text-foreground">Use "Realizar avaliação" para o primeiro registo.</span>
    </p>
  );
}

// ── Tab content por tipo ──────────────────────────────────────────────────────

function GeneralTabContent({
  chartData,
  rows,
}: {
  chartData: GeneralChartPoint[];
  rows: Awaited<ReturnType<typeof loadNutritionAssessmentsForPatient>>["rows"];
}) {
  return (
    <div className="space-y-6 pt-2">
      {chartData.length >= 2 && (
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <TrendingUp className="size-3.5" aria-hidden />
            Evolução
          </p>
          <GeneralEvolutionCharts data={chartData} />
        </div>
      )}

      <div>
        <SectionHeader title="Histórico" count={rows.length} />
        {rows.length === 0 ? (
          <EmptyState label="avaliações gerais" />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <NutritionAssessmentHistoryItem key={r.id} row={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AdultTabContent({
  chartData,
  rows,
}: {
  chartData: AnthroChartPoint[];
  rows: AdultNutritionAssessmentRow[];
}) {
  return (
    <div className="space-y-6 pt-2">
      {chartData.length >= 2 && (
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <TrendingUp className="size-3.5" aria-hidden />
            Evolução
          </p>
          <AnthroEvolutionCharts data={chartData} />
        </div>
      )}

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
      {chartData.length >= 2 && (
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <TrendingUp className="size-3.5" aria-hidden />
            Evolução
          </p>
          <AnthroEvolutionCharts data={chartData} />
        </div>
      )}

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

// ── Componente público ────────────────────────────────────────────────────────

export async function PatientAssessmentsBlock({
  patientId,
  isMinor = false,
}: {
  patientId: string;
  isMinor?: boolean;
}) {
  const [{ rows: generalRows }, { rows: adultRows }, { rows: geriatricRows }] =
    await Promise.all([
      loadNutritionAssessmentsForPatient(patientId),
      loadAdultNutritionAssessmentsForPatient(patientId),
      loadGeriatricAssessmentsForPatient(patientId),
    ]);

  // Rows vêm em ordem descendente; para gráficos precisamos de ascendente
  const generalAsc = [...generalRows].reverse().slice(-20);
  const adultAsc = [...adultRows].reverse().slice(-20);
  const geriatricAsc = [...geriatricRows].reverse().slice(-20);

  const generalChartData: GeneralChartPoint[] = generalAsc.map((r) => ({
    date: fmtDate(r.recorded_at),
    weight_kg: r.weight_kg != null ? Number(r.weight_kg) : null,
    waist_cm: r.waist_cm != null ? Number(r.waist_cm) : null,
  }));

  const toAnthroPoint = (r: AdultNutritionAssessmentRow): AnthroChartPoint => ({
    date: fmtDate(r.recorded_at),
    bmi: r.bmi,
    estimated_weight_kg: r.estimated_weight_kg,
    energy_needs_kcal: r.energy_needs_kcal,
    protein_needs_g: r.protein_needs_g,
  });

  const adultChartData: AnthroChartPoint[] = adultAsc.map(toAnthroPoint);
  const geriatricChartData: AnthroChartPoint[] = geriatricAsc.map(toAnthroPoint);

  return (
    <div className="space-y-4">
      {/* CTA */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/pacientes/${patientId}/avaliacao/nova`}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          <ClipboardList className="mr-1.5 size-3.5" aria-hidden />
          Realizar avaliação
        </Link>
      </div>

      {/* Tabs com gráficos + histórico */}
      <NutritionAssessmentsTabs
        showAdultTabs={!isMinor}
        generalTab={
          <GeneralTabContent chartData={generalChartData} rows={generalRows} />
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
