import Link from "next/link";

import { ChecklistCatalog } from "@/components/checklists/checklist-catalog";
import { PageHelpHint } from "@/components/help/page-help-hint";
import { duplicateGlobalTemplateAction } from "@/lib/actions/checklist-custom";
import { startChecklistFill } from "@/lib/actions/checklist-fill";
import { loadRecentChecklistEstablishmentsAction } from "@/lib/actions/establishments";
import { loadChecklistCatalog } from "@/lib/actions/checklists";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function ChecklistsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const err = typeof sp.err === "string" ? sp.err : undefined;
  const focusTemplateId =
    typeof sp.template === "string" && /^[0-9a-f-]{36}$/i.test(sp.template)
      ? sp.template
      : null;
  const [{ templates }, { rows: recentEstablishments }] = await Promise.all([
    loadChecklistCatalog(),
    loadRecentChecklistEstablishmentsAction(3),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-foreground text-2xl font-semibold tracking-tight">
              Checklists
            </h1>
            <PageHelpHint ariaLabel="Como funciona a página de checklists">
              <p>
                Catálogo oficial e modelos personalizados por estabelecimento. Use um template
                global ou duplique-o para adicionar itens extra (FR14).
              </p>
            </PageHelpHint>
          </div>
        </div>
        <Link
          href="/checklists/personalizados"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Modelos personalizados
        </Link>
      </div>

      {err === "missing" ? (
        <p className="text-destructive text-sm" role="alert">
          Selecione um estabelecimento antes de usar um template.
        </p>
      ) : null}
      {err === "forbidden" || err === "template" || err === "session" ? (
        <p className="text-destructive text-sm" role="alert">
          Não foi possível iniciar o rascunho. Verifique o estabelecimento e o
          modelo e tente novamente.
        </p>
      ) : null}
      {err === "duplicate" ? (
        <p className="text-destructive text-sm" role="alert">
          Não foi possível criar o modelo personalizado. Tente novamente.
        </p>
      ) : null}

      <ChecklistCatalog
        key={focusTemplateId ?? "checklist-catalog-default"}
        recentEstablishments={recentEstablishments}
        templates={templates}
        startFillAction={startChecklistFill}
        duplicateTemplateAction={duplicateGlobalTemplateAction}
        focusTemplateId={focusTemplateId}
      />
    </div>
  );
}
