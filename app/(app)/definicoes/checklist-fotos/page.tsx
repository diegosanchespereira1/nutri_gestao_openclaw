import { MapPin } from "lucide-react";

import { ChecklistPhotoGpsForm } from "@/components/definicoes/checklist-photo-gps-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";

export default function ChecklistFotosDefinicoesPage() {
  return (
    <PageLayout variant="form">
      <PageHeader
        title="Checklist e fotos"
        description="Preferências para anexar evidências fotográficas nos relatórios."
        back={{ href: "/definicoes", label: "Definições" }}
      />
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <MapPin className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
        <p>
          Por omissão as fotos são enviadas sem GPS, sem pedido de permissão ao browser.
          Ative abaixo só se precisar de coordenadas nas evidências.
        </p>
      </div>
      <ChecklistPhotoGpsForm />
    </PageLayout>
  );
}
