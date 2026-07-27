import Link from "next/link";

import { loadPatientsForScope } from "@/lib/actions/patients";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatCpfDisplay } from "@/lib/format/br-document";
import { withReturnTo } from "@/lib/navigation/return-to";
import { cn } from "@/lib/utils";

function formatBirthDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export async function PatientsSection(
  props:
    | { variant: "client_pf"; clientId: string; returnToOrigin: string }
    | {
        variant: "establishment";
        clientId: string;
        establishmentId: string;
        establishmentName: string;
        returnToOrigin: string;
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

  const novoHref = withReturnTo(
    props.variant === "client_pf"
      ? `/clientes/${props.clientId}/pacientes/novo`
      : `/clientes/${props.clientId}/estabelecimentos/${props.establishmentId}/pacientes/novo`,
    props.returnToOrigin,
  );

  const associarHref =
    props.variant === "establishment"
      ? withReturnTo(
          `/clientes/${props.clientId}/estabelecimentos/${props.establishmentId}/pacientes/associar`,
          props.returnToOrigin,
        )
      : null;

  const showGradeColumn = props.variant === "establishment";

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
        <div className="flex flex-wrap gap-2">
          {associarHref ? (
            <Link href={associarHref} className={cn(buttonVariants({ variant: "outline" }))}>
              Associar paciente existente
            </Link>
          ) : null}
          <Link href={novoHref} className={cn(buttonVariants())}>
            Novo paciente
          </Link>
        </div>
      </div>
      <p className="text-muted-foreground text-sm">{description}</p>
      {rows.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Ainda não há pacientes neste contexto.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {associarHref ? (
              <Link href={associarHref} className={cn(buttonVariants({ variant: "outline" }))}>
                Associar paciente existente
              </Link>
            ) : null}
            <Link href={novoHref} className={cn(buttonVariants())}>
              Novo paciente
            </Link>
          </div>
        </div>
      ) : (
        <div className="border-border overflow-x-auto rounded-lg border bg-white">
          <table className="w-full min-w-[520px] text-left text-sm" aria-label="Lista de pacientes">
            <thead className="border-border border-b bg-primary/10 dark:bg-primary/15">
              <tr>
                <th className="text-foreground px-4 py-3 font-bold">Nome</th>
                {showGradeColumn ? (
                  <th className="text-foreground px-4 py-3 font-bold">Série / turma</th>
                ) : null}
                <th className="text-foreground px-4 py-3 font-bold">Nascimento</th>
                <th className="text-foreground px-4 py-3 font-bold">CPF</th>
                <th className="text-foreground w-36 px-4 py-3 font-bold">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className="border-border border-b last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={withReturnTo(`/pacientes/${p.id}`, props.returnToOrigin)}
                      className="text-foreground font-medium hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      {p.full_name}
                    </Link>
                  </td>
                  {showGradeColumn ? (
                    <td className="text-muted-foreground px-4 py-3">
                      {p.school_grade_name ?? (
                        <span className="text-muted-foreground/70 italic">Sem série</span>
                      )}
                    </td>
                  ) : null}
                  <td className="text-muted-foreground px-4 py-3 tabular-nums">
                    {formatBirthDate(p.birth_date)}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 tabular-nums">
                    {p.document_id ? formatCpfDisplay(p.document_id) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={withReturnTo(`/pacientes/${p.id}`, props.returnToOrigin)}
                      className="text-primary text-sm font-medium hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      Ver prontuário →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
