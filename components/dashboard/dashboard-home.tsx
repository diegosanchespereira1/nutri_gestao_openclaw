import Link from "next/link";
import { cookies } from "next/headers";
import { CalendarClock, ClipboardList, Clock3, Users } from "lucide-react";

import { ContractRenewalAlerts } from "@/components/dashboard/contract-renewal-alerts";
import { DashboardAttentionItem } from "@/components/dashboard/dashboard-attention-item";
import { DashboardKpiButton } from "@/components/dashboard/dashboard-kpi-button";
import { DashboardScrollList } from "@/components/dashboard/dashboard-scroll-list";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { FinancialPendingCard } from "@/components/dashboard/financial-pending-card";
import { VisitsPerformedChartCard } from "@/components/dashboard/visits-performed-chart-card";
import { VisitAgendaBlock } from "@/components/visits/visit-agenda-block";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadExpiringContracts } from "@/lib/actions/client-contracts";
import { loadChecklistValidityAlerts } from "@/lib/actions/checklist-validity-alerts";
import { VALIDITY_ALERTS_LIST_LIMIT } from "@/lib/checklists/validity-alerts-balance";
import {
  CHECKLISTS_A_VENCER_PATH,
  CHECKLISTS_VENCIDOS_PATH,
} from "@/lib/routes";
import { loadComplianceDashboardAlerts } from "@/lib/actions/compliance-deadlines";
import { loadFinancialDashboardSummary } from "@/lib/actions/financial-charges";
import { loadTeamMembersForOwner } from "@/lib/actions/team-members";
import { isAttentionNow, isOverdueDays } from "@/lib/dashboard/attention-now";
import { buildWeeklyBriefing } from "@/lib/dashboard/weekly-briefing";
import { APP_PROFILE_CTX_COOKIE } from "@/lib/auth/app-session-cookies";
import { parseProfileContextCookie } from "@/lib/auth/profile-context-cookie";
import { visitKindLabel } from "@/lib/constants/visit-kinds";
import { visitPriorityLabel } from "@/lib/constants/visit-priorities";
import {
  calendarDaysUntilDueDate,
  formatDateTimeShort,
  formatDayKeyLong,
  formatTimeShort,
  isSameCalendarDay,
  todayKey,
} from "@/lib/datetime/calendar-tz";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { DEFAULT_PROFILE_TIME_ZONE, normalizeAppTimeZone } from "@/lib/timezones";
import { DEFAULT_ENABLED_MODULES } from "@/lib/types/modules";
import { visitDisplayTitle, visitProfessionalLabel } from "@/lib/visits/display-title";
import { canViewAllWorkspaceVisits } from "@/lib/visits/agenda-access";
import { loadScheduledVisitsForAgenda } from "@/lib/visits/load-scheduled-visits";
import { sortScheduledVisitsForDashboard } from "@/lib/visits/sort-scheduled-visits-dashboard";
import { isWorkspaceGestaoMember } from "@/lib/workspace";
import { cn } from "@/lib/utils";

const ACTION_LINK = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "min-h-11 w-full justify-center sm:w-auto",
);

