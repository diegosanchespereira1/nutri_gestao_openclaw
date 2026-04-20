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
  const establishment = rows[0] ?? null;

  return (
    <section
      className="space-y-4"
      aria-labelledby="estabelecimento-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="estabelecimento-heading"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          Estabelecimento
        </h2>
        {/* Botão de adicionar só aparece quando ainda não existe estabelecimento */}
        {!establishment ? (
          <Link
            href={`/clientes/${clientId}/estabelecimentos/novo`}
            className={cn(buttonVariants())}
          >
            Adicionar estabelecimento
          </Link>
        ) : null}
      </div>
      <p className="text-muted-foreground text-sm">
        Unidade deste cliente PJ. O tipo orienta portarias e visitas.
        Cada cliente representa um único estabelecimento (1 CNPJ = 1 cadastro).
      </p>
      {!establishment ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Ainda não há estabelecimento cadastrado. Adicione os dados da unidade.
          </p>
          <Link
            href={`/clientes/${clientId}/estabelecimentos/novo`}
            className={cn(buttonVariants(), "mt-3 inline-flex")}
          >
            Adicionar estabelecimento
          </Link>
        </div>
      ) : (
        <div className="border-border overflow-hidden rounded-lg border">
          <Link
            href={`/clientes/${clientId}/estabelecimentos/${establishment.id}/editar`}
            className="hover:bg-muted/50 focus-visible:ring-ring block px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <span className="text-foreground font-medium">{establishment.name}</span>
            <span className="text-muted-foreground mt-1 block text-sm">
              {establishmentTypeLabel[establishment.establishment_type]} ·{" "}
              {establishment.address_line1}
              {establishment.city ? ` · ${establishment.city}` : ""}
              {establishment.state ? ` (${establishment.state})` : ""}
            </span>
          </Link>
        </div>
      )}
    </section>
  );
}
