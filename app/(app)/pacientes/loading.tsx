import { PageLayout } from "@/components/layout/page-layout";

export default function PacientesLoading() {
  return (
    <PageLayout>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-8 w-36 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="h-9 min-w-0 flex-1 animate-pulse rounded-md bg-muted lg:max-w-xs" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted lg:w-48" />
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

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
    </PageLayout>
  );
}
