"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VISIT_KINDS, visitKindLabel } from "@/lib/constants/visit-kinds";
import type { TeamMemberRow } from "@/lib/types/team-members";
import type { VisitKind } from "@/lib/types/visits";
import { downloadVisitReportXlsx } from "@/lib/visits/visit-report-xlsx";
import {
  ALL_REPORT_FILTER,
  buildVisitReportClientOptions,
  filterVisitReportRows,
  groupVisitReportRows,
  parseVisitReportGroup,
  visitReportKpis,
  type VisitReportGroup,
  type VisitReportRow,
} from "@/lib/visits/visit-report";
import {
  ALL_PROFESSIONALS,
  buildVisitProfessionalOptions,
  parseProfessionalFilter,
} from "@/lib/visits/visit-professional-filter";
import { cn } from "@/lib/utils";

const GROUP_OPTIONS: { value: VisitReportGroup; label: string }[] = [
  { value: "nutri", label: "Profissional" },
  { value: "client", label: "Cliente" },
  { value: "date", label: "Data" },
  { value: "kind", label: "Atividade" },
];

type Props = {
  rows: VisitReportRow[];
  teamMembers: TeamMemberRow[];
  timeZone: string;
  defaultFromDay: string;
  defaultToDay: string;
};

function formatDay(dayKey: string): string {
  return dayKey.split("-").reverse().join("/");
}

function formatClock(isoUtc: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoUtc));
}

