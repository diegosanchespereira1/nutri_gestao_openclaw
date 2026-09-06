"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { VisitsMonthBarChart } from "@/components/dashboard/visits-month-bar-chart";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadVisitsPerformedXlsx } from "@/lib/dashboard/visits-performed-xlsx";
import {
  buildVisitsPerformedSeries,
  listVisitsInPerformedPeriod,
  parseVisitsPerformedPeriod,
  periodLabelForVisitsPerformed,
  visitsPerformedHasData,
  visitsPerformedHelperText,
  VISITS_PERFORMED_PERIOD_OPTIONS,
  type VisitPerformedInput,
  type VisitsPerformedPeriod,
} from "@/lib/dashboard/visits-performed";
import { todayKey } from "@/lib/datetime/calendar-tz";
import type { TeamMemberRow } from "@/lib/types/team-members";
import {
  ALL_PROFESSIONALS,
  buildVisitProfessionalOptions,
  parseProfessionalFilter,
  visitMatchesProfessionalFilter,
} from "@/lib/visits/visit-professional-filter";

type Props = {
  visits: VisitPerformedInput[];
  teamMembers: TeamMemberRow[];
  timeZone: string;
  referenceIso: string;
};

export function VisitsPerformedChartCard({
  visits,
  teamMembers,
  timeZone,
  referenceIso,
}: Props) {
  const [period, setPeriod] = useState<VisitsPerformedPeriod>("week");
  const [professionalFilter, setProfessionalFilter] = useState(ALL_PROFESSIONALS);
  const [isExporting, setIsExporting] = useState(false);
  const reference = useMemo(() => new Date(referenceIso), [referenceIso]);
  const professionalOptions = useMemo(
    () => buildVisitProfessionalOptions(visits, teamMembers),
    [visits, teamMembers],
  );
  const memberUserIdByTeamMemberId = useMemo(
    () =>
      new Map(teamMembers.map((member) => [member.id, member.member_user_id])),
    [teamMembers],
  );

  const visibleVisits = useMemo(
    () =>
      visits.filter((visit) =>
        visitMatchesProfessionalFilter(
          visit,
          professionalFilter,
          memberUserIdByTeamMemberId,
        ),
      ),
    [visits, professionalFilter, memberUserIdByTeamMemberId],
  );

  const buckets = useMemo(
    () =>
      buildVisitsPerformedSeries(visibleVisits, timeZone, period, reference),
    [visibleVisits, timeZone, period, reference],
  );
  const chartVisits = useMemo(
    () =>
      listVisitsInPerformedPeriod(visibleVisits, timeZone, period, reference),
    [visibleVisits, timeZone, period, reference],
  );
  const helper = visitsPerformedHelperText(period);
  const hasData = visitsPerformedHasData(buckets);
  const periodLabel = periodLabelForVisitsPerformed(period);
  const professionalLabel =
    professionalOptions.find((option) => option.value === professionalFilter)
      ?.label ?? "Todos os profissionais";

  async function handleExport() {
    if (!hasData || isExporting) return;
    setIsExporting(true);
    try {
      await downloadVisitsPerformedXlsx({
        visits: chartVisits,
        buckets,
        timeZone,
        periodLabel,
        professionalLabel,
        todayKey: todayKey(reference, timeZone),
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Label
            htmlFor="visitas-realizadas-periodo"
            className="text-muted-foreground whitespace-nowrap text-sm"
          >
            Período
          </Label>
          <Select
            value={period}
            onValueChange={(value) =>
              setPeriod(parseVisitsPerformedPeriod(value ?? undefined))
            }
          >
            <SelectTrigger
              id="visitas-realizadas-periodo"
              className="h-9 w-full sm:w-[12rem]"
              aria-label="Período do gráfico de visitas realizadas"
            >
              <SelectValue>
                {(selected) =>
                  VISITS_PERFORMED_PERIOD_OPTIONS.find(
                    (option) => option.value === selected,
                  )?.label ?? "Semana"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {VISITS_PERFORMED_PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>

          {professionalOptions.length > 1 ? (
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Label
              htmlFor="visitas-realizadas-profissional"
              className="text-muted-foreground whitespace-nowrap text-sm"
            >
              Profissional
            </Label>
            <Select
              value={professionalFilter}
              onValueChange={(value) =>
                setProfessionalFilter(
                  parseProfessionalFilter(value, professionalOptions),
                )
              }
            >
              <SelectTrigger
                id="visitas-realizadas-profissional"
                className="h-9 w-full sm:w-[16rem]"
                aria-label="Filtrar visitas realizadas por profissional"
              >
                <SelectValue>
                  {(selected) =>
                    professionalOptions.find((option) => option.value === selected)
                      ?.label ?? "Todos os profissionais"
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
        ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full shrink-0 sm:w-auto"
          disabled={!hasData || isExporting}
          aria-label="Exportar para Excel as visitas exibidas no gráfico"
          onClick={() => {
            void handleExport();
          }}
        >
          <Download className="size-4" aria-hidden />
          {isExporting ? "Gerando…" : "Exportar Excel"}
        </Button>
      </div>

      <p className="text-muted-foreground text-xs" role="status">
        {hasData
          ? helper
          : `${helper} Nenhuma visita realizada neste período${
              professionalFilter === ALL_PROFESSIONALS
                ? ""
                : ` para ${professionalLabel}`
            }.`}
      </p>
      <VisitsMonthBarChart data={buckets} />
    </div>
  );
}
