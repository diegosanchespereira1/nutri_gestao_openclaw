import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type Props = {
  visitTitle: string;
  contextLine: string;
  progressDone: number;
  progressTotal: number;
  detailHref: string;
  /** Quando true, não mostra contagem de itens (ex.: antes de escolher modelo). */
  progressHidden?: boolean;
};

export function VisitExecutionHeader({
  visitTitle,
  contextLine,
  progressDone,
  progressTotal,
  detailHref,
  progressHidden = false,
}: Props) {
  return (
    <header className="border-border flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Execução da visita
        </p>
        <h1 className="text-foreground text-xl font-semibold tracking-tight">
          {visitTitle}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{contextLine}</p>
        {!progressHidden && progressTotal > 0 ? (
          <p className="text-foreground mt-2 text-sm">
            Progresso: {progressDone} / {progressTotal} itens
          </p>
        ) : null}
        <p className="text-muted-foreground mt-2 text-xs">
          Rascunho guardado automaticamente ao responder cada item.
        </p>
      </div>
      <Link
        href={detailHref}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "min-h-11 min-w-[44px] shrink-0 self-start",
        )}
      >
        Sair
      </Link>
    </header>
  );
}