export function VisitReportPage({
  rows,
  teamMembers,
  timeZone,
  defaultFromDay,
  defaultToDay,
}: Props) {
  const [fromDay, setFromDay] = useState(defaultFromDay);
  const [toDay, setToDay] = useState(defaultToDay);
  const [clientKey, setClientKey] = useState(ALL_REPORT_FILTER);
  const [professionalKey, setProfessionalKey] = useState(ALL_PROFESSIONALS);
  const [kind, setKind] = useState(ALL_REPORT_FILTER);
  const [groupBy, setGroupBy] = useState<VisitReportGroup>("nutri");
  const [isExporting, setIsExporting] = useState(false);

  const professionalOptions = useMemo(
    () =>
      buildVisitProfessionalOptions(
        rows.map((row) => ({
          assigned_team_member_id: row.assigned_team_member_id,
          user_id: row.user_id,
        })),
        teamMembers,
      ),
    [rows, teamMembers],
  );

  const memberUserIdByTeamMemberId = useMemo(
    () => new Map(teamMembers.map((member) => [member.id, member.member_user_id])),
    [teamMembers],
  );

  const clientOptions = useMemo(
    () => [
      { value: ALL_REPORT_FILTER, label: "Todos os clientes" },
      ...buildVisitReportClientOptions(rows),
    ],
    [rows],
  );

  const filtered = useMemo(
    () =>
      filterVisitReportRows(
        rows,
        {
          fromDay,
          toDay,
          clientKey,
          professionalKey: parseProfessionalFilter(
            professionalKey,
            professionalOptions,
          ),
          kind,
        },
        memberUserIdByTeamMemberId,
      ),
    [
      rows,
      fromDay,
      toDay,
      clientKey,
      professionalKey,
      professionalOptions,
      kind,
      memberUserIdByTeamMemberId,
    ],
  );

  const kpis = useMemo(() => visitReportKpis(filtered), [filtered]);
  const groups = useMemo(
    () => groupVisitReportRows(filtered, groupBy),
    [filtered, groupBy],
  );

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadVisitReportXlsx({
        rows: filtered,
        groups,
        timeZone,
        fromDay,
        toDay,
        groupLabel:
          GROUP_OPTIONS.find((option) => option.value === groupBy)?.label ??
          "Profissional",
      });
    } finally {
      setIsExporting(false);
    }
  }

  const inputClass =
    "border-input bg-background mt-1 min-h-11 w-full rounded-md border px-2 text-sm";

  return (
    <PageLayout className="print:space-y-4">
      <PageHeader
        title="Relatório de visitas realizadas"
        description="Recorte, ranking e lista completa para avaliar a performance da equipe."
        back={{ href: "/visitas", label: "Agenda" }}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={isExporting || filtered.length === 0}
              className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
            >
              {isExporting ? "A exportar…" : "Exportar Excel"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
            >
              Imprimir
            </button>
          </div>
        }
      />

      <form
        className="border-border bg-card rounded-2xl border p-4 shadow-xs print:shadow-none"
        onSubmit={(event) => event.preventDefault()}
      >
        <p className="mb-3 text-sm font-semibold">Recorte da auditoria</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-muted-foreground block text-xs font-medium">
            Período
            <span className="flex gap-1">
              <input
                type="date"
                value={fromDay}
                max={toDay}
                onChange={(event) => setFromDay(event.target.value)}
                className={inputClass}
              />
              <input
                type="date"
                value={toDay}
                min={fromDay}
                onChange={(event) => setToDay(event.target.value)}
                className={inputClass}
              />
            </span>
          </label>
          <div>
            <Label htmlFor="report-client" className="text-muted-foreground text-xs">
              Cliente
            </Label>
            <Select
              value={clientKey}
              onValueChange={(value) => setClientKey(value ?? ALL_REPORT_FILTER)}
            >
              <SelectTrigger id="report-client" className="mt-1 min-h-11 w-full">
                <SelectValue>
                  {(selected) =>
                    clientOptions.find((option) => option.value === selected)?.label ??
                    "Todos os clientes"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {clientOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="report-nutri" className="text-muted-foreground text-xs">
              Profissional
            </Label>
            <Select
              value={professionalKey}
              onValueChange={(value) =>
                setProfessionalKey(parseProfessionalFilter(value, professionalOptions))
              }
            >
              <SelectTrigger id="report-nutri" className="mt-1 min-h-11 w-full">
                <SelectValue>
                  {(selected) =>
                    professionalOptions.find((option) => option.value === selected)
                      ?.label ?? "Toda a equipe"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {professionalOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="report-kind" className="text-muted-foreground text-xs">
              Atividade
            </Label>
            <Select
              value={kind}
              onValueChange={(value) => setKind(value ?? ALL_REPORT_FILTER)}
            >
              <SelectTrigger id="report-kind" className="mt-1 min-h-11 w-full">
                <SelectValue>
                  {(selected) =>
                    selected === ALL_REPORT_FILTER
                      ? "Todas as atividades"
                      : visitKindLabel[selected as VisitKind]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_REPORT_FILTER}>Todas as atividades</SelectItem>
                {VISIT_KINDS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {visitKindLabel[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFromDay(defaultFromDay);
              setToDay(defaultToDay);
              setClientKey(ALL_REPORT_FILTER);
              setProfessionalKey(ALL_PROFESSIONALS);
              setKind(ALL_REPORT_FILTER);
            }}
            className={cn(buttonVariants({ variant: "ghost" }), "min-h-11")}
          >
            Limpar
          </button>
          <p className="text-muted-foreground text-xs">
            {filtered.length} visita(s) · {formatDay(fromDay)} → {formatDay(toDay)}
          </p>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Visitas concluídas" value={kpis.completed} />
        <Kpi label="Profissionais no recorte" value={kpis.professionals} />
        <Kpi label="Clientes atendidos" value={kpis.clients} />
        <Kpi label="Atividades distintas" value={kpis.kinds} />
      </div>

      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium">Separar por</p>
        <div className="border-border bg-muted/40 inline-flex flex-wrap gap-0.5 rounded-lg border p-0.5">
          {GROUP_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGroupBy(parseVisitReportGroup(option.value))}
              className={cn(
                "min-h-9 rounded-md px-3 text-xs font-medium",
                groupBy === option.value
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {groups.length === 0 ? (
          <p className="border-border bg-card text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
            Nenhuma visita concluída neste recorte. Alargue o período ou limpe um filtro.
          </p>
        ) : (
          groups.map((group) => (
            <article
              key={group.key}
              className="border-border bg-card rounded-xl border p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">{group.label}</h2>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Performance no recorte
                  </p>
                </div>
                <div className="flex gap-4 text-right text-xs">
                  <div>
                    <p className="text-base font-bold tabular-nums">{group.visits}</p>
                    <p className="text-muted-foreground">visitas</p>
                  </div>
                  <div>
                    <p className="text-base font-bold tabular-nums">{group.clients}</p>
                    <p className="text-muted-foreground">clientes</p>
                  </div>
                  <div>
                    <p className="text-base font-bold tabular-nums">{group.kinds}</p>
                    <p className="text-muted-foreground">atividades</p>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-xs">
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Todas as visitas do recorte</h2>
          <p className="text-muted-foreground text-xs">Colunas completas para auditoria</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs font-semibold">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Hora</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Destino</th>
                <th className="px-3 py-2">Atividade</th>
                <th className="px-3 py-2">Profissional</th>
                <th className="px-3 py-2">Prioridade</th>
                <th className="px-3 py-2">Dossiê</th>
                <th className="px-3 py-2 print:hidden">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2.5 tabular-nums">{formatDay(row.dayKey)}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {formatClock(row.scheduled_start, timeZone)}
                  </td>
                  <td className="px-3 py-2.5">{row.clientLabel}</td>
                  <td className="px-3 py-2.5 font-medium">{row.targetName}</td>
                  <td className="px-3 py-2.5">{row.kindLabel}</td>
                  <td className="px-3 py-2.5">{row.professionalName}</td>
                  <td className="px-3 py-2.5">{row.priorityLabel}</td>
                  <td className="text-muted-foreground px-3 py-2.5">
                    {row.dossierStatusLabel}
                  </td>
                  <td className="px-3 py-2.5 print:hidden">
                    <Link
                      href={`/visitas/${row.id}`}
                      className="text-primary text-xs font-medium underline-offset-4 hover:underline"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Relatório no fuso {timeZone}. Só entram visitas concluídas dos últimos 12 meses.
      </p>
    </PageLayout>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border bg-card rounded-xl border p-4 shadow-xs">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
