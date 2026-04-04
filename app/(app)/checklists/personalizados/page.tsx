import Link from "next/link";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { startChecklistCustomFill } from "@/lib/actions/checklist-fill";
import { listCustomTemplatesForOwner } from "@/lib/actions/checklist-custom";
import { cn } from "@/lib/utils";

export default async function ChecklistsPersonalizadosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const err = typeof sp.err === "string" ? sp.err : undefined;
  const { rows } = await listCustomTemplatesForOwner();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Modelos personalizados
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Cópias do catálogo oficial com itens extra por estabelecimento. Aplique
            estes modelos em rascunhos de preenchimento e, no futuro, em visitas.
          </p>
        </div>
        <Link
          href="/checklists"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Catálogo oficial
        </Link>
      </div>

      {err === "missing" || err === "forbidden" || err === "session" ? (
        <p className="text-destructive text-sm" role="alert">
          Não foi possível iniciar o preenchimento a partir deste modelo.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Ainda não tem modelos personalizados. No catálogo, selecione um
            estabelecimento e use <strong>Personalizar</strong> num template.
          </p>
          <Link
            href="/checklists"
            className={cn(buttonVariants(), "mt-4 inline-flex")}
          >
            Ir ao catálogo
          </Link>
        </div>
      ) : (
        <ul
          className="border-border divide-border divide-y overflow-hidden rounded-lg border"
          aria-label="Modelos personalizados"
        >
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-foreground font-medium">{r.name}</p>
                <p className="text-muted-foreground text-sm">
                  {r.establishment_label}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/checklists/personalizados/${r.id}/editar`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Editar
                </Link>
                <form action={startChecklistCustomFill} className="contents">
                  <input type="hidden" name="custom_template_id" value={r.id} />
                  <Button type="submit" size="sm">
                    Preencher
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
