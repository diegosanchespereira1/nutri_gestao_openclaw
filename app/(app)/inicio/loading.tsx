export default function InicioLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Carregando painel">
      <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />

      {/* Cards de métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
            <div className="h-7 w-16 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>

      {/* Seção principal */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="h-5 w-32 animate-pulse rounded-md bg-muted" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-t border-border first:border-0">
              <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-36 animate-pulse rounded-md bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
              </div>
              <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="h-5 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}
