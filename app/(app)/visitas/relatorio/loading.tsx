export default function VisitasRelatorioLoading() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-live="polite"
      aria-label="Carregando relatório de visitas"
    >
      <div className="space-y-2">
        <div className="mb-2 h-8 w-28 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-72 max-w-full animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-40 animate-pulse rounded-2xl border border-border bg-muted/40" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
      </div>
    </div>
  );
}
