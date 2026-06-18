function ChecklistCatalogSkeleton() {
  return (
    <div
      className="space-y-4 rounded-xl border border-border bg-card p-6"
      aria-hidden
    >
      <div className="h-10 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

/** Skeleton inline — ocupa só o `<main>`, sem cobrir a sidebar (≥ lg). */
export default function ChecklistsLoading() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="A carregar checklists"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="h-8 w-36 max-w-[40%] animate-pulse rounded-lg bg-muted" />
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-40 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-44 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
      <ChecklistCatalogSkeleton />
    </div>
  );
}
