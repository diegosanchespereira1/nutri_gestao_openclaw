import { redirect } from "next/navigation";

import { AgendaSettingsForm } from "@/components/definicoes/agenda-settings-form";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { fetchAgendaSettings } from "@/lib/supabase/profile";

export const dynamic = "force-dynamic";

export default async function DefinicoesAgendaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { supabase, user } = await getServerContext();
  if (!user) redirect("/login");

  const { agendaStartHour, agendaEndHour } = await fetchAgendaSettings(supabase, user.id);

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/definicoes",
    fallbackLabel: "Definições",
    currentPath: "/definicoes/agenda",
  });

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Agenda"
        description="Configure o intervalo horário da grelha semanal de visitas."
        back={back}
      />
      <AgendaSettingsForm
        defaultStartHour={agendaStartHour}
        defaultEndHour={agendaEndHour}
      />
    </PageLayout>
  );
}
