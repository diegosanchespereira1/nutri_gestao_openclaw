import { notFound } from "next/navigation";

import { ChecklistFillWizard } from "@/components/checklists/checklist-fill-wizard";
import { loadFillSessionPageData } from "@/lib/actions/checklist-fill";

export default async function ChecklistPreencherPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const bundle = await loadFillSessionPageData(sessionId);
  if (!bundle) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Preencher checklist
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Respostas são guardadas ao alterar cada item. Use{" "}
          <strong>Pré-visualizar dossiê</strong> em qualquer momento para rever o relatório
          com o estado atual do rascunho. Após escolher a avaliação, pode escrever uma{" "}
          <strong>anotação opcional</strong> por item. Pode anexar fotos com{" "}
          <strong>Tirar foto</strong> (câmara em telemóvel/tablet) ou{" "}
          <strong>Galeria</strong>. Depois de validar a última secção, use{" "}
          <strong>Finalizar e ver dossiê</strong> para compilar o relatório com secções
          colapsáveis, <strong>ajustar textos</strong> no preview e{" "}
          <strong>aprovar</strong> para registar (imutável). Avance de secção apenas quando
          os obrigatórios estiverem válidos.
        </p>
      </div>

      <ChecklistFillWizard
        sessionId={bundle.session.id}
        template={bundle.template}
        initialResponses={bundle.responses}
        establishmentLabel={bundle.establishmentLabel}
        itemResponseSource={bundle.itemResponseSource}
        initialItemPhotos={bundle.itemPhotos}
        initialDossierApprovedAt={bundle.session.dossier_approved_at ?? null}
        initialPdfExport={bundle.latestPdfExport}
      />
    </div>
  );
}
