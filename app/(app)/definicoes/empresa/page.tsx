import { redirect } from "next/navigation";

import { TenantLogoForm } from "@/components/definicoes/tenant-logo-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { createClient } from "@/lib/supabase/server";
import {
  fetchTenantLogoStoragePath,
  getTenantLogoSignedUrl,
} from "@/lib/tenant/logo-sync";

/** Leitura do perfil após guardar — evita segmento estático com dados desatualizados. */
export const dynamic = "force-dynamic";

export default async function DefinicoesEmpresaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

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
