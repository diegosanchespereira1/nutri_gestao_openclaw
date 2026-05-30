export default function EditarClienteLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Carregando dados do cliente">
      {/* Avatar + título */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="size-12 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 border-b border-border pb-0">
        {[88, 120, 96, 110, 104].map((w, i) => (
          <div
            key={i}
            className="animate-pulse rounded-t-md bg-muted h-8 mb-[-1px]"
            style={{ width: w }}
          />
        ))}
      </div>

      {/* Card do formulário */}
      <div className="max-w-3xl rounded-xl border border-border bg-card shadow-sm">
        {/* Tabs internas do formulário */}
        <div className="flex gap-1 border-b border-border px-4 pt-3">
          {[80, 110, 90, 100].map((w, i) => (
            <div key={i} className="h-7 animate-pulse rounded-md bg-muted" style={{ width: w }} />
          ))}
        </div>

        {/* Campos */}
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded-md bg-muted" />
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          </div>
        </div>

        {/* Footer do card */}
        <div className="flex justify-end border-t border-border px-6 py-4">
          <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}
