import { redirect } from "next/navigation";

import { RegiaoFusoForm } from "@/components/definicoes/regiao-fuso-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";

/** Leitura do perfil após guardar — evita segmento estático com dados desatualizados. */
export const dynamic = "force-dynamic";

export default async function DefinicoesRegiaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const timeZone = await fetchProfileTimeZone(supabase, user.id);

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Região e fuso horário"
        description="Escolha o fuso onde trabalha para que as visitas e o calendário coincidam com o seu dia local."
        back={{ href: "/definicoes", label: "Definições" }}
      />
      <RegiaoFusoForm defaultTimeZone={timeZone} />
    </PageLayout>
  );
}
