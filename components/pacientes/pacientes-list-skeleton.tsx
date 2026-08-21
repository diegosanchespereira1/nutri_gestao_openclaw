export function PacientesListSkeleton() {
  return (
    <ul
      className="border-border overflow-hidden rounded-lg border bg-card shadow-sm"
      role="status"
      aria-live="polite"
      aria-label="Carregando pacientes"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="border-b border-border px-4 py-3 last:border-0">
          <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
          <div className="mt-2 h-3 w-32 animate-pulse rounded-md bg-muted" />
        </li>
      ))}
    </ul>
  );
}
