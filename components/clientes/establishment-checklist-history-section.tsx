import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadChecklistSessionsForClient } from "@/lib/actions/checklist-history";
import { cn } from "@/lib/utils";

type Props = {
  clientId: string;
  establishmentId: string;
};

function formatDateBR(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Seção compacta de histórico de checklists para a página de um estabelecimento.
 * Server Component — sem estado client-side.
 */
export async function EstablishmentChecklistHistorySection({
  clientId,
  establishmentId,
}: Props) {
  const { rows } = await loadChecklistSessionsForClient({
    clientId,
    establishmentId,
    limit: 5,
    offset: 0,
  });

  if (rows.length === 0) {
    return (
      <div className="py-4 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Nenhum checklist realizado neste estabelecimento.
        </p>
        <Link
          href="/checklists"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Ir ao catálogo de checklists →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border/50 rounded-lg border border-border overflow-hidden">
        {rows.map((session) => (
          <li key={session.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {session.template_name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDateBR(session.updated_at)}
                {" · "}
                <span className="text-green-600 font-medium">{session.conformant_count}</span> OK
                {session.nc_count > 0 && (
                  <>
                    {" · "}
                    <span className="text-red-600 font-medium">{session.nc_count}</span> NC
                  </>
                )}
              </p>
            </div>
            <div className="shrink-0">
              {session.status === "aprovado" ? (
                <Badge className="bg-green-100 text-green-800 border-0 text-[10px] px-1.5 py-0">
                  Aprovado
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] px-1.5 py-0">
                  Em andamento
                </Badge>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Link
        href={`/clientes/${clientId}/checklists?est=${establishmentId}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full justify-center")}
      >
        Ver histórico completo →
      </Link>
    </div>
  );
}
