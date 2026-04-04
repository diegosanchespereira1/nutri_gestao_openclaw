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
          Respostas são guardadas ao alterar cada item. Avance de secção apenas
          quando os obrigatórios estiverem válidos.
        </p>
      </div>

      <ChecklistFillWizard
        sessionId={bundle.session.id}
        template={bundle.template}
        initialResponses={bundle.responses}
        establishmentLabel={bundle.establishmentLabel}
        itemResponseSource={bundle.itemResponseSource}
      />
    </div>
  );
}
