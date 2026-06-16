import { NextResponse } from "next/server";

import { loadChildAssessmentsForPatient } from "@/lib/actions/child-assessments";
import { loadPatientById } from "@/lib/actions/patients";
import { assessChild } from "@/lib/nutrition/child/assess";
import {
  CHILD_INDICATOR_LABELS,
  CHILD_INDICATOR_UNIT,
} from "@/lib/nutrition/child/labels";
import { valueForPercentile } from "@/lib/nutrition/child/percentile";
import { getReference } from "@/lib/nutrition/child/reference";
import type {
  ChildIndicator,
  ChildIndicatorResult,
  ChildSex,
} from "@/lib/nutrition/child/types";
import { foldTextForPdf } from "@/lib/pdf/dossier-pdf";
import {
  buildChildAssessmentReportPdfBytes,
  type ChildReportColor,
  type ChildReportGrowthChart,
  type ChildReportHistoryRow,
  type ChildReportIndicator,
  type GrowthCurvePoint,
} from "@/lib/pdf/child-assessment-report-pdf";
import { getProfileSignatureBytes } from "@/lib/profile/signature-sync";
import { createClient } from "@/lib/supabase/server";
import {
  fetchTenantLogoStoragePath,
  getTenantLogoSignedUrl,
} from "@/lib/tenant/logo-sync";
import type { ChildAssessmentRow } from "@/lib/types/child-assessments";

// ── Helpers locais ─────────────────────────────────────────────────────────────

function fmt(n: number | null, dec = 1): string {
  if (n == null || !Number.isFinite(n)) return "–";
  return n.toFixed(dec).replace(".", ",");
}

