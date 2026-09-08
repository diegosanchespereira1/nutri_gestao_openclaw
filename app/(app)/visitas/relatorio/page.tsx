import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { VisitReportPage } from "@/components/visits/visit-report-page";
import { APP_PROFILE_CTX_COOKIE } from "@/lib/auth/app-session-cookies";
import { parseProfileContextCookie } from "@/lib/auth/profile-context-cookie";
import { todayKey } from "@/lib/datetime/calendar-tz";
import { loadTeamMembersForOwner } from "@/lib/actions/team-members";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import { canViewAllWorkspaceVisits } from "@/lib/visits/agenda-access";
import { loadCompletedVisitsForReport } from "@/lib/visits/load-scheduled-visits";
import {
  buildVisitReportRows,
  startOfMonthDayKey,
} from "@/lib/visits/visit-report";
import { isWorkspaceGestaoMember } from "@/lib/workspace";

export default async function VisitasRelatorioPage() {
  const [cookieStore, { supabase, user, workspaceOwnerId }] = await Promise.all([
    cookies(),
    getServerContext(),
  ]);
  if (!user || !workspaceOwnerId) redirect("/login");

  const profileCtx = parseProfileContextCookie(
    cookieStore.get(APP_PROFILE_CTX_COOKIE)?.value,
  );
  const [tz, isGestaoMember] = await Promise.all([
    fetchProfileTimeZone(supabase, user.id),
    isWorkspaceGestaoMember(supabase, user.id, workspaceOwnerId),
  ]);

  const isAgendaAdmin = canViewAllWorkspaceVisits(
    user.id,
    workspaceOwnerId,
    profileCtx?.role,
    isGestaoMember,
  );
  if (!isAgendaAdmin) redirect("/visitas");

  const now = new Date();
  const toDay = todayKey(now, tz);
  const fromDay = startOfMonthDayKey(toDay);
  const loadFrom = new Date(
    Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();

  const [{ rows: visits }, { rows: teamMembers }] = await Promise.all([
    loadCompletedVisitsForReport({
      supabase,
      authUserId: user.id,
      workspaceOwnerId,
      role: profileCtx?.role,
      from: loadFrom,
      to: now.toISOString(),
      isGestaoMember,
    }),
    loadTeamMembersForOwner(),
  ]);

  return (
    <VisitReportPage
      rows={buildVisitReportRows(visits, teamMembers, tz)}
      teamMembers={teamMembers}
      timeZone={tz}
      defaultFromDay={fromDay}
      defaultToDay={toDay}
    />
  );
}
