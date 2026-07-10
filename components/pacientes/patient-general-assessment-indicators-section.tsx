import { BarChart3 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadNutritionAssessmentsForPatient } from "@/lib/actions/nutrition-assessments";
import {
  ACTIVITY_LEVELS,
  activityLevelLabel,
} from "@/lib/constants/activity-levels";
import type { ActivityLevel } from "@/lib/constants/activity-levels";
import type { NutritionAssessmentRow } from "@/lib/types/nutrition-assessments";
import { computeBmi } from "@/lib/utils/bmi";
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

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null || !Number.isFinite(n)) return "–";
  return n.toFixed(decimals).replace(".", ",");
}

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
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        accent ? "border-primary/20 bg-primary/5" : "border-border bg-card",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/70">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums leading-none text-foreground">
        {value}
        {unit ? (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </p>
      {date ? (
        <p className="mt-1 text-[10px] text-muted-foreground">{date}</p>
      ) : null}
    </div>
  );
}

/** Sempre mostra os 5 cartões (Peso/Altura/IMC/Cintura/Atividade), com "–" para
 *  o que faltar — mesmo sem nenhum registro ainda, ou com registro incompleto
 *  (ex.: paciente criado via upload em massa, que só grava peso/altura). */
function GeneralAssessmentIndicatorGrid({
  rows,
}: {
  rows: NutritionAssessmentRow[];
}) {
  const latest = rows[0] ?? null;

  const date = latest ? fmtDate(latest.recorded_at) : undefined;
  const h = latest?.height_cm != null ? Number(latest.height_cm) : null;
  const w = latest?.weight_kg != null ? Number(latest.weight_kg) : null;
  const waist = latest?.waist_cm != null ? Number(latest.waist_cm) : null;
  const bmi = h && w ? computeBmi(h, w) : null;
  const activity =
    latest?.activity_level &&
    ACTIVITY_LEVELS.includes(latest.activity_level as ActivityLevel)
      ? activityLevelLabel[latest.activity_level as ActivityLevel]
      : null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <IndicatorCard label="Peso" value={w != null ? fmt(w, 1) : "–"} unit="kg" date={date} />
      <IndicatorCard
        label="Altura"
        value={h != null ? String(h) : "–"}
        unit="cm"
        date={date}
      />
      <IndicatorCard
        label="IMC"
        value={bmi != null ? fmt(bmi, 1) : "–"}
        unit="kg/m²"
        date={date}
        accent
      />
      <IndicatorCard
        label="Cintura"
        value={waist != null ? fmt(waist, 1) : "–"}
        unit="cm"
        date={date}
      />
      <IndicatorCard label="Atividade" value={activity ?? "–"} date={date} />
    </div>
  );
}

export async function PatientGeneralAssessmentIndicatorsSection({
  patientId,
}: {
  patientId: string;
}) {
  const { rows } = await loadNutritionAssessmentsForPatient(patientId);

  return (
    <Card aria-label="Indicadores de informações complementares">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
          <BarChart3 className="size-3.5" aria-hidden />
          Indicadores
        </CardTitle>
        <CardDescription>
          Último registro de antropometria, atividade e medidas corporais.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <GeneralAssessmentIndicatorGrid rows={rows} />
      </CardContent>
    </Card>
  );
}