export async function DashboardHome() {
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
  const enabledModules = profileCtx?.enabledModules ?? DEFAULT_ENABLED_MODULES;
  const now = new Date();

  const visitsFrom = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12, now.getUTCDate()),
  ).toISOString();
  const visitsTo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 90),
  ).toISOString();

  const isGestaoMember = await isWorkspaceGestaoMember(
    supabase,
    user.id,
    workspaceOwnerId,
  );
  const isGestor = canViewAllWorkspaceVisits(
    user.id,
    workspaceOwnerId,
    profileCtx?.role,
    isGestaoMember,
  );

  const [
    { rows },
    complianceAlerts,
    vencidosAlerts,
    proximosAlerts,
    { rows: teamMembers },
    financialSummary,
    { rows: expiringContracts },
  ] = await Promise.all([
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
      status: "vencido",
      limit: VALIDITY_ALERTS_LIST_LIMIT,
    }),
    loadChecklistValidityAlerts(tz, {
      status: "proximo",
      limit: VALIDITY_ALERTS_LIST_LIMIT,
    }),
    loadTeamMembersForOwner(),
    isGestor && enabledModules.financeiro
      ? loadFinancialDashboardSummary(tz)
      : Promise.resolve({
          overdueCount: 0,
          overdueTotalCents: 0,
          overdueTotalLabel: "R$ 0,00",
        }),
    isGestor && enabledModules.financeiro
      ? loadExpiringContracts(60)
      : Promise.resolve({ rows: [] }),
  ]);

  const today = sortScheduledVisitsForDashboard(
    rows.filter(
      (visit) =>
        (visit.status === "scheduled" || visit.status === "in_progress") &&
        isSameCalendarDay(visit.scheduled_start, tz),
    ),
  );

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

  const validityAlerts = [...vencidosAlerts, ...proximosAlerts];
  const validityCounts = {
    vencidos: vencidosAlerts.length,
    proximos: proximosAlerts.length,
  };
  const attentionValidity = validityAlerts.filter((alert) =>
    isAttentionNow(alert.daysToExpire),
  );
  const attentionCompliance = complianceAlerts.filter((alert) =>
    isAttentionNow(calendarDaysUntilDueDate(alert.due_date, tz, now)),
  );
  const overdueCount =
    attentionValidity.filter((alert) => isOverdueDays(alert.daysToExpire)).length +
    attentionCompliance.filter((alert) =>
      isOverdueDays(calendarDaysUntilDueDate(alert.due_date, tz, now)),
    ).length;

  const professionalsToday = new Set(
    today.map((visit) =>
      visitProfessionalLabel(visit, visit.creator_full_name),
    ),
  );
  const nextToday = today[0] ?? null;
  const todayKeyValue = todayKey(now, tz);
  const dateLabel = formatDayKeyLong(todayKeyValue, tz);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground -mt-2 text-sm">
        <span className="capitalize">{dateLabel}</span>
        <span>
          {" "}
          ·{" "}
          {isGestor
            ? "visão de gestão da equipe"
            : "visão de campo — o que é seu hoje"}
        </span>
      </p>

      <section
        aria-label="Pulso do dia"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <DashboardKpiButton
          label={isGestor ? "Visitas hoje" : "Minhas visitas"}
          value={String(today.length)}
          hint={
            today.length === 0
              ? "nenhuma visita hoje"
              : isGestor
                ? `${professionalsToday.size} profissional${professionalsToday.size === 1 ? "" : "is"} em campo`
                : nextToday
                  ? `próxima às ${formatTimeShort(nextToday.scheduled_start, tz)}`
                  : "na sua rota"
          }
          tone="default"
          href="#dashboard-agenda"
        />
        <DashboardKpiButton
          label="Em atraso"
          value={String(validityCounts.vencidos)}
          hint="checklists vencidos · ver todos"
          tone={validityCounts.vencidos > 0 ? "danger" : "default"}
          href={CHECKLISTS_VENCIDOS_PATH}
        />
        <DashboardKpiButton
          label="Checklists a vencer"
          value={String(validityCounts.proximos)}
          hint="próximos 90 dias · ver todos"
          tone={validityCounts.proximos > 0 ? "warning" : "default"}
          href={CHECKLISTS_A_VENCER_PATH}
        />
        {isGestor && enabledModules.financeiro ? (
          <DashboardKpiButton
            label="Valores em atraso"
            value={financialSummary.overdueTotalLabel}
            hint={
              financialSummary.overdueCount === 0
                ? "sem cobranças vencidas"
                : `${financialSummary.overdueCount} cobrança${financialSummary.overdueCount === 1 ? "" : "s"}`
            }
            tone={financialSummary.overdueCount > 0 ? "money" : "default"}
            href="#dashboard-financeiro"
          />
        ) : (
          <DashboardKpiButton
            label="Próximo compromisso"
            value={
              nextToday
                ? formatTimeShort(nextToday.scheduled_start, tz)
                : "—"
            }
            hint={
              nextToday ? visitDisplayTitle(nextToday) : "nada agendado hoje"
            }
            tone="default"
            href="#dashboard-agenda"
          />
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <DashboardSectionCard
            id="dashboard-agenda"
            title="Agenda do dia"
            description={
              isGestor
                ? "Cobertura da equipe — quem está em campo agora."
                : "O que precisa acontecer hoje, na sua rota."
            }
            actions={
              <Link href="/visitas" className={ACTION_LINK}>
                Agenda completa
              </Link>
            }
          >
            {today.length === 0 ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  {isGestor
                    ? "Nenhuma visita da equipe para hoje."
                    : "Nenhuma visita sua para hoje."}
                </p>
                <Link href="/visitas/nova" className={ACTION_LINK}>
                  Agendar visita
                </Link>
              </div>
            ) : (
              <DashboardScrollList label="Visitas de hoje, ordenadas por prioridade e tipo">
                <ul className="space-y-2">
                  {today.map((visit) => (
                    <li key={visit.id}>
                      <VisitAgendaBlock
                        visit={visit}
                        timeZone={tz}
                        showProfessional={isGestor}
                        compact
                      />
                    </li>
                  ))}
                </ul>
              </DashboardScrollList>
            )}
          </DashboardSectionCard>
        </div>

        <div className="xl:col-span-5">
          <DashboardSectionCard
            id="dashboard-atencao"
            title="Checklists em alerta"
            description="O que já passou do ponto ou vence nesta semana."
            tone={overdueCount > 0 ? "urgent" : "default"}
            actions={
              <Link href={CHECKLISTS_VENCIDOS_PATH} className={ACTION_LINK}>
                Ver vencidos
              </Link>
            }
          >
            {attentionValidity.length === 0 &&
            attentionCompliance.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nada vencido nem a vencer nos próximos 7 dias.
              </p>
            ) : (
              <DashboardScrollList label="Alertas críticos de checklists e prazos">
                {attentionValidity.map((alert) => (
                  <DashboardAttentionItem
                    key={alert.responseId}
                    title={alert.checklistName}
                    meta={`${alert.clientName} · ${alert.status === "vencido" ? "Vencido" : "Vence nesta semana"}`}
                    href={`/checklists/preencher/${alert.sessionId}?view=dossie`}
                    overdue={alert.status === "vencido"}
                  />
                ))}
                {attentionCompliance.map((alert) => {
                  const days = calendarDaysUntilDueDate(
                    alert.due_date,
                    tz,
                    now,
                  );
                  return (
                    <DashboardAttentionItem
                      key={alert.id}
                      title={alert.title}
                      meta={`${alert.establishment_name} · limite ${alert.due_date}`}
                      href={
                        alert.checklist_template_id
                          ? `/checklists?template=${encodeURIComponent(alert.checklist_template_id)}`
                          : "/checklists"
                      }
                      overdue={days < 0}
                    />
                  );
                })}
              </DashboardScrollList>
            )}
          </DashboardSectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <DashboardSectionCard
            id="dashboard-semana"
            title="Agenda da semana"
            description={weeklyBriefing.rangeLabel}
            actions={
              <Link href="/visitas" className={ACTION_LINK}>
                Ver agenda
              </Link>
            }
          >
            {weeklyBriefing.visits.length === 0 &&
            weeklyBriefing.alerts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Sem visitas nem prazos nesta janela.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                    <CalendarClock className="size-3.5" aria-hidden />
                    Visitas
                  </h3>
                  {weeklyBriefing.visits.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Sem visitas nos próximos 7 dias.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {weeklyBriefing.visits.map((visit) => (
                        <li key={visit.id}>
                          <Link
                            href={visit.detailHref}
                            className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/80 px-3 py-2 text-sm"
                          >
                            <span className="font-medium">{visit.title}</span>
                            <span className="text-muted-foreground text-xs">
                              {formatDateTimeShort(visit.scheduled_start, tz)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="text-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                    <ClipboardList className="size-3.5" aria-hidden />
                    Prazos
                  </h3>
                  {weeklyBriefing.alerts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Sem prazos nesta janela.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {weeklyBriefing.alerts.map((alert) => (
                        <li
                          key={alert.id}
                          className="border-border rounded-lg border bg-background/80 px-3 py-2 text-sm"
                        >
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-muted-foreground text-xs">
                            {alert.establishment_name} · limite {alert.due_date}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </DashboardSectionCard>
        </div>

        <div className="xl:col-span-5">
          {isGestor ? (
            <DashboardSectionCard
              id="dashboard-financeiro"
              title="Financeiro"
              description="Cobranças em atraso e contratos que pedem renovação."
              tone="financial"
            >
              {enabledModules.financeiro ? (
                <div className="space-y-4">
                  {expiringContracts.length > 0 ? (
                    <ContractRenewalAlerts
                      rows={expiringContracts}
                      withinDays={60}
                    />
                  ) : null}
                  <FinancialPendingCard
                    overdueCount={financialSummary.overdueCount}
                    overdueTotalLabel={financialSummary.overdueTotalLabel}
                  />
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  O módulo financeiro não está ativo nesta conta.
                </p>
              )}
            </DashboardSectionCard>
          ) : (
            <DashboardSectionCard
              id="dashboard-atalhos"
              title="Atalhos da rota"
              description="O que o profissional precisa sem sair do início."
            >
              <div className="grid grid-cols-1 gap-2">
                <Link
                  href={CHECKLISTS_VENCIDOS_PATH}
                  className={cn(ACTION_LINK, "justify-start")}
                >
                  <ClipboardList className="size-4" aria-hidden />
                  Checklists vencidos
                </Link>
                <Link
                  href={CHECKLISTS_A_VENCER_PATH}
                  className={cn(ACTION_LINK, "justify-start")}
                >
                  <Clock3 className="size-4" aria-hidden />
                  Checklists a vencer
                </Link>
                <Link
                  href="/checklists"
                  className={cn(ACTION_LINK, "justify-start")}
                >
                  <ClipboardList className="size-4" aria-hidden />
                  Meus checklists
                </Link>
                <Link
                  href="/visitas"
                  className={cn(ACTION_LINK, "justify-start")}
                >
                  <Clock3 className="size-4" aria-hidden />
                  Próximas visitas
                </Link>
                <Link
                  href="/clientes"
                  className={cn(ACTION_LINK, "justify-start")}
                >
                  <Users className="size-4" aria-hidden />
                  Clientes da rota
                </Link>
              </div>
            </DashboardSectionCard>
          )}
        </div>
      </div>

      <DashboardSectionCard
        id="dashboard-ritmo"
        title={isGestor ? "Ritmo da equipe" : "O meu ritmo"}
        description={
          isGestor
            ? "Visitas concluídas. Filtra período e profissional e exporta o Excel do que está no gráfico."
            : "As suas visitas concluídas. Filtra o período e exporta o Excel."
        }
      >
        <VisitsPerformedChartCard
          visits={completedVisits}
          teamMembers={isGestor ? teamMembers : teamMembers.filter((member) => member.member_user_id === user.id)}
          timeZone={tz}
          referenceIso={now.toISOString()}
        />
      </DashboardSectionCard>
    </div>
  );
}
