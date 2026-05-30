export default function ClientesLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Carregando clientes">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="h-9 flex-1 max-w-xs animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Lista */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
            <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
