/**
 * Visão nutricional consolidada da escola — funções puras.
 *
 * Conta classificações SISVAN já gravadas na avaliação infantil mais recente
 * de cada aluno. Não recalcula percentis nem inventa rótulos.
 */

import {
  CHILD_INDICATOR_LABELS,
  CHILD_INDICATOR_SHORT,
} from "@/lib/nutrition/child/labels";
import { ageInMonths } from "@/lib/nutrition/child/age";
import type { ChildColor, ChildIndicator } from "@/lib/nutrition/child/types";
import type { ChildResultEntry } from "@/lib/types/child-assessments";

export const SCHOOL_OVERVIEW_ALL = "all";
export const SCHOOL_OVERVIEW_UNGRADED = "sem-serie";
export const SCHOOL_OVERVIEW_UNGRADED_LABEL = "Sem série definida";

export const CORE_SCHOOL_INDICATORS: readonly ChildIndicator[] = [
  "weight_for_age",
  "height_for_age",
  "bmi_for_age",
];

const OPTIONAL_SCHOOL_INDICATORS: readonly ChildIndicator[] = [
  "weight_for_height",
  "arm_circumference_for_age",
  "triceps_skinfold_for_age",
  "subscapular_skinfold_for_age",
  "head_circumference_for_age",
];

/** Ordem clínica das faixas oficiais (baixo → adequado → elevado). */
export const CLASSIFICATION_ORDER: Record<ChildIndicator, readonly string[]> = {
  weight_for_age: [
    "Peso baixo para a idade",
    "Peso adequado ou eutrófico",
    "Peso elevado para a idade",
  ],
  height_for_age: [
    "Baixa estatura para a idade",
    "Estatura adequada para a idade",
  ],
  bmi_for_age: [
    "Baixo IMC para idade",
    "IMC adequado ou eutrófico",
    "Sobrepeso",
    "Obesidade",
  ],
  weight_for_height: [
    "Peso baixo para a estatura",
    "Peso adequado ou eutrófico",
    "Peso elevado para a estatura",
  ],
  arm_circumference_for_age: [
    "CB baixa para a idade",
    "CB adequada para a idade",
    "CB elevada para a idade",
  ],
  triceps_skinfold_for_age: [
    "PCT baixa para a idade",
    "PCT adequada para a idade",
    "PCT elevada para a idade",
  ],
  subscapular_skinfold_for_age: [
    "SE baixa para a idade",
    "SE adequada para a idade",
    "SE elevada para a idade",
  ],
  head_circumference_for_age: [
    "Microcefalia",
    "PC adequado para a idade",
    "Macrocefalia",
  ],
};

export const MISSING_INDICATOR_LABEL = "Sem este indicador";

export type SchoolOverviewPatient = {
  id: string;
  schoolGradeId: string | null;
  birthDate: string | null;
};

export type SchoolOverviewGrade = {
  id: string;
  name: string;
  position: number;
};

export type SchoolOverviewBand = {
  label: string;
  count: number;
  color: ChildColor | "muted";
};

export type SchoolOverviewIndicatorBlock = {
  indicator: ChildIndicator;
  title: string;
  shortLabel: string;
  assessedWithResult: number;
  missingCount: number;
  bands: SchoolOverviewBand[];
};

export type SchoolOverviewCoverage = {
  total: number;
  assessed: number;
  withoutAssessment: number;
  coveragePercent: number | null;
  averageAgeLabel: string;
  withoutBirthDate: number;
};

export type SchoolOverviewGradeRow = {
  gradeId: string | null;
  name: string;
  filterValue: string;
  total: number;
  assessed: number;
  withoutAssessment: number;
  averageAgeLabel: string;
  withoutBirthDate: number;
};

export type SchoolNutritionOverview = {
  filter: string;
  scopeLabel: string;
  coverage: SchoolOverviewCoverage;
  indicators: SchoolOverviewIndicatorBlock[];
  gradeRows: SchoolOverviewGradeRow[];
  filterOptions: Array<{ value: string; label: string }>;
};

export function parseSchoolOverviewSerieParam(
  raw: string | undefined | null,
): string {
  const value = (raw ?? "").trim();
  if (!value || value === SCHOOL_OVERVIEW_ALL) return SCHOOL_OVERVIEW_ALL;
  return value;
}

export function schoolOverviewHref(clientId: string, filter: string): string {
  const base = `/clientes/${clientId}/visao-nutricional`;
  if (filter === SCHOOL_OVERVIEW_ALL) return base;
  return `${base}?serie=${encodeURIComponent(filter)}`;
}

export function schoolOverviewPdfHref(clientId: string, filter: string): string {
  const qs = new URLSearchParams();
  qs.set("download", "1");
  if (filter !== SCHOOL_OVERVIEW_ALL) qs.set("serie", filter);
  return `/clientes/${clientId}/visao-nutricional/pdf?${qs.toString()}`;
}

