import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardClinicalSubsection } from "@/components/dashboard/dashboard-clinical-subsection";
import { DashboardFocusPanel } from "@/components/dashboard/dashboard-focus-panel";
import { FinancialPendingCard } from "@/components/dashboard/financial-pending-card";
import { RegulatoryAlertCard } from "@/components/dashboard/regulatory-alert-card";
import { VisitsMonthBarChart } from "@/components/dashboard/visits-month-bar-chart";
import { WeeklyBriefingWidget } from "@/components/dashboard/weekly-briefing-widget";
import { VisitAgendaBlock } from "@/components/visits/visit-agenda-block";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadComplianceDashboardAlerts } from "@/lib/actions/compliance-deadlines";
import { loadFinancialDashboardSummary } from "@/lib/actions/financial-charges";
import {
  buildVisitsByMonthSeries,
  visitsByMonthHasData,
} from "@/lib/dashboard/visits-by-month";
import { buildWeeklyBriefing } from "@/lib/dashboard/weekly-briefing";
import { loadScheduledVisitsForOwner } from "@/lib/actions/visits";
import { isSameCalendarDay } from "@/lib/datetime/calendar-tz";
import { sortScheduledVisitsForDashboard } from "@/lib/visits/sort-scheduled-visits-dashboard";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import { cn } from "@/lib/utils";

const clinicalQuickLinkClass =
  "text-primary font-medium underline-offset-4 hover:underline";

export default async function InicioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const bemvindo = sp.bemvindo === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const tz = await fetchProfileTimeZone(supabase, user.id);
  const [{ rows }, complianceAlerts, financialSummary] = await Promise.all([
    loadScheduledVisitsForOwner(),
    loadComplianceDashboardAlerts(tz),
    loadFinancialDashboardSummary(tz),
  ]);
  const today = sortScheduledVisitsForDashboard(
    rows.filter(
      (v) =>
        (v.status === "scheduled" || v.status === "in_progress") &&
        isSameCalendarDay(v.scheduled_start, tz),
    ),
  );

  const weeklyBriefing = buildWeeklyBriefing(rows, complianceAlerts, tz);
  const visitsByMonth = buildVisitsByMonthSeries(rows, tz, 6);
  const showVisitsChart = visitsByMonthHasData(visitsByMonth);

  return (
    <div className="space-y-10">
      {bemvindo ? (
        <div
          className="border-primary/40 bg-primary/5 rounded-xl border p-4"
          role="status"
        >
          <p className="text-foreground text-sm font-medium">
            Está tudo pronto para agendar a primeira visita
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            O primeiro cliente já está na tua carteira. Usa o fluxo de visitas
            para marcar quando fores ao terreno.
          </p>
          <Link
            href="/visitas/nova"
            className={cn(
              buttonVariants({ size: "sm" }),
              "mt-4 inline-flex w-full justify-center sm:w-auto",
            )}
          >
            Agendar visita
          </Link>
        </div>
      ) : null}
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Início
        </h1>
        <p className="text-muted-foreground text-sm">
          Dois eixos separados: atividade com visitas e compliance num bloco;
          finanças noutro, para reduzir ruído entre contextos (FR53).
        </p>
      </div>

      <DashboardFocusPanel
        labelledById="dashboard-clinical-heading"
        tone="clinical"
        title="Pacientes, visitas e compliance"
        description="Tudo o que é rotina clínica, deslocações e obrigações regulatórias por estabelecimento."
      >
        <nav
          className="border-border -mt-2 flex flex-wrap gap-x-4 gap-y-2 border-b pb-4 text-sm"
          aria-label="Atalhos: pacientes, visitas e checklists"
        >
          <Link href="/pacientes" className={clinicalQuickLinkClass}>
            Pacientes
          </Link>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <Link href="/visitas" className={clinicalQuickLinkClass}>
            Visitas
          </Link>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <Link href="/checklists" className={clinicalQuickLinkClass}>
            Checklists
          </Link>
        </nav>

        <WeeklyBriefingWidget briefing={weeklyBriefing} timeZone={tz} />

        {showVisitsChart ? (
          <DashboardClinicalSubsection
            id="dashboard-visits-chart-heading"
            title="Visitas por mês"
            actions={
              <Link
                href="/visitas"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-full justify-center sm:w-auto",
                )}
              >
                Agenda completa
              </Link>
            }
          >
            <p className="text-muted-foreground mb-3 text-xs">
              Últimos 6 meses civis no seu fuso (visitas exceto canceladas). As
              barras usam a paleta de gráficos do tema (tokens{" "}
              <code className="text-foreground/90 text-[11px]">--chart-1</code>{" "}
              …{" "}
              <code className="text-foreground/90 text-[11px]">--chart-5</code>
              ).
            </p>
            <VisitsMonthBarChart data={visitsByMonth} />
          </DashboardClinicalSubsection>
        ) : null}

        <DashboardClinicalSubsection
          id="regulatory-alerts-heading"
          title="Alertas regulatórios"
          actions={
            <Link
              href="/clientes"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "text-muted-foreground w-full justify-center sm:w-auto",
              )}
            >
              Gerir estabelecimentos
            </Link>
          }
        >
          {complianceAlerts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sem prazos a mostrar (próximos 90 dias ou em atraso até 1 ano).
              Configure datas na ficha de cada{" "}
              <Link
                href="/clientes"
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                estabelecimento
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-3" aria-label="Prazos de compliance">
              {complianceAlerts.map((a) => (
                <li key={a.id}>
                  <RegulatoryAlertCard alert={a} timeZone={tz} />
                </li>
              ))}
            </ul>
          )}
        </DashboardClinicalSubsection>

        <DashboardClinicalSubsection
          id="agenda-dia-heading"
          title="Agenda do dia"
          actions={
            <Link
              href="/visitas"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full justify-center sm:w-auto",
              )}
            >
              Ver todas as visitas
            </Link>
          }
        >
          {today.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sem visitas agendadas para hoje.
            </p>
          ) : (
            <ul
              className="space-y-3"
              aria-label="Visitas de hoje, ordenadas por prioridade e tipo"
            >
              {today.map((v) => (
                <li key={v.id}>
                  <VisitAgendaBlock visit={v} timeZone={tz} />
                </li>
              ))}
            </ul>
          )}
        </DashboardClinicalSubsection>
      </DashboardFocusPanel>

      <DashboardFocusPanel
        labelledById="dashboard-financial-heading"
        tone="financial"
        title="Financeiro"
        description="Resumo de cobranças, contratos e alertas de renovação — área separada da operação clínica."
      >
        <FinancialPendingCard
          overdueCount={financialSummary.overdueCount}
          overdueTotalLabel={financialSummary.overdueTotalLabel}
        />
      </DashboardFocusPanel>
    </div>
  );
}