function num(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

function ageLabel(months: number): string {
  return `${Math.floor(months / 12)}a ${months % 12}m`;
}

function dateBR(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function initials(name: string): string {
  const parts = foldTextForPdf(name).split(" ").filter(Boolean);
  if (parts.length === 0) return "NG";
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase() || "NG";
}

function percentText(r: ChildIndicatorResult): string {
  if (r.boundary === "below_p1") return "abaixo do P1";
  if (r.boundary === "above_p99") return "acima do P99";
  if (r.percentile == null) return "—";
  return `percentil ${Math.round(r.percentile)}`;
}

function markerPercent(r: ChildIndicatorResult): number | null {
  if (r.boundary === "below_p1") return 1;
  if (r.boundary === "above_p99") return 99;
  return r.percentile;
}

function valueLabel(r: ChildIndicatorResult): string {
  const unit   = CHILD_INDICATOR_UNIT[r.indicator];
  if (r.value == null) return percentText(r);
  const prefix = r.indicator === "bmi_for_age" ? "IMC " : "";
  return `${prefix}${fmt(r.value)} ${unit} · ${percentText(r)}`;
}

function rangeLabel(r: ChildIndicatorResult): string {
  const unit = CHILD_INDICATOR_UNIT[r.indicator];
  if (r.adequateLow != null && r.adequateHigh != null) {
    return `Faixa adequada: ${fmt(r.adequateLow)}–${fmt(r.adequateHigh)} ${unit}`;
  }
  if (r.adequateLow != null) return `Esperado: a partir de ${fmt(r.adequateLow)} ${unit}`;
  return "";
}

/** Versão compacta do rangeLabel para cards estreitos (≈102pt disponíveis). */
function shortRangeLabel(r: ChildIndicatorResult | undefined): string {
  if (!r) return "";
  const unit = CHILD_INDICATOR_UNIT[r.indicator];
  if (r.adequateLow != null && r.adequateHigh != null) {
    return `${fmt(r.adequateLow)}-${fmt(r.adequateHigh)} ${unit}`;
  }
  if (r.adequateLow != null) return `>= ${fmt(r.adequateLow)} ${unit}`;
  return "";
}

function recompute(row: ChildAssessmentRow): ChildIndicatorResult[] {
  return assessChild({
    sex:                  row.sex,
    ageMonths:            row.age_months,
    weightKg:             num(row.weight_kg),
    heightCm:             num(row.height_cm),
    method:               row.classification_method,
    armCircumferenceCm:   num(row.arm_circumference_cm    ?? null),
    tricepsSkinfoldMm:    num(row.triceps_skinfold_mm     ?? null),
    subscapularSkinfoldMm:num(row.subscapular_skinfold_mm ?? null),
    headCircumferenceCm:  num(row.head_circumference_cm   ?? null),
  }).indicators;
}

function toReportIndicator(
  indicator: ChildIndicator,
  latestIndicators: ChildIndicatorResult[],
): ChildReportIndicator {
  const r = latestIndicators.find((x) => x.indicator === indicator);
  if (!r || r.classification == null || r.color == null) {
    return {
      label:      CHILD_INDICATOR_LABELS[indicator],
      status:     "Sem dados",
      color:      "yellow" as ChildReportColor,
      valueLabel: "—",
      rangeLabel: "",
      percent:    null,
    };
  }
  return {
    label:      CHILD_INDICATOR_LABELS[indicator],
    status:     r.classification,
    color:      r.color as ChildReportColor,
    valueLabel: valueLabel(r),
    rangeLabel: rangeLabel(r),
    percent:    markerPercent(r),
  };
}

// ── Curvas de crescimento ──────────────────────────────────────────────────────

function buildGrowthChart(
  indicator: ChildIndicator,
  title: string,
  unit: string,
  sex: ChildSex,
  allRows: ChildAssessmentRow[],
  getValue: (row: ChildAssessmentRow) => number | null,
): ChildReportGrowthChart | null {
  const patientHistory = allRows
    .map((r) => ({ age: r.age_months, value: getValue(r) }))
    .filter((h): h is { age: number; value: number } => h.value != null)
    .sort((a, b) => a.age - b.age);

  // Faixa etária: do menor ao maior registro do paciente, com margem de 3 meses
  const ages  = patientHistory.map((h) => h.age);
  const loAge = ages.length > 0 ? Math.max(0, Math.min(...ages) - 3) : 0;
  const hiAge = ages.length > 0 ? Math.max(...ages) + 3         : 12;

  const curvePoints: GrowthCurvePoint[] = [];
  for (let age = loAge; age <= hiAge; age++) {
    const ref = getReference(indicator, sex, age, "percentile");
    if (ref) {
      curvePoints.push({
        age,
        p3:  valueForPercentile("p3",  ref),
        p15: valueForPercentile("p15", ref),
        p50: valueForPercentile("p50", ref),
        p85: valueForPercentile("p85", ref),
        p97: valueForPercentile("p97", ref),
      });
    }
  }

  if (curvePoints.length === 0 && patientHistory.length === 0) return null;
  return { title, unit, curvePoints, patientHistory };
}

// ── Ordem dos indicadores ──────────────────────────────────────────────────────

const SUMMARY_ORDER: ChildIndicator[] = ["bmi_for_age", "weight_for_age", "height_for_age"];

/**
 * Labels abreviados para os cards compactos da página 1 (~102pt disponíveis).
 * Os labels completos de CHILD_INDICATOR_LABELS são longos demais para esses cards.
 */
const EXTRA_SHORT_LABELS: Partial<Record<ChildIndicator, string>> = {
  arm_circumference_for_age:    "CB/Idade",
  triceps_skinfold_for_age:     "PCT/Idade",
  subscapular_skinfold_for_age: "SE/Idade",
  head_circumference_for_age:   "PC/Idade",
};

const EXTRA_INDICATORS: Array<{
  indicator: ChildIndicator;
  getVal: (row: ChildAssessmentRow) => number | null;
}> = [
  { indicator: "arm_circumference_for_age",     getVal: (r) => num(r.arm_circumference_cm    ?? null) },
  { indicator: "triceps_skinfold_for_age",      getVal: (r) => num(r.triceps_skinfold_mm     ?? null) },
  { indicator: "subscapular_skinfold_for_age",  getVal: (r) => num(r.subscapular_skinfold_mm ?? null) },
  { indicator: "head_circumference_for_age",    getVal: (r) => num(r.head_circumference_cm   ?? null) },
];

const BASIC_CHARTS: Array<{
  indicator: ChildIndicator;
  getVal: (row: ChildAssessmentRow) => number | null;
}> = [
  { indicator: "weight_for_age",  getVal: (r) => num(r.weight_kg) },
  { indicator: "height_for_age",  getVal: (r) => num(r.height_cm) },
  { indicator: "bmi_for_age",     getVal: (r) => num(r.bmi) },
];

// ── Handler ────────────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const origin = new URL(req.url).origin;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent(`/pacientes/${id}/relatorio-infantil/pdf`)}`,
    );
  }

  const [{ row: patient }, { rows }, { data: profile }] = await Promise.all([
    loadPatientById(id),
    loadChildAssessmentsForPatient(id),
    supabase
      .from("profiles")
      .select("full_name, crn, signature_storage_path")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!patient) return new NextResponse("Não encontrado", { status: 404 });
  if (rows.length === 0) {
    return new NextResponse("Sem avaliações infantis para gerar o relatório.", { status: 404 });
  }

  // Logo do tenant (best-effort)
  let logoBuffer: Buffer | null = null;
  try {
    const path = await fetchTenantLogoStoragePath(supabase);
    const url  = await getTenantLogoSignedUrl(supabase, path);
    if (url) {
      const res = await fetch(url);
      if (res.ok) logoBuffer = Buffer.from(await res.arrayBuffer());
    }
  } catch {
    logoBuffer = null;
  }

  const latest          = rows[0];
  const latestIndicators = recompute(latest);
  const sex             = latest.sex as ChildSex;

  // ── Resumo principal ───────────────────────────────────────────────────────
  const summary: ChildReportIndicator[] = SUMMARY_ORDER.map((ind) =>
    toReportIndicator(ind, latestIndicators),
  );

  // ── Indicadores complementares ─────────────────────────────────────────────
  // Mostra apenas os que têm valor na avaliação mais recente.
  // Usa labels e rangeLabel curtos para caber nos cards compactos (~102pt).
  const extraSummary: ChildReportIndicator[] = EXTRA_INDICATORS
    .filter(({ getVal }) => getVal(latest) != null)
    .map(({ indicator }) => {
      const base = toReportIndicator(indicator, latestIndicators);
      const r    = latestIndicators.find((x) => x.indicator === indicator);
      return {
        ...base,
        label:      EXTRA_SHORT_LABELS[indicator] ?? base.label,
        rangeLabel: shortRangeLabel(r),
      };
    });

  // ── Histórico ──────────────────────────────────────────────────────────────
  const history: ChildReportHistoryRow[] = rows.map((row, idx) => {
    const ind  = recompute(row);
    const bmiR = ind.find((x) => x.indicator === "bmi_for_age");
    return {
      dateLabel:         dateBR(row.recorded_at),
      ageLabel:          ageLabel(row.age_months),
      weightLabel:       num(row.weight_kg) != null ? `${fmt(num(row.weight_kg))} kg` : "–",
      heightLabel:       num(row.height_cm) != null ? `${fmt(num(row.height_cm))} cm` : "–",
      bmiLabel:          fmt(num(row.bmi) ?? bmiR?.value ?? null),
      bmiPercentileLabel:bmiR ? percentText(bmiR).replace("percentil ", "P") : "—",
      bmiClassification: bmiR?.classification ?? "—",
      color:             (bmiR?.color ?? "yellow") as ChildReportColor,
      current:           idx === 0,
    };
  });

  // ── Curvas de crescimento ──────────────────────────────────────────────────
  const growthCharts: ChildReportGrowthChart[] = [];

  // Indicadores básicos (sempre incluídos)
  for (const { indicator, getVal } of BASIC_CHARTS) {
    const chart = buildGrowthChart(
      indicator,
      CHILD_INDICATOR_LABELS[indicator],
      CHILD_INDICATOR_UNIT[indicator],
      sex,
      rows,
      getVal,
    );
    if (chart) growthCharts.push(chart);
  }

  // Indicadores extras (só se houver dados em pelo menos uma avaliação)
  for (const { indicator, getVal } of EXTRA_INDICATORS) {
    const hasAny = rows.some((r) => getVal(r) != null);
    if (!hasAny) continue;
    const chart = buildGrowthChart(
      indicator,
      CHILD_INDICATOR_LABELS[indicator],
      CHILD_INDICATOR_UNIT[indicator],
      sex,
      rows,
      getVal,
    );
    if (chart) growthCharts.push(chart);
  }

  const signatureBuffer = await getProfileSignatureBytes(
    supabase,
    (profile as { signature_storage_path?: string | null } | null)?.signature_storage_path ?? null,
  );

  const { data: tenantNameRaw } = await supabase.rpc("workspace_tenant_name");
  const tenantName =
    (typeof tenantNameRaw === "string" && tenantNameRaw.trim()) ||
    String(profile?.full_name ?? "Relatório nutricional");

  const bytes = await buildChildAssessmentReportPdfBytes({
    tenantName,
    tenantInitials: initials(tenantName),
    logoBuffer,
    signatureBuffer,
    emittedAtLabel: dateBR(new Date().toISOString()),
    patient: {
      name:       patient.full_name,
      birthLabel: patient.birth_date ? dateBR(patient.birth_date) : "Não informada",
      ageLabel:   ageLabel(latest.age_months),
      sexLabel:   latest.sex === "female" ? "Feminino" : "Masculino",
    },
    summary,
    extraSummary: extraSummary.length > 0 ? extraSummary : undefined,
    history,
    professionalName: String(profile?.full_name ?? "—"),
    crn:              String(profile?.crn ?? ""),
    clinicalNotes:    latest.clinical_notes,
    growthCharts:     growthCharts.length > 0 ? growthCharts : undefined,
  });

  const slug = foldTextForPdf(patient.full_name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-nutricional-${slug || "paciente"}.pdf"`,
      "Cache-Control":       "private, no-store",
    },
  });
}
