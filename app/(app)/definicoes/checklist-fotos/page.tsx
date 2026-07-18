import { MapPin } from "lucide-react";
import { redirect } from "next/navigation";

import { ChecklistPhotoGpsForm } from "@/components/definicoes/checklist-photo-gps-form";
import { ChecklistPdfSettingsForm } from "@/components/definicoes/checklist-pdf-settings-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { getPdfSettingsAction } from "@/lib/actions/checklist-pdf-settings";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";
import { getServerContext } from "@/lib/supabase/get-server-user";

export const dynamic = "force-dynamic";

export default async function ChecklistFotosDefinicoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { user, workspaceOwnerId } = await getServerContext();
  if (!user) redirect("/login");

  // Apenas titulares podem editar; membros de equipa só lêem
  const canManage = user.id === workspaceOwnerId;

  const pdfSettings = await getPdfSettingsAction();

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/definicoes",
    fallbackLabel: "Definições",
    currentPath: "/definicoes/checklist-fotos",
  });

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Checklist e fotos"
        description="Preferências de fotos, GPS, assinaturas e personalização visual do PDF de dossiê."
        back={back}
      />

      {/* GPS nas fotos */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <MapPin className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          Por omissão as fotos são enviadas sem GPS, sem pedido de permissão ao browser.
          Ative abaixo só se precisar de coordenadas nas evidências.
        </p>
      </div>
      <ChecklistPhotoGpsForm />

      {/* Personalização visual do PDF */}
      <ChecklistPdfSettingsForm
        initialSettings={pdfSettings}
        canManage={canManage}
      />
    </PageLayout>
  );
}
