import Link from "next/link";
import { Pencil, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { startChecklistCustomFill } from "@/lib/actions/checklist-fill";
import { listCustomTemplatesForOwner } from "@/lib/actions/checklist-custom";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

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
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Modelos personalizados">
          {rows.map((r) => (
            <li
              key={r.id}
              className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-xs"
            >
              <div className="min-w-0">
                <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Personalizado
                </span>
                <p className="mt-2 truncate text-sm font-semibold text-foreground">
                  {r.name}
                </p>
                <div className="mt-1 space-y-0.5 text-xs text-foreground/85">
                  <p className="truncate">{r.establishment_label}</p>
                  {r.created_by_name && (
                    <p className="truncate">
                      Criado por:{" "}
                      <span className="text-foreground/95">{r.created_by_name}</span>
                    </p>
                  )}
                  <p className="truncate">Última alteração em {formatDate(r.updated_at)}</p>
                </div>
              </div>

              {r.has_been_used && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                  Modelo em uso — não pode ser editado. Use-o como base para criar um novo.
                </p>
              )}

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <form action={startChecklistCustomFill}>
                  <input type="hidden" name="custom_template_id" value={r.id} />
                  <Button type="submit" size="sm" className="w-full sm:w-auto">
                    <Play className="size-3.5" />
                    Preencher
                  </Button>
                </form>
                {!r.has_been_used && (
                  <Link
                    href={`/checklists/personalizados/${r.id}/editar`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full sm:w-auto")}
                  >
                    <Pencil className="size-3.5" />
                    Editar
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
