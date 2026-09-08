"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { ClientSchoolSectionTabNav } from "@/components/clientes/client-school-section-tab-nav";
import { SchoolNutritionOverviewActions } from "@/components/clientes/school-nutrition-overview-actions";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SCHOOL_OVERVIEW_ALL,
  schoolOverviewHref,
  type SchoolNutritionOverview,
} from "@/lib/nutrition/child/school-overview";
import { CHILD_COLOR_CLASSES } from "@/lib/nutrition/child/labels";
import { cn } from "@/lib/utils";

type Props = {
  clientId: string;
  clientName: string;
  patientsHref: string | null;
  overview: SchoolNutritionOverview;
  back: { href: string; label: string };
};

function CoverageCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card size="sm" className="min-w-0">
      <CardContent className="space-y-1 pt-1">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function bandClass(color: "green" | "yellow" | "red" | "muted"): string {
  if (color === "muted") {
    return "border-border bg-muted text-muted-foreground";
  }
  return CHILD_COLOR_CLASSES[color];
}

function barColor(color: "green" | "yellow" | "red" | "muted"): string {
  if (color === "green") return "bg-emerald-500";
  if (color === "yellow") return "bg-amber-500";
  if (color === "red") return "bg-red-500";
  return "bg-muted-foreground/40";
}

export function SchoolNutritionOverviewView({
  clientId,
  clientName,
  patientsHref,
  overview,
  back,
}: Props) {
  const router = useRouter();
  const cov = overview.coverage;
  const studentsLabel =
    overview.filter === SCHOOL_OVERVIEW_ALL ? "Alunos na escola" : "Alunos na turma";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão nutricional da escola"
        description={`Avaliação mais recente de cada aluno · ${clientName}${overview.filter === SCHOOL_OVERVIEW_ALL ? "" : ` · ${overview.scopeLabel}`}`}
        back={back}
        actions={
          <SchoolNutritionOverviewActions clientId={clientId} filter={overview.filter} />
        }
      />
      <ClientSchoolSectionTabNav
        clientId={clientId}
        pacientesHref={patientsHref}
        active="nutricional"
      />

      {cov.total === 0 ? (
        <EmptyState
          icon={Users}
          title="Ainda não há alunos nesta escola."
          description="Cadastre os pacientes da escola para ver a cobertura e os indicadores consolidados."
          action={
            patientsHref ? (
              <Link
                href={patientsHref}
                className={cn(buttonVariants({ variant: "default" }), "min-h-11")}
              >
                Ver pacientes
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <div className="print:hidden max-w-sm space-y-1.5">
            <Label htmlFor="school-overview-serie">Série / turma</Label>
            <Select
              value={overview.filter}
              onValueChange={(value) => {
                if (!value) return;
                router.push(schoolOverviewHref(clientId, value));
              }}
            >
              <SelectTrigger id="school-overview-serie" className="min-h-11 w-full">
                <SelectValue>
                  {(selected) =>
                    overview.filterOptions.find((option) => option.value === selected)
                      ?.label ?? "Escola inteira"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {overview.filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <section aria-label="Cobertura da avaliação" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <CoverageCard label={studentsLabel} value={String(cov.total)} />
            <CoverageCard
              label="Avaliados"
              value={String(cov.assessed)}
              hint={
                cov.coveragePercent != null ? `${cov.coveragePercent}% avaliados` : undefined
              }
            />
            <CoverageCard label="Sem avaliação" value={String(cov.withoutAssessment)} />
            <CoverageCard
              label="Média de idade"
              value={cov.averageAgeLabel}
              hint={
                cov.withoutBirthDate > 0
                  ? `sem data de nascimento: ${cov.withoutBirthDate}`
                  : undefined
              }
            />
          </section>

          {cov.assessed === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma avaliação registada. Os totais acima já mostram quem falta.
            </p>
          ) : (
            <section
              aria-label="Indicadores nutricionais"
              className="grid grid-cols-1 gap-4 lg:grid-cols-2"
            >
              {overview.indicators.map((block) => {
                const total = block.bands.reduce((sum, b) => sum + b.count, 0);
                return (
                  <Card key={block.indicator} className="break-inside-avoid">
                    <CardHeader className="pb-0">
                      <CardTitle>
                        {block.title}{" "}
                        <span className="text-muted-foreground font-normal">
                          · {block.shortLabel}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div
                        className="bg-muted flex h-2.5 overflow-hidden rounded-full"
                        aria-hidden
                      >
                        {total > 0
                          ? block.bands
                              .filter((b) => b.count > 0)
                              .map((band) => (
                                <span
                                  key={band.label}
                                  className={cn("h-full", barColor(band.color))}
                                  style={{ width: `${(band.count / total) * 100}%` }}
                                />
                              ))
                          : null}
                      </div>
                      <ul className="space-y-1.5">
                        {block.bands.map((band) => (
                          <li
                            key={band.label}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className={cn(
                                  "size-2.5 shrink-0 rounded-sm border",
                                  bandClass(band.color),
                                )}
                                aria-hidden
                              />
                              <span className="truncate">{band.label}</span>
                            </span>
                            <span className="tabular-nums font-medium">{band.count}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          )}

          {overview.gradeRows.length > 0 ? (
            <section aria-labelledby="school-overview-grades-heading" className="space-y-3">
              <h2
                id="school-overview-grades-heading"
                className="text-base font-semibold tracking-tight"
              >
                Por série / turma
              </h2>

              <div className="space-y-2 lg:hidden">
                {overview.gradeRows.map((row) => (
                  <Link
                    key={row.filterValue}
                    href={schoolOverviewHref(clientId, row.filterValue)}
                    className="border-border bg-card block rounded-xl border p-4 shadow-xs"
                  >
                    <p className="font-medium">{row.name}</p>
                    <dl className="text-muted-foreground mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                      <div>
                        Alunos{" "}
                        <span className="text-foreground tabular-nums font-medium">
                          {row.total}
                        </span>
                      </div>
                      <div>
                        Avaliados{" "}
                        <span className="text-foreground tabular-nums font-medium">
                          {row.assessed}
                        </span>
                      </div>
                      <div>
                        Sem avaliação{" "}
                        <span className="text-foreground tabular-nums font-medium">
                          {row.withoutAssessment}
                        </span>
                      </div>
                      <div>
                        Idade{" "}
                        <span className="text-foreground font-medium">{row.averageAgeLabel}</span>
                      </div>
                    </dl>
                  </Link>
                ))}
              </div>

              <div className="border-border hidden overflow-x-auto rounded-xl border lg:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Série / turma</th>
                      <th className="px-4 py-2.5 text-right font-medium">Alunos</th>
                      <th className="px-4 py-2.5 text-right font-medium">Avaliados</th>
                      <th className="px-4 py-2.5 text-right font-medium">Sem avaliação</th>
                      <th className="px-4 py-2.5 text-right font-medium">Média de idade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.gradeRows.map((row) => (
                      <tr key={row.filterValue} className="border-border border-t">
                        <td className="px-4 py-2.5">
                          <Link
                            href={schoolOverviewHref(clientId, row.filterValue)}
                            className="text-foreground font-medium underline-offset-4 hover:underline"
                          >
                            {row.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{row.total}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{row.assessed}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {row.withoutAssessment}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {row.averageAgeLabel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
