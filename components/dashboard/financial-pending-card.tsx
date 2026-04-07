import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type Props = {
  overdueCount: number;
  overdueTotalLabel: string;
};

/**
 * Resumo de cobranças em atraso no *dashboard* (Story 5.3 / FR52).
 */
export function FinancialPendingCard({ overdueCount, overdueTotalLabel }: Props) {
  const hasOverdue = overdueCount > 0;

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-5 text-sm",
        hasOverdue
          ? "border-amber-600/50 bg-amber-500/10 dark:bg-amber-950/40"
          : "border-border bg-background/60",
      )}
      role="status"
      aria-live="polite"
    >
      {hasOverdue ? (
        <>
          <p className="text-foreground font-medium">
            Pendências em atraso
          </p>
          <p className="text-foreground mt-2 text-lg font-semibold tabular-nums">
            {overdueTotalLabel}
          </p>
          <p className="text-muted-foreground mt-1">
            {overdueCount === 1
              ? "1 cobrança em atraso."
              : `${overdueCount} cobranças em atraso.`}
          </p>
        </>
      ) : (
        <>
          <p className="text-foreground font-medium">
            Sem valores em atraso
          </p>
          <p className="text-muted-foreground mt-2">
            Registe cobranças e vencimentos na área financeira para acompanhar
            inadimplência.
          </p>
        </>
      )}
      <div className="mt-4">
        <Link
          href={
            hasOverdue
              ? "/financeiro?tab=operacoes&status=overdue"
              : "/financeiro?tab=resumo"
          }
          className={cn(
            buttonVariants({ variant: hasOverdue ? "default" : "outline", size: "sm" }),
            "w-full justify-center sm:w-auto",
          )}
        >
          {hasOverdue ? "Ver pendências" : "Área financeira"}
        </Link>
      </div>
    </div>
  );
}
