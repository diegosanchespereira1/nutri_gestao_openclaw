import { redirect } from "next/navigation";

import { CustomEstablishmentTypesManager } from "@/components/clientes/custom-establishment-types-manager";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { loadEstablishmentCustomTypesAction } from "@/lib/actions/establishment-custom-types";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";
import { canAccessAdminArea } from "@/lib/roles";
import { getServerContext } from "@/lib/supabase/get-server-user";

export const dynamic = "force-dynamic";

export default async function DefinicoesTiposEstabelecimentoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) redirect("/login");

  const [profileRow, customTypes] = await Promise.all([
    supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then((r) => r.data),
    loadEstablishmentCustomTypesAction(),
  ]);

  const canEdit =
    user.id === workspaceOwnerId || canAccessAdminArea(profileRow?.role);

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/definicoes",
    fallbackLabel: "Definições",
    currentPath: "/definicoes/tipos-estabelecimento",
  });

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Tipos de estabelecimento"
        description="Crie tipos personalizados por categoria (Atendimento ou Assessoria). Os tipos do sistema não podem ser alterados."
        back={back}
      />
      <CustomEstablishmentTypesManager
        initial={customTypes}
        canEdit={canEdit}
      />
    </PageLayout>
  );
}
