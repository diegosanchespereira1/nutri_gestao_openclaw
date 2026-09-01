import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import type { LimitUiState } from "@/lib/limits/tenant-limits";
import { cn } from "@/lib/utils";

/**
 * Botão de "novo registro" que se desabilita quando o limite foi atingido.
 * Plano: docs/plano-limites-tenant-e-billing.md §5.3
 *
 * Desabilitar antes é melhor que deixar preencher o formulário inteiro para
 * levar erro no fim. O motivo fica no `title`, não escondido.
 */
export function NewRecordButton({
  href,
  label,
  state,
  className,
}: {
  href: string;
  label: string;
  state: LimitUiState;
  className?: string;
}) {
  if (state.blocked) {
    return (
      <span
        className={cn(
          buttonVariants(),
          "pointer-events-auto cursor-not-allowed opacity-60",
          className,
        )}
        aria-disabled="true"
        role="link"
        title={state.message ?? undefined}
      >
        {label}
      </span>
    );
  }

  return (
    <Link href={href} prefetch className={cn(buttonVariants(), className)}>
      {label}
    </Link>
  );
}
