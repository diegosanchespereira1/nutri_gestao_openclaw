import { redirect } from "next/navigation";

import { TenantLogoForm } from "@/components/definicoes/tenant-logo-form";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { getServerContext } from "@/lib/supabase/get-server-user";
import {
  fetchTenantLogoStoragePath,
  getTenantLogoSignedUrl,
} from "@/lib/tenant/logo-sync";

/** Leitura do perfil após guardar — evita segmento estático com dados desatualizados. */
export const dynamic = "force-dynamic";

export default async function DefinicoesEmpresaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { supabase, user } = await getServerContext();
  if (!user) redirect("/login");

  const logoPath = await fetchTenantLogoStoragePath(supabase);
  const defaultLogoUrl = await getTenantLogoSignedUrl(supabase, logoPath, 3600);
  const { data: tenantNameRaw } = await supabase.rpc("workspace_tenant_name");
  const defaultTenantName =
    typeof tenantNameRaw === "string" ? tenantNameRaw : "";

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/definicoes",
    fallbackLabel: "Definições",
    currentPath: "/definicoes/empresa",
  });

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Empresa e logotipo"
        description="Defina o nome e o logotipo da sua empresa para personalizar PDFs, e-mails e comunicações."
        back={back}
      />
      <TenantLogoForm
        defaultLogoUrl={defaultLogoUrl}
        defaultTenantName={defaultTenantName}
        canManage
      />
    </PageLayout>
  );
}
