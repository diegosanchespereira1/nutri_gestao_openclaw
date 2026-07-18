import { redirect } from "next/navigation";

import { RegiaoFusoForm } from "@/components/definicoes/regiao-fuso-form";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";

/** Leitura do perfil após guardar — evita segmento estático com dados desatualizados. */
export const dynamic = "force-dynamic";

export default async function DefinicoesRegiaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { supabase, user } = await getServerContext();
  if (!user) redirect("/login");
  const timeZone = await fetchProfileTimeZone(supabase, user.id);

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/definicoes",
    fallbackLabel: "Definições",
    currentPath: "/definicoes/regiao",
  });

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Região e fuso horário"
        description="Escolha o fuso onde trabalha para que as visitas e o calendário coincidam com o seu dia local."
        back={back}
      />
      <RegiaoFusoForm defaultTimeZone={timeZone} />
    </PageLayout>
  );
}
