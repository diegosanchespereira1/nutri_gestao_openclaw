import Link from "next/link";
import { cookies } from "next/headers";

import { ChecklistValidityAlertGroups } from "@/components/dashboard/checklist-validity-alert-groups";
import { DashboardClinicalSubsection } from "@/components/dashboard/dashboard-clinical-subsection";
import { DashboardFocusPanel } from "@/components/dashboard/dashboard-focus-panel";
import { RegulatoryAlertCard } from "@/components/dashboard/regulatory-alert-card";
import { VisitsMonthBarChart } from "@/components/dashboard/visits-month-bar-chart";
import { WeeklyBriefingWidget } from "@/components/dashboard/weekly-briefing-widget";
import { VisitAgendaBlock } from "@/components/visits/visit-agenda-block";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadComplianceDashboardAlerts } from "@/lib/actions/compliance-deadlines";
import { loadChecklistValidityAlerts } from "@/lib/actions/checklist-validity-alerts";
import {
  buildVisitsByMonthSeries,
  visitsByMonthHasData,
} from "@/lib/dashboard/visits-by-month";
import { buildWeeklyBriefing } from "@/lib/dashboard/weekly-briefing";
import { loadScheduledVisitsForAgenda } from "@/lib/visits/load-scheduled-visits";
import { isSameCalendarDay } from "@/lib/datetime/calendar-tz";
import { sortScheduledVisitsForDashboard } from "@/lib/visits/sort-scheduled-visits-dashboard";
import { APP_PROFILE_CTX_COOKIE } from "@/lib/auth/app-session-cookies";
import { parseProfileContextCookie } from "@/lib/auth/profile-context-cookie";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { DEFAULT_PROFILE_TIME_ZONE, normalizeAppTimeZone } from "@/lib/timezones";
import { cn } from "@/lib/utils";

const clinicalQuickLinkClass =
  "text-primary font-medium underline-offset-4 hover:underline";

export async function InicioClinicalPanel() {
  const [cookieStore, { supabase, user, workspaceOwnerId }] = await Promise.all([
    cookies(),
    getServerContext(),
  ]);

  if (!user || !workspaceOwnerId) return null;

  const profileCtx = parseProfileContextCookie(
    cookieStore.get(APP_PROFILE_CTX_COOKIE)?.value,
  );
  const tz = profileCtx?.timeZone
    ? normalizeAppTimeZone(profileCtx.timeZone)
    : DEFAULT_PROFILE_TIME_ZONE;

  const now = new Date();
  const visitsFrom = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, now.getUTCDate()),
  ).toISOString();
  const visitsTo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 90),
  ).toISOString();

  const [{ rows }, complianceAlerts, validityAlerts] = await Promise.all([
    loadScheduledVisitsForAgenda({
      supabase,
      authUserId: user.id,
      workspaceOwnerId,
      role: profileCtx?.role,
      from: visitsFrom,
      to: visitsTo,
    }),
    loadComplianceDashboardAlerts(tz),
    loadChecklistValidityAlerts(tz),
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
            <code className="text-foreground/90 text-[11px]">--chart-1</code> …{" "}
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
  );
}
