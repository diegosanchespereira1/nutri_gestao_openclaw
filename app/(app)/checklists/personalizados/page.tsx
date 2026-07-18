import Link from "next/link";

import { CustomTemplatesList } from "@/components/checklists/custom-templates-list";
import { ChecklistModelsNav } from "@/components/checklists/checklist-models-nav";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  canCurrentUserDeleteCustomChecklists,
  listCustomTemplatesForOwner,
} from "@/lib/actions/checklist-custom";
import {
  getReturnToParam,
  resolveBackNavigation,
  buildCurrentUrl,
  withReturnTo,
} from "@/lib/navigation/return-to";
import { cn } from "@/lib/utils";

export default async function ChecklistsPersonalizadosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const err = typeof sp.err === "string" ? sp.err : undefined;
  const [{ rows }, canDelete] = await Promise.all([
    listCustomTemplatesForOwner(),
    canCurrentUserDeleteCustomChecklists(),
  ]);

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/checklists",
    fallbackLabel: "Checklists",
    currentPath: "/checklists/personalizados",
  });
  const returnToOrigin = buildCurrentUrl("/checklists/personalizados", sp);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modelos personalizados"
        description="Cópias do catálogo oficial com itens extra por estabelecimento. Modelos já usados podem ser arquivados para sair do catálogo sem perder o histórico."
        back={back}
        actions={
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <ChecklistModelsNav
              current="personalizados"
              returnToOrigin={returnToOrigin}
            />
            <Link
              href={withReturnTo("/checklists", returnToOrigin)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Ir ao catálogo
            </Link>
          </div>
        }
      />

      {err === "missing" || err === "forbidden" || err === "session" ? (
        <p className="text-destructive text-sm" role="alert">
          Não foi possível iniciar o preenchimento a partir deste modelo.
        </p>
      ) : null}

      <CustomTemplatesList rows={rows} canDelete={canDelete} />
    </div>
  );
}
