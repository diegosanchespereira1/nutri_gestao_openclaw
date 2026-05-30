export default function VisitasLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Carregando visitas">
      <div className="flex items-center justify-between">
        <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Cards de visita */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="h-5 w-56 animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-40 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-3 w-32 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
