import Link from "next/link";
import { ClipboardList, ExternalLink } from "lucide-react";

import { ChecklistSessionHistoryCard } from "@/components/checklists/checklist-session-history-card";
import { buttonVariants } from "@/components/ui/button-variants";
import type { ChecklistSessionSummary } from "@/lib/actions/checklist-history";
import { cn } from "@/lib/utils";

type Props = {
  visitId: string;
  sessions: ChecklistSessionSummary[];
  latestApprovedSessionId: string | null;
  dossierEmailDeliveryConfigured: boolean;
  canReopenDossier: boolean;
};

export function VisitChecklistsSection({
  visitId,
  sessions,
  latestApprovedSessionId,
  dossierEmailDeliveryConfigured,
  canReopenDossier,
}: Props) {
  const returnTo = `/visitas/${visitId}`;
  const approvedCount = sessions.filter((s) => s.status === "aprovado").length;

  return (
    <section aria-labelledby="visita-checklists" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2
            id="visita-checklists"
            className="text-foreground text-sm font-medium"
          >
            Checklists desta visita
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {sessions.length === 0
              ? "Ainda não há preenchimento ligado a esta visita."
              : `${sessions.length} checklist${sessions.length !== 1 ? "s" : ""}${
                  approvedCount > 0
                    ? ` · ${approvedCount} com dossiê aprovado`
                    : ""
                }`}
          </p>
        </div>
        {latestApprovedSessionId ? (
          <Link
            href={`/checklists/preencher/${latestApprovedSessionId}?view=dossie&returnTo=${encodeURIComponent(returnTo)}`}
            className={cn(
              buttonVariants({ size: "sm" }),
              "min-h-11 gap-1.5",
            )}
          >
            <ClipboardList className="size-3.5" aria-hidden />
            Ver dossiê
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed px-4 py-6 text-center">
          <p className="text-muted-foreground text-sm">
            Inicie a visita e escolha um checklist para gerar o relatório aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <ChecklistSessionHistoryCard
              key={session.id}
              session={session}
              dossierEmailDeliveryConfigured={dossierEmailDeliveryConfigured}
              canReopenDossier={canReopenDossier}
              returnTo={returnTo}
            />
          ))}
        </div>
      )}
    </section>
  );
}
