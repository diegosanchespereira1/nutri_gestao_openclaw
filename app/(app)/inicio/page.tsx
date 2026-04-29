import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";

import { DashboardClinicalSubsection } from "@/components/dashboard/dashboard-clinical-subsection";
import { DashboardFocusPanel } from "@/components/dashboard/dashboard-focus-panel";
import { FinancialPendingCard } from "@/components/dashboard/financial-pending-card";
import { ChecklistValidityAlertGroups } from "@/components/dashboard/checklist-validity-alert-groups";
import { RegulatoryAlertCard } from "@/components/dashboard/regulatory-alert-card";
import { VisitsMonthBarChart } from "@/components/dashboard/visits-month-bar-chart";
import { WeeklyBriefingWidget } from "@/components/dashboard/weekly-briefing-widget";
import { VisitAgendaBlock } from "@/components/visits/visit-agenda-block";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadComplianceDashboardAlerts } from "@/lib/actions/compliance-deadlines";
import { loadChecklistValidityAlerts } from "@/lib/actions/checklist-validity-alerts";
import { loadFinancialDashboardSummary } from "@/lib/actions/financial-charges";
import { loadExpiringContracts } from "@/lib/actions/client-contracts";
import { ContractRenewalAlerts } from "@/components/dashboard/contract-renewal-alerts";
import {
  buildVisitsByMonthSeries,
  visitsByMonthHasData,
} from "@/lib/dashboard/visits-by-month";
import { buildWeeklyBriefing } from "@/lib/dashboard/weekly-briefing";
import { loadScheduledVisitsForOwner } from "@/lib/actions/visits";
import { isSameCalendarDay } from "@/lib/datetime/calendar-tz";
import { sortScheduledVisitsForDashboard } from "@/lib/visits/sort-scheduled-visits-dashboard";
import { FirstClientReminderToast } from "@/components/dashboard/first-client-reminder-toast";
import { createClient } from "@/lib/supabase/server";
import {
  countClientsForOwner,
  fetchProfileTimeZone,
} from "@/lib/supabase/profile";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
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
  const onboardingMinimal = sp.onboarding === "minimal";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const workspaceOwnerId = await getWorkspaceAccountOwnerId(supabase, user.id);
  const [tz, clientCount] = await Promise.all([
    fetchProfileTimeZone(supabase, user.id),
    countClientsForOwner(supabase, workspaceOwnerId),
  ]);
  const hasClients = clientCount > 0;
  const [{ rows }, complianceAlerts, validityAlerts, financialSummary, { rows: expiringContracts }] = await Promise.all([
    loadScheduledVisitsForOwner(),
    loadComplianceDashboardAlerts(tz),
    loadChecklistValidityAlerts(tz),
    loadFinancialDashboardSummary(tz),
    loadExpiringContracts(60),
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
    <PageLayout>
      <FirstClientReminderToast hasClients={hasClients} />
      {bemvindo ? (
        <div
          className="border-primary/40 bg-primary/5 rounded-xl border p-4"
          role="status"
        >
          {onboardingMinimal || !hasClients ? (
            <>
              <p className="text-foreground text-sm font-medium">
                Conta configurada
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {hasClients
                  ? "Podes explorar a app à vontade."
                  : "Ainda não há clientes na carteira — adiciona o primeiro quando for conveniente."}
              </p>
              {!hasClients ? (
                <Link
                  href="/clientes/novo"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "mt-4 inline-flex w-full justify-center sm:w-auto",
                  )}
                >
                  Novo cliente
                </Link>
              ) : null}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      ) : null}

      {/* Cabeçalho de página */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="text-primary size-5" aria-hidden />
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Início
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/visitas/nova"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Agendar visita
          </Link>
          <Link
            href="/clientes/novo"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Novo cliente
          </Link>
        </div>
      </div>

      <DashboardFocusPanel
        labelledById="dashboard-clinical-heading"
        tone="clinical"
        title="Visitas e compliance"
        description="Agenda de visitas, obrigações regulatórias e checklists por estabelecimento."
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
          id="validity-alerts-heading"
          title="Validades de checklist"
          actions={
            <Link
              href="/checklists"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full justify-center sm:w-auto",
              )}
            >
              Ver checklists
            </Link>
          }
        >
          {validityAlerts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sem itens vencidos ou a vencer nos próximos 7 dias.
            </p>
          ) : (
            <ChecklistValidityAlertGroups alerts={validityAlerts} timeZone={tz} />
          )}
        </DashboardClinicalSubsection>

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
        description="Cobranças, contratos e alertas de renovação."
      >
        {expiringContracts.length > 0 && (
          <ContractRenewalAlerts rows={expiringContracts} withinDays={60} />
        )}
        <FinancialPendingCard
          overdueCount={financialSummary.overdueCount}
          overdueTotalLabel={financialSummary.overdueTotalLabel}
        />
      </DashboardFocusPanel>
    </PageLayout>
  );
}
