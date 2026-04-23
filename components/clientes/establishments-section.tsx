import Link from "next/link";

import { loadEstablishmentsForClient } from "@/lib/actions/establishments";
import { establishmentTypeLabel } from "@/lib/constants/establishment-types";

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
          Gestão da unidade
        </h2>
      </div>
      <p className="text-muted-foreground text-sm">
        O nome, tipo e morada da unidade editam-se nos campos acima. Use o card abaixo
        para compliance, histórico de checklists deste local e pacientes.
      </p>
      {!establishment ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Preencha nome e morada nos campos acima e clique em{" "}
            <strong className="text-foreground font-medium">Salvar alterações</strong> no
            fim deste formulário.
          </p>
        </div>
      ) : (
        <div className="border-border overflow-hidden rounded-lg border bg-white">
          <Link
            href={`/clientes/${clientId}/estabelecimentos/${establishment.id}/editar`}
            className="hover:bg-muted/50 focus-visible:ring-ring block px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <span className="text-foreground font-medium">{establishment.name}</span>
            <span className="text-muted-foreground mt-1 block text-sm">
              {establishmentTypeLabel[establishment.establishment_type]}
              {establishment.address_line1 ? ` · ${establishment.address_line1}` : ""}
              {establishment.city ? ` · ${establishment.city}` : ""}
              {establishment.state ? ` (${establishment.state})` : ""}
            </span>
            <span className="text-muted-foreground mt-1 block text-xs">
              Clique para compliance, checklists e pacientes →
            </span>
          </Link>
        </div>
      )}

      {establishment ? (
        <p className="text-muted-foreground text-xs">
          Para atualizar nome, tipo ou morada no registo, altere os campos acima e use{" "}
          <strong className="text-foreground font-medium">Salvar alterações</strong> no
          fim do formulário.
        </p>
      ) : null}
    </section>
  );
}
