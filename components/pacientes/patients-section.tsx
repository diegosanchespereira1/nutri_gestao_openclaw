import Link from "next/link";

import { loadPatientsForScope } from "@/lib/actions/patients";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatCpfDisplay } from "@/lib/format/br-document";
import { cn } from "@/lib/utils";

export async function PatientsSection(
  props:
    | { variant: "client_pf"; clientId: string }
    | {
        variant: "establishment";
        clientId: string;
        establishmentId: string;
        establishmentName: string;
      },
) {
  const { rows } = await loadPatientsForScope(
    props.variant === "client_pf"
      ? { variant: "client_pf", clientId: props.clientId }
      : {
          variant: "establishment",
          clientId: props.clientId,
          establishmentId: props.establishmentId,
        },
  );

  const novoHref =
    props.variant === "client_pf"
      ? `/clientes/${props.clientId}/pacientes/novo`
      : `/clientes/${props.clientId}/estabelecimentos/${props.establishmentId}/pacientes/novo`;

  const title =
    props.variant === "client_pf"
      ? "Pacientes (atendimento particular)"
      : "Pacientes deste estabelecimento";

  const description =
    props.variant === "client_pf"
      ? "Pacientes ligados diretamente a este cliente PF."
      : `Pacientes acompanhados em ${props.establishmentName}.`;

  return (
    <section className="space-y-4" aria-labelledby="patients-section-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id="patients-section-heading"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          {title}
        </h2>
        <Link href={novoHref} className={cn(buttonVariants())}>
          Novo paciente
        </Link>
      </div>
      <p className="text-muted-foreground text-sm">{description}</p>
      {rows.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Ainda não há pacientes neste contexto.
          </p>
          <Link href={novoHref} className={cn(buttonVariants(), "mt-3 inline-flex")}>
            Adicionar paciente
          </Link>
        </div>
      ) : (
        <ul
          className="border-border divide-border divide-y overflow-hidden rounded-lg border"
          aria-label="Lista de pacientes"
        >
          {rows.map((p) => (
            <li key={p.id}>
              <Link
                href={`/pacientes/${p.id}/editar`}
                className="hover:bg-muted/50 focus-visible:ring-ring block px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <span className="text-foreground font-medium">
                  {p.full_name}
                </span>
                <span className="text-muted-foreground mt-1 block text-sm">
                  {p.birth_date
                    ? `Nasc.: ${p.birth_date}`
                    : "Data de nascimento não indicada"}
                  {p.document_id
                    ? ` · CPF: ${formatCpfDisplay(p.document_id)}`
                    : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
