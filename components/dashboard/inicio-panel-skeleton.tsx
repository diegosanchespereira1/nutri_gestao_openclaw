import { cn } from "@/lib/utils";

function Block({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-muted", className)}
      aria-hidden
    />
  );
}

export function InicioClinicalPanelSkeleton() {
  return (
    <div
      className="space-y-4 rounded-xl border border-border bg-card p-4"
      role="status"
      aria-live="polite"
      aria-label="Carregando visitas e compliance"
    >
      <Block className="h-6 w-48" />
      <Block className="h-4 w-full max-w-xl" />
      <Block className="h-24 w-full" />
      <Block className="h-40 w-full" />
      <Block className="h-32 w-full" />
    </div>
  );
}

export function InicioFinancialPanelSkeleton() {
  return (
    <div
      className="space-y-4 rounded-xl border border-border bg-card p-4"
      role="status"
      aria-live="polite"
      aria-label="Carregando financeiro"
    >
      <Block className="h-6 w-36" />
      <Block className="h-4 w-full max-w-md" />
      <Block className="h-28 w-full" />
    </div>
  );
}
