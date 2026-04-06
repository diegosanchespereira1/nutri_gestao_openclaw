import { notFound } from "next/navigation";

import { ChecklistFillWizard } from "@/components/checklists/checklist-fill-wizard";
import { PageHelpHint } from "@/components/help/page-help-hint";
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
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Preencher checklist
          </h1>
          <PageHelpHint ariaLabel="Como funciona o preenchimento do checklist">
            <p>
              Respostas são guardadas ao alterar cada item. Pode saltar entre secções com{" "}
              <strong>Ir para secção</strong> ou <strong>Seguinte</strong> /{" "}
              <strong>Secção anterior</strong> sem preencher tudo de seguida.
            </p>
            <p>
              Use <strong>Pré-visualizar dossiê</strong> para rever o rascunho. Após escolher
              a avaliação, pode escrever uma <strong>anotação opcional</strong> por item. Pode
              anexar fotos com <strong>Tirar foto</strong> (câmara em telemóvel/tablet) ou{" "}
              <strong>Galeria</strong>.
            </p>
            <p>
              Quando terminar, use <strong>Finalizar e ver dossiê</strong>: só aí é obrigatório
              que todos os requisitos estejam válidos; depois pode <strong>ajustar textos</strong>{" "}
              no preview e <strong>aprovar</strong> para registar (imutável).
            </p>
          </PageHelpHint>
        </div>
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