/** Interpreta `YYYY-MM-DD` (ou ISO) como data civil local. */
export function parseCivilDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatAverageAgeMonths(avgMonths: number | null): string {
  if (avgMonths == null || !Number.isFinite(avgMonths)) return "—";
  const rounded = Math.round(avgMonths);
  if (rounded < 0) return "—";
  const years = Math.floor(rounded / 12);
  const months = rounded % 12;
  if (years === 0) return months === 1 ? "1 mês" : `${months} meses`;
  const yearLabel = years === 1 ? "1 ano" : `${years} anos`;
  if (months === 0) return yearLabel;
  const monthLabel = months === 1 ? "1 mês" : `${months} meses`;
  return `${yearLabel} e ${monthLabel}`;
}

export function normalizeChildResults(raw: unknown): ChildResultEntry[] {
  if (Array.isArray(raw)) {
    return raw.filter(isResultEntry);
  }
  if (raw && typeof raw === "object") {
    return Object.values(raw).filter(isResultEntry);
  }
  return [];
}

function isResultEntry(value: unknown): value is ChildResultEntry {
  if (!value || typeof value !== "object") return false;
  const indicator = (value as { indicator?: unknown }).indicator;
  return typeof indicator === "string";
}

function hasUsableResult(entry: ChildResultEntry | undefined): boolean {
  if (!entry) return false;
  if (entry.outOfRange) return false;
  return Boolean(entry.classification?.trim());
}

function pickResult(
  results: ChildResultEntry[],
  indicator: ChildIndicator,
): ChildResultEntry | undefined {
  return results.find((row) => row.indicator === indicator);
}

function agesInMonths(
  patients: SchoolOverviewPatient[],
  now: Date,
): { months: number[]; withoutBirthDate: number } {
  const months: number[] = [];
  let withoutBirthDate = 0;
  for (const patient of patients) {
    const birth = parseCivilDate(patient.birthDate);
    if (!birth) {
      withoutBirthDate += 1;
      continue;
    }
    const age = ageInMonths(birth, now);
    if (age == null) {
      withoutBirthDate += 1;
      continue;
    }
    months.push(age);
  }
  return { months, withoutBirthDate };
}

function averageMonths(months: number[]): number | null {
  if (months.length === 0) return null;
  return months.reduce((sum, value) => sum + value, 0) / months.length;
}

function buildCoverage(
  patients: SchoolOverviewPatient[],
  assessedIds: Set<string>,
  now: Date,
): SchoolOverviewCoverage {
  const total = patients.length;
  const assessed = patients.filter((p) => assessedIds.has(p.id)).length;
  const { months, withoutBirthDate } = agesInMonths(patients, now);
  const coveragePercent =
    total === 0 ? null : Math.round((assessed / total) * 100);
  return {
    total,
    assessed,
    withoutAssessment: total - assessed,
    coveragePercent,
    averageAgeLabel: formatAverageAgeMonths(averageMonths(months)),
    withoutBirthDate,
  };
}

function bandColor(entry: ChildResultEntry | undefined): ChildColor | "muted" {
  if (entry?.color === "green" || entry?.color === "yellow" || entry?.color === "red") {
    return entry.color;
  }
  return "muted";
}

function buildIndicatorBlock(
  indicator: ChildIndicator,
  assessedPatients: Array<{ results: ChildResultEntry[] }>,
): SchoolOverviewIndicatorBlock {
  const official = CLASSIFICATION_ORDER[indicator];
  const counts = new Map<string, { count: number; color: ChildColor | "muted" }>();
  for (const label of official) {
    counts.set(label, { count: 0, color: "muted" });
  }

  let missingCount = 0;
  let assessedWithResult = 0;

  for (const patient of assessedPatients) {
    const entry = pickResult(patient.results, indicator);
    if (!hasUsableResult(entry)) {
      missingCount += 1;
      continue;
    }
    assessedWithResult += 1;
    const label = entry!.classification!.trim();
    const current = counts.get(label);
    if (current) {
      current.count += 1;
      if (current.color === "muted") current.color = bandColor(entry);
    } else {
      counts.set(label, { count: 1, color: bandColor(entry) });
    }
  }

  const known = new Set(official);
  const extraLabels = [...counts.keys()].filter((label) => !known.has(label));
  const orderedLabels = [...official, ...extraLabels];

  const bands: SchoolOverviewBand[] = orderedLabels.map((label) => {
    const row = counts.get(label) ?? { count: 0, color: "muted" as const };
    return { label, count: row.count, color: row.color };
  });

  if (missingCount > 0) {
    bands.push({
      label: MISSING_INDICATOR_LABEL,
      count: missingCount,
      color: "muted",
    });
  }

  return {
    indicator,
    title: CHILD_INDICATOR_LABELS[indicator],
    shortLabel: CHILD_INDICATOR_SHORT[indicator],
    assessedWithResult,
    missingCount,
    bands,
  };
}

