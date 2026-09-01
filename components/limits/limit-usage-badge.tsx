import { Badge } from "@/components/ui/badge";
import type { LimitUiState } from "@/lib/limits/tenant-limits";
import { cn } from "@/lib/utils";

/**
 * Badge de uso do limite: `18/25 clientes`.
 * Plano: docs/plano-limites-tenant-e-billing.md §5.3
 *
 * Não renderiza nada quando não há limite aplicável — o tenant sem limite não
 * precisa ver contador nenhum.
 */
export function LimitUsageBadge({
  state,
  noun,
  className,
}: {
  state: LimitUiState;
  /** Substantivo no plural: "clientes", "pacientes", "membros". */
  noun: string;
  className?: string;
}) {
  if (state.limit === null) return null;

  const perto = state.remaining !== null && state.remaining <= 3;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal",
        state.blocked
          ? "border-destructive/40 text-destructive"
          : perto
            ? "border-amber-500/50 text-amber-700 dark:text-amber-300"
            : "text-muted-foreground",
        className,
      )}
      title={state.message ?? undefined}
    >
      {state.used}/{state.limit} {noun}
    </Badge>
  );
}
