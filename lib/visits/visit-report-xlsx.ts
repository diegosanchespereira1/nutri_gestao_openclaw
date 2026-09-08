import type { VisitReportGroupBucket, VisitReportRow } from "@/lib/visits/visit-report";

export const VISIT_REPORT_XLSX_HEADERS = [
  "Data",
  "Hora",
  "Cliente",
  "Destino",
  "Tipo de destino",
  "Atividade",
  "Profissional",
  "Prioridade",
  "Estado",
  "Dossiê",
  "Notas",
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

export function buildVisitReportXlsxRows(
  rows: VisitReportRow[],
  timeZone: string,
): string[][] {
  return rows.map((row) => [
    formatExportDate(row.scheduled_start, timeZone),
    formatExportTime(row.scheduled_start, timeZone),
    row.clientLabel,
    row.targetName,
    row.targetType === "establishment" ? "Estabelecimento" : "Paciente",
    row.kindLabel,
    row.professionalLabel,
    row.priorityLabel,
    row.statusLabel,
    row.dossierStatusLabel,
    row.notes?.trim() || "—",
  ]);
}

export function visitReportXlsxFilename(fromDay: string, toDay: string): string {
  return `relatorio-visitas-${fromDay}-${toDay}.xlsx`;
}

export async function downloadVisitReportXlsx(args: {
  rows: VisitReportRow[];
  groups: VisitReportGroupBucket[];
  timeZone: string;
  fromDay: string;
  toDay: string;
  groupLabel: string;
}): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NutriGestão";

  const visitsSheet = workbook.addWorksheet("Visitas");
  visitsSheet.addRow([...VISIT_REPORT_XLSX_HEADERS]);
  visitsSheet.getRow(1).font = { bold: true };
  visitsSheet.views = [{ state: "frozen", ySplit: 1 }];
  for (const row of buildVisitReportXlsxRows(args.rows, args.timeZone)) {
    visitsSheet.addRow(row);
  }
  visitsSheet.columns = [
    { width: 14 },
    { width: 8 },
    { width: 28 },
    { width: 28 },
    { width: 16 },
    { width: 28 },
    { width: 28 },
    { width: 12 },
    { width: 12 },
    { width: 16 },
    { width: 36 },
  ];

  const summarySheet = workbook.addWorksheet("Resumo");
  summarySheet.addRow(["Filtro", "Valor"]);
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.addRow(["Período", `${args.fromDay} → ${args.toDay}`]);
  summarySheet.addRow(["Separar por", args.groupLabel]);
  summarySheet.addRow([]);
  summarySheet.addRow(["Grupo", "Visitas", "Clientes", "Atividades"]);
  summarySheet.getRow(5).font = { bold: true };
  for (const group of args.groups) {
    summarySheet.addRow([group.label, group.visits, group.clients, group.kinds]);
  }
  summarySheet.columns = [{ width: 28 }, { width: 14 }, { width: 14 }, { width: 14 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = visitReportXlsxFilename(args.fromDay, args.toDay);
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
