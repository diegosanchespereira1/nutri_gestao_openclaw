import Link from "next/link";
import { HeartPulse } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadAllPatientsForOwner } from "@/lib/actions/patients";
import { formatCpfDisplay } from "@/lib/format/br-document";
import { cn } from "@/lib/utils";

function parseSituacao(raw: string | undefined): "independente" | "all" {
  return raw === "independente" ? "independente" : "all";
}

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

export async function PacientesListSection({ searchParams: sp }: Props) {
  const q = typeof sp.q === "string" ? sp.q : "";
  const situacao = parseSituacao(
    typeof sp.situacao === "string" ? sp.situacao : undefined,
  );

  const { rows } = await loadAllPatientsForOwner({
    q,
    independente: situacao === "independente",
  });

  const hasFilters = !!(q || situacao !== "all");

  if (rows.length === 0) {
    return hasFilters ? (
      <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm">
          Nenhum paciente corresponde aos filtros.
        </p>
      </div>
    ) : (
      <EmptyState
        icon={HeartPulse}
        title="Nenhum paciente ainda"
        description="Adicione pacientes pessoas físicas. Pode associar a um cliente depois, se necessário."
        action={
          <Link href="/pacientes/novo" className={cn(buttonVariants())}>
            Criar paciente
          </Link>
        }
      />
    );
  }

  return (
    <ul
      className="border-border divide-border divide-y overflow-hidden rounded-lg border bg-card shadow-sm"
      aria-label="Lista de pacientes"
    >
      {rows.map((p) => {
        const clientCtx = p.clients?.legal_name;
        const estCtx = p.establishments?.name;
        const contextLabel = estCtx
          ? `${clientCtx} · ${estCtx}`
          : clientCtx ?? null;

        const cpfDisplay = p.document_id ? formatCpfDisplay(p.document_id) : null;
        const birthDisplay = p.birth_date ? String(p.birth_date).slice(0, 10) : null;

        return (
          <li key={p.id}>
            <Link
              href={`/pacientes/${p.id}`}
              prefetch
              className="hover:bg-muted/50 focus-visible:ring-ring flex items-start gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground font-medium leading-snug">
                    {p.full_name}
                  </span>
                  {!p.client_id ? (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Independente
                    </span>
                  ) : null}
                </div>
                {contextLabel ? (
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {contextLabel}
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-1 text-xs">
                  {birthDisplay ? `Nasc.: ${birthDisplay}` : null}
                  {cpfDisplay ? (
                    <span>
                      {birthDisplay ? " · " : ""}
                      CPF: ***.***.***-{cpfDisplay.slice(-2)}
                    </span>
                  ) : null}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
