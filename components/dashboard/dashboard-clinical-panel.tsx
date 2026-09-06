import Link from "next/link";
import { cookies } from "next/headers";

import { ChecklistValidityAlertGroups } from "@/components/dashboard/checklist-validity-alert-groups";
import { ChecklistValidityKpiCards } from "@/components/dashboard/checklist-validity-kpi-cards";
import { DashboardClinicalSubsection } from "@/components/dashboard/dashboard-clinical-subsection";
import { DashboardFocusPanel } from "@/components/dashboard/dashboard-focus-panel";
import { RegulatoryAlertCard } from "@/components/dashboard/regulatory-alert-card";
import { VisitsPerformedChartCard } from "@/components/dashboard/visits-performed-chart-card";
import { WeeklyBriefingWidget } from "@/components/dashboard/weekly-briefing-widget";
import { VisitAgendaBlock } from "@/components/visits/visit-agenda-block";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadComplianceDashboardAlerts } from "@/lib/actions/compliance-deadlines";
import { loadChecklistValidityAlerts } from "@/lib/actions/checklist-validity-alerts";
import {
  balanceValidityAlerts,
  countValidityAlertsByStatus,
  VALIDITY_ALERTS_LIST_LIMIT,
} from "@/lib/checklists/validity-alerts-balance";
import { buildWeeklyBriefing } from "@/lib/dashboard/weekly-briefing";
import { loadTeamMembersForOwner } from "@/lib/actions/team-members";
import { visitKindLabel } from "@/lib/constants/visit-kinds";
import { visitPriorityLabel } from "@/lib/constants/visit-priorities";
import { visitDisplayTitle, visitProfessionalLabel } from "@/lib/visits/display-title";
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

export async function DashboardClinicalPanel() {
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
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12, now.getUTCDate()),
  ).toISOString();
  const visitsTo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 90),
  ).toISOString();

  const [{ rows }, complianceAlerts, validityAlerts, { rows: teamMembers }] =
    await Promise.all([
      loadScheduledVisitsForAgenda({
        supabase,
        authUserId: user.id,
        workspaceOwnerId,
        role: profileCtx?.role,
        from: visitsFrom,
        to: visitsTo,
      }),
      loadComplianceDashboardAlerts(tz),
      loadChecklistValidityAlerts(tz, {
        limit: VALIDITY_ALERTS_LIST_LIMIT,
        skipBalance: true,
      }),
      loadTeamMembersForOwner(),
    ]);

  const today = sortScheduledVisitsForDashboard(
    rows.filter(
      (v) =>
        (v.status === "scheduled" || v.status === "in_progress") &&
        isSameCalendarDay(v.scheduled_start, tz),
    ),
  );

  const validityCounts = countValidityAlertsByStatus(validityAlerts);
  const validityPreview = balanceValidityAlerts(validityAlerts, 8);

  const weeklyBriefing = buildWeeklyBriefing(rows, complianceAlerts, tz);
  const completedVisits = rows
    .filter((visit) => visit.status === "completed")
    .map((visit) => ({
      scheduled_start: visit.scheduled_start,
      status: visit.status,
      assigned_team_member_id: visit.assigned_team_member_id,
      user_id: visit.user_id,
      team_members: visit.team_members,
      creator_full_name: visit.creator_full_name,
      target_type: visit.target_type,
      target_name: visitDisplayTitle(visit),
      visit_kind_label: visitKindLabel[visit.visit_kind],
      priority_label: visitPriorityLabel[visit.priority],
      professional_label: visitProfessionalLabel(
        visit,
        visit.creator_full_name,
      ),
    }));

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

      <DashboardClinicalSubsection
        id="dashboard-visits-chart-heading"
        title="Visitas realizadas"
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
        <VisitsPerformedChartCard
          visits={completedVisits}
          teamMembers={teamMembers}
          timeZone={tz}
          referenceIso={now.toISOString()}
        />
      </DashboardClinicalSubsection>

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
        <div className="space-y-4">
          <ChecklistValidityKpiCards
            vencidos={validityCounts.vencidos}
            proximos={validityCounts.proximos}
          />
          {validityPreview.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sem itens vencidos (último ano) ou com validade nos próximos 90 dias.
            </p>
          ) : (
            <ChecklistValidityAlertGroups alerts={validityPreview} timeZone={tz} />
          )}
        </div>
      </DashboardClinicalSubsection>

      <DashboardClinicalSubsection
        id="regulatory-alerts-heading"
        title="Alertas regulatórios"
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
