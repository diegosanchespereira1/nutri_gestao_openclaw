import { redirect } from "next/navigation";

import { AgendaSettingsForm } from "@/components/definicoes/agenda-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { fetchAgendaSettings } from "@/lib/supabase/profile";

export const dynamic = "force-dynamic";

export default async function DefinicoesAgendaPage() {
  const { supabase, user } = await getServerContext();
  if (!user) redirect("/login");

  const { agendaStartHour, agendaEndHour } = await fetchAgendaSettings(supabase, user.id);

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Agenda"
        description="Configure o intervalo horário da grelha semanal de visitas."
        back={{ href: "/definicoes", label: "Definições" }}
      />
      <AgendaSettingsForm
        defaultStartHour={agendaStartHour}
        defaultEndHour={agendaEndHour}
      />
    </PageLayout>
  );
}
