import { redirect } from "next/navigation";

import { TenantLogoForm } from "@/components/definicoes/tenant-logo-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { getServerContext } from "@/lib/supabase/get-server-user";
import {
  fetchTenantLogoStoragePath,
  getTenantLogoSignedUrl,
} from "@/lib/tenant/logo-sync";

/** Leitura do perfil após guardar — evita segmento estático com dados desatualizados. */
export const dynamic = "force-dynamic";

export default async function DefinicoesEmpresaPage() {
  const { supabase, user } = await getServerContext();
  if (!user) redirect("/login");

  const logoPath = await fetchTenantLogoStoragePath(supabase);
  const defaultLogoUrl = await getTenantLogoSignedUrl(supabase, logoPath, 3600);

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Empresa e logotipo"
        description="Envie o logotipo da sua empresa para personalizar PDFs, e-mails e comunicações. Se nenhum logotipo for enviado, os documentos são gerados sem marca."
        back={{ href: "/definicoes", label: "Definições" }}
      />
      <TenantLogoForm defaultLogoUrl={defaultLogoUrl} canManage />
    </PageLayout>
  );
}
