import { redirect } from "next/navigation";

import { VisitsAgendaClient } from "@/components/visits/visits-agenda-client";
import { loadScheduledVisitsForOwner } from "@/lib/actions/visits";
import { todayKey as civilTodayKey } from "@/lib/datetime/calendar-tz";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";

export default async function VisitasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const [{ rows }, tz] = await Promise.all([
    loadScheduledVisitsForOwner(),
    fetchProfileTimeZone(supabase, user.id),
  ]);
  const todayKey = civilTodayKey(new Date(), tz);

  return <VisitsAgendaClient visits={rows} todayKey={todayKey} />;
}
