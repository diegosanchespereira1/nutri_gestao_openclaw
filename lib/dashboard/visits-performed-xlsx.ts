import type { VisitsPerformedBucket } from "@/lib/dashboard/visits-performed";
import type { VisitPerformedInPeriod } from "@/lib/dashboard/visits-performed";

export const VISITS_PERFORMED_XLSX_HEADERS = [
  "Data",
  "Hora",
  "Destino",
  "Tipo de destino",
  "Tipo de visita",
  "Profissional",
  "Prioridade",
  "Status",
  "Intervalo do gráfico",
] as const;

export const VISITS_PERFORMED_SUMMARY_HEADERS = [
  "Intervalo",
  "Visitas",
] as const;

function formatExportDate(isoUtc: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(isoUtc));
}

function formatExportTime(isoUtc: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoUtc));
}

function targetTypeLabel(
  targetType: VisitPerformedInPeriod["target_type"],
): string {
  if (targetType === "establishment") return "Estabelecimento";
  if (targetType === "patient") return "Paciente";
  return "—";
}

export function buildVisitsPerformedXlsxRows(
  visits: VisitPerformedInPeriod[],
  timeZone: string,
): string[][] {
  return visits.map((visit) => [
    formatExportDate(visit.scheduled_start, timeZone),
    formatExportTime(visit.scheduled_start, timeZone),
    visit.target_name?.trim() || "—",
    targetTypeLabel(visit.target_type),
    visit.visit_kind_label?.trim() || "—",
    visit.professional_label?.trim() || "—",
    visit.priority_label?.trim() || "—",
    "Concluída",
    visit.bucketLabel,
  ]);
}

export function buildVisitsPerformedSummaryRows(
  buckets: VisitsPerformedBucket[],
): (string | number)[][] {
  return buckets.map((bucket) => [bucket.label, bucket.count]);
}

export function visitsPerformedXlsxFilename(
  periodLabel: string,
  dayKey: string,
): string {
  const slug = periodLabel
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `visitas-realizadas-${slug}-${dayKey}.xlsx`;
}

export async function downloadVisitsPerformedXlsx(args: {
  visits: VisitPerformedInPeriod[];
  buckets: VisitsPerformedBucket[];
  timeZone: string;
  periodLabel: string;
  professionalLabel: string;
  todayKey: string;
}): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NutriGestão";

  const visitsSheet = workbook.addWorksheet("Visitas");
  visitsSheet.addRow([...VISITS_PERFORMED_XLSX_HEADERS]);
  visitsSheet.getRow(1).font = { bold: true };
  visitsSheet.views = [{ state: "frozen", ySplit: 1 }];
  for (const row of buildVisitsPerformedXlsxRows(args.visits, args.timeZone)) {
    visitsSheet.addRow(row);
  }
  visitsSheet.columns = [
    { width: 14 },
    { width: 8 },
    { width: 32 },
    { width: 18 },
    { width: 28 },
    { width: 28 },
    { width: 12 },
    { width: 12 },
    { width: 20 },
  ];

  const summarySheet = workbook.addWorksheet("Resumo");
  summarySheet.addRow(["Filtro", "Valor"]);
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.addRow(["Período", args.periodLabel]);
  summarySheet.addRow(["Profissional", args.professionalLabel]);
  summarySheet.addRow([]);
  summarySheet.addRow([...VISITS_PERFORMED_SUMMARY_HEADERS]);
  summarySheet.getRow(5).font = { bold: true };
  for (const row of buildVisitsPerformedSummaryRows(args.buckets)) {
    summarySheet.addRow(row);
  }
  summarySheet.columns = [{ width: 22 }, { width: 28 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = visitsPerformedXlsxFilename(args.periodLabel, args.todayKey);
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
