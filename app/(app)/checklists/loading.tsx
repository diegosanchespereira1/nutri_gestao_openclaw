export default function ChecklistsLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Carregando checklists">
      <div className="flex items-start justify-between gap-4">
        <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />
        <div className="flex gap-2">
          <div className="h-8 w-36 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      {/* Estabelecimento selector */}
      <div className="h-10 w-full max-w-sm animate-pulse rounded-md bg-muted" />

      {/* Cards de templates */}
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="h-3 w-32 animate-pulse rounded-md bg-muted" />
            <div className="flex gap-2 pt-1">
              <div className="h-8 flex-1 animate-pulse rounded-md bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
