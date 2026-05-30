import { redirect } from "next/navigation";

import { VisitsAgendaClient } from "@/components/visits/visits-agenda-client";
import { todayKey as civilTodayKey } from "@/lib/datetime/calendar-tz";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadAllPatientsForOwner } from "@/lib/actions/patients";
import { loadTeamMembersForOwner } from "@/lib/actions/team-members";
import { fetchAgendaSettings } from "@/lib/supabase/profile";
import { getServerContext } from "@/lib/supabase/get-server-user";
import type { ScheduledVisitWithTargets } from "@/lib/types/visits";

export default async function VisitasPage() {
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) redirect("/login");

  const now = new Date();
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, now.getUTCDate()),
  ).toISOString();
  const to = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 90),
  ).toISOString();

  const [{ timeZone: tz, agendaStartHour, agendaEndHour }, visitsResult, { rows: establishments }, { rows: patients }, { rows: teamMembers }] =
    await Promise.all([
      fetchAgendaSettings(supabase, user.id),
      supabase
        .from("scheduled_visits")
        .select(
          `*, establishments(id, name, client_id, clients(legal_name, trade_name)), patients(id, full_name), team_members(id, full_name, job_role)`,
        )
        .eq("user_id", workspaceOwnerId)
        .gte("scheduled_start", from)
        .lte("scheduled_start", to)
        .order("scheduled_start", { ascending: true }),
      loadEstablishmentsForOwner(),
      loadAllPatientsForOwner(),
      loadTeamMembersForOwner(),
    ]);

  const todayKey = civilTodayKey(new Date(), tz);

  return (
    <VisitsAgendaClient
      visits={(visitsResult.data ?? []) as unknown as ScheduledVisitWithTargets[]}
      todayKey={todayKey}
      agendaStartHour={agendaStartHour}
      agendaEndHour={agendaEndHour}
      establishments={establishments}
      patients={patients}
      teamMembers={teamMembers}
    />
  );
}
