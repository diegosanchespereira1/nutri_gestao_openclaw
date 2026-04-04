import Link from "next/link";

import { loadEstablishmentsForClient } from "@/lib/actions/establishments";
import { buttonVariants } from "@/components/ui/button-variants";
import { establishmentTypeLabel } from "@/lib/constants/establishment-types";
import { cn } from "@/lib/utils";

export async function EstablishmentsSection({
  clientId,
}: {
  clientId: string;
}) {
  const { rows } = await loadEstablishmentsForClient(clientId);

  return (
    <section
      className="space-y-4"
      aria-labelledby="estabelecimentos-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="estabelecimentos-heading"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          Estabelecimentos
        </h2>
        <Link
          href={`/clientes/${clientId}/estabelecimentos/novo`}
          className={cn(buttonVariants())}
        >
          Adicionar estabelecimento
        </Link>
      </div>
      <p className="text-muted-foreground text-sm">
        Unidades deste cliente PJ. O tipo orienta portarias e visitas.
      </p>
      {rows.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Ainda não há estabelecimentos. Adicione a primeira unidade.
          </p>
          <Link
            href={`/clientes/${clientId}/estabelecimentos/novo`}
            className={cn(buttonVariants(), "mt-3 inline-flex")}
          >
            Adicionar estabelecimento
          </Link>
        </div>
      ) : (
        <ul
          className="border-border divide-border divide-y overflow-hidden rounded-lg border"
          aria-label="Lista de estabelecimentos"
        >
          {rows.map((e) => (
            <li key={e.id}>
              <Link
                href={`/clientes/${clientId}/estabelecimentos/${e.id}/editar`}
                className="hover:bg-muted/50 focus-visible:ring-ring block px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <span className="text-foreground font-medium">{e.name}</span>
                <span className="text-muted-foreground mt-1 block text-sm">
                  {establishmentTypeLabel[e.establishment_type]} ·{" "}
                  {e.address_line1}
                  {e.city ? ` · ${e.city}` : ""}
                  {e.state ? ` (${e.state})` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
