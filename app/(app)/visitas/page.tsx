import { redirect } from "next/navigation";

import { VisitsAgendaClient } from "@/components/visits/visits-agenda-client";
import { todayKey as civilTodayKey } from "@/lib/datetime/calendar-tz";
import { loadScheduledVisitsForAgenda } from "@/lib/actions/visits";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadAllPatientsForOwner } from "@/lib/actions/patients";
import { loadTeamMembersForOwner } from "@/lib/actions/team-members";
import { fetchAgendaSettings } from "@/lib/supabase/profile";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { APP_PROFILE_CTX_COOKIE } from "@/lib/auth/app-session-cookies";
import { parseProfileContextCookie } from "@/lib/auth/profile-context-cookie";
import { cookies } from "next/headers";
import type { ScheduledVisitWithTargets } from "@/lib/types/visits";

export default async function VisitasPage() {
  const [cookieStore, { supabase, user, workspaceOwnerId }] = await Promise.all([
    cookies(),
    getServerContext(),
  ]);
  if (!user || !workspaceOwnerId) redirect("/login");

  const profileCtx = parseProfileContextCookie(
    cookieStore.get(APP_PROFILE_CTX_COOKIE)?.value,
  );

  const now = new Date();
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, now.getUTCDate()),
  ).toISOString();
  const to = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 90),
  ).toISOString();

  const [{ timeZone: tz, agendaStartHour, agendaEndHour }, { rows: visits }, { rows: establishments }, { rows: patients }, { rows: teamMembers }] =
    await Promise.all([
      fetchAgendaSettings(supabase, user.id),
      loadScheduledVisitsForAgenda({
        supabase,
        authUserId: user.id,
        workspaceOwnerId,
        role: profileCtx?.role,
        from,
        to,
      }),
      loadEstablishmentsForOwner(),
      loadAllPatientsForOwner(),
      loadTeamMembersForOwner(),
    ]);

  const todayKey = civilTodayKey(new Date(), tz);

  return (
    <VisitsAgendaClient
      visits={visits as ScheduledVisitWithTargets[]}
      todayKey={todayKey}
      agendaStartHour={agendaStartHour}
      agendaEndHour={agendaEndHour}
      establishments={establishments}
      patients={patients}
      teamMembers={teamMembers}
    />
  );
}
