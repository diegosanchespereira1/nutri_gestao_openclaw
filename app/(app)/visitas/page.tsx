import { redirect } from "next/navigation";

import { VisitsAgendaClient } from "@/components/visits/visits-agenda-client";
import { todayKey as civilTodayKey } from "@/lib/datetime/calendar-tz";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadAllPatientsForOwner } from "@/lib/actions/patients";
import { loadTeamMembersForOwner } from "@/lib/actions/team-members";
import { fetchAgendaSettings } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccountOwnerId } from "@/lib/workspace";
import type { ScheduledVisitWithTargets } from "@/lib/types/visits";

export default async function VisitasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, now.getUTCDate()),
  ).toISOString();
  const to = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 90),
  ).toISOString();

  const [{ timeZone: tz, agendaStartHour, agendaEndHour }, workspaceOwnerId] = await Promise.all([
    fetchAgendaSettings(supabase, user.id),
    getWorkspaceAccountOwnerId(supabase, user.id),
  ]);

  const [visitsResult, { rows: establishments }, { rows: patients }, { rows: teamMembers }] =
    await Promise.all([
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
