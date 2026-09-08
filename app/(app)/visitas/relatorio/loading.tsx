export default function VisitasRelatorioLoading() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-live="polite"
      aria-label="Carregando relatório de visitas"
    >
      <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
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
