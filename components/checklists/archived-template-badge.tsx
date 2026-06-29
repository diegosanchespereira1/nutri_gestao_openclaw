import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Etiqueta visual para modelos de checklist arquivados (soft-delete). */
export function ArchivedTemplateBadge({ className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      Arquivado
    </span>
  );
}
