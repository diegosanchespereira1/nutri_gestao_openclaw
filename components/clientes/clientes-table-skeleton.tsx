export function ClientesTableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      role="status"
      aria-live="polite"
      aria-label="Carregando clientes"
    >
      <div className="space-y-3 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}
