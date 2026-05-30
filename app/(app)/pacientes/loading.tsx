export default function PacientesLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Carregando pacientes">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-44 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="h-9 flex-1 max-w-xs animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Lista */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-40 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-28 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
