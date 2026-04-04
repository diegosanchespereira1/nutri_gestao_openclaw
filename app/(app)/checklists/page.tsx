import Link from "next/link";

import { ChecklistCatalog } from "@/components/checklists/checklist-catalog";
import { duplicateGlobalTemplateAction } from "@/lib/actions/checklist-custom";
import { startChecklistFill } from "@/lib/actions/checklist-fill";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadChecklistCatalog } from "@/lib/actions/checklists";
import { establishmentTypeLabel } from "@/lib/constants/establishment-types";
import { cn } from "@/lib/utils";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
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
  const [{ templates }, { rows: establishments }] = await Promise.all([
    loadChecklistCatalog(),
    loadEstablishmentsForOwner(),
  ]);

  const establishmentOptions = establishments.map((e) => {
    const uf = e.state?.toUpperCase() ?? "UF não definida";
    return {
      id: e.id,
      label: `${e.name} — ${establishmentClientLabel(e)} (${uf} · ${establishmentTypeLabel[e.establishment_type]})`,
      state: e.state,
      establishment_type: e.establishment_type,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Checklists
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Catálogo oficial e modelos personalizados por estabelecimento. Use um
            template global ou duplique-o para adicionar itens extra (FR14).
          </p>
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
        establishments={establishmentOptions}
        templates={templates}
        startFillAction={startChecklistFill}
        duplicateTemplateAction={duplicateGlobalTemplateAction}
        focusTemplateId={focusTemplateId}
      />
    </div>
  );
}