function shouldShowOptional(
  indicator: ChildIndicator,
  assessedPatients: Array<{ results: ChildResultEntry[] }>,
): boolean {
  return assessedPatients.some((patient) =>
    hasUsableResult(pickResult(patient.results, indicator)),
  );
}

function patientsInFilter(
  patients: SchoolOverviewPatient[],
  filter: string,
): SchoolOverviewPatient[] {
  if (filter === SCHOOL_OVERVIEW_ALL) return patients;
  if (filter === SCHOOL_OVERVIEW_UNGRADED) {
    return patients.filter((p) => p.schoolGradeId == null);
  }
  return patients.filter((p) => p.schoolGradeId === filter);
}

export function buildSchoolNutritionOverview(input: {
  patients: SchoolOverviewPatient[];
  latestResultsByPatientId: Map<string, ChildResultEntry[]>;
  grades: SchoolOverviewGrade[];
  filter: string;
  now: Date;
}): SchoolNutritionOverview {
  const gradesById = new Map(input.grades.map((g) => [g.id, g]));
  const scoped = patientsInFilter(input.patients, input.filter);
  const assessedIds = new Set(
    [...input.latestResultsByPatientId.keys()].filter((id) =>
      scoped.some((p) => p.id === id),
    ),
  );

  const assessedPatients = scoped
    .filter((p) => assessedIds.has(p.id))
    .map((p) => ({
      results: input.latestResultsByPatientId.get(p.id) ?? [],
    }));

  const coverage = buildCoverage(scoped, assessedIds, input.now);

  const indicators: SchoolOverviewIndicatorBlock[] = [];
  for (const indicator of CORE_SCHOOL_INDICATORS) {
    indicators.push(buildIndicatorBlock(indicator, assessedPatients));
  }
  for (const indicator of OPTIONAL_SCHOOL_INDICATORS) {
    if (shouldShowOptional(indicator, assessedPatients)) {
      indicators.push(buildIndicatorBlock(indicator, assessedPatients));
    }
  }

  const ungradedPatients = input.patients.filter((p) => p.schoolGradeId == null);
  const filterOptions: Array<{ value: string; label: string }> = [
    { value: SCHOOL_OVERVIEW_ALL, label: "Escola inteira" },
    ...[...input.grades]
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "pt"))
      .filter((grade) => input.patients.some((p) => p.schoolGradeId === grade.id))
      .map((grade) => ({ value: grade.id, label: grade.name })),
  ];
  if (
    ungradedPatients.length > 0 ||
    input.filter === SCHOOL_OVERVIEW_UNGRADED
  ) {
    filterOptions.push({
      value: SCHOOL_OVERVIEW_UNGRADED,
      label: SCHOOL_OVERVIEW_UNGRADED_LABEL,
    });
  }

  const gradeRows: SchoolOverviewGradeRow[] = [];
  if (input.filter === SCHOOL_OVERVIEW_ALL) {
    for (const grade of [...input.grades].sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name, "pt"),
    )) {
      const inGrade = input.patients.filter((p) => p.schoolGradeId === grade.id);
      if (inGrade.length === 0) continue;
      const gradeAssessed = new Set(
        inGrade.filter((p) => input.latestResultsByPatientId.has(p.id)).map((p) => p.id),
      );
      const cov = buildCoverage(inGrade, gradeAssessed, input.now);
      gradeRows.push({
        gradeId: grade.id,
        name: grade.name,
        filterValue: grade.id,
        total: cov.total,
        assessed: cov.assessed,
        withoutAssessment: cov.withoutAssessment,
        averageAgeLabel: cov.averageAgeLabel,
        withoutBirthDate: cov.withoutBirthDate,
      });
    }
    if (ungradedPatients.length > 0) {
      const ungradedAssessed = new Set(
        ungradedPatients
          .filter((p) => input.latestResultsByPatientId.has(p.id))
          .map((p) => p.id),
      );
      const cov = buildCoverage(ungradedPatients, ungradedAssessed, input.now);
      gradeRows.push({
        gradeId: null,
        name: SCHOOL_OVERVIEW_UNGRADED_LABEL,
        filterValue: SCHOOL_OVERVIEW_UNGRADED,
        total: cov.total,
        assessed: cov.assessed,
        withoutAssessment: cov.withoutAssessment,
        averageAgeLabel: cov.averageAgeLabel,
        withoutBirthDate: cov.withoutBirthDate,
      });
    }
  }

  let scopeLabel = "Escola inteira";
  if (input.filter === SCHOOL_OVERVIEW_UNGRADED) {
    scopeLabel = SCHOOL_OVERVIEW_UNGRADED_LABEL;
  } else if (input.filter !== SCHOOL_OVERVIEW_ALL) {
    scopeLabel = gradesById.get(input.filter)?.name ?? "Série / turma";
  }

  return {
    filter: input.filter,
    scopeLabel,
    coverage,
    indicators,
    gradeRows,
    filterOptions,
  };
}
