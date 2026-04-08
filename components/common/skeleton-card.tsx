import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Componente base de skeleton
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-muted", className)}
      aria-hidden
    />
  );
}

/**
 * Skeleton para MetricCard — usar enquanto dados carregam.
 * Nunca usar spinner global; sempre skeleton contextual.
 */
export function SkeletonMetricCard() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 pt-4 px-5">
        <Skeleton className="h-3 w-28" />
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <Skeleton className="h-9 w-20 mb-2" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton para linha de tabela.
 */
export function SkeletonTableRow({ cols = 4 }: { cols?: number }) {
  const widths = ["w-36", "w-16", "w-24 ml-auto", "w-12 ml-auto"];
  return (
    <tr className="border-b">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={cn("h-4", widths[i % widths.length])} />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton para card genérico com linhas de texto.
 */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-4", i === lines - 2 ? "w-1/2" : "w-full")}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// Re-exportar Skeleton base para uso avulso
export { Skeleton };
