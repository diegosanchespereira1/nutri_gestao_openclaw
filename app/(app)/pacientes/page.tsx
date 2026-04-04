import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { loadAllPatientsForOwner } from "@/lib/actions/patients";
import { formatCpfDisplay } from "@/lib/format/br-document";
import { cn } from "@/lib/utils";

export default async function PacientesPage() {
  const { rows } = await loadAllPatientsForOwner();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Pacientes
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Todos os pacientes da sua conta, por cliente e estabelecimento.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Ainda não há pacientes. Crie-os a partir de um cliente PF ou de um
            estabelecimento PJ.
          </p>
          <Link href="/clientes" className={cn(buttonVariants(), "mt-4 inline-flex")}>
            Ir para clientes
          </Link>
        </div>
      ) : (
        <ul
          className="border-border divide-border divide-y overflow-hidden rounded-lg border"
          aria-label="Lista de pacientes"
        >
          {rows.map((p) => {
            const clientName = p.clients?.legal_name ?? "Cliente";
            const ctx =
              p.establishment_id && p.establishments?.name
                ? `${clientName} · ${p.establishments.name}`
                : `${clientName} (particular)`;

            return (
              <li key={p.id}>
                <Link
                  href={`/pacientes/${p.id}/editar`}
                  className="hover:bg-muted/50 focus-visible:ring-ring block px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <span className="text-foreground font-medium">
                    {p.full_name}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-sm">
                    {ctx}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {p.birth_date
                      ? `Nasc.: ${String(p.birth_date).slice(0, 10)}`
                      : null}
                    {p.document_id
                      ? ` · CPF: ${formatCpfDisplay(p.document_id)}`
                      : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
