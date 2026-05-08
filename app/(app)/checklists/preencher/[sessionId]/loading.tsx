"use client";

export default function ChecklistPreencherLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Carregando checklist">
      <div className="space-y-2">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-4 h-5 w-48 animate-pulse rounded-md bg-muted" />
        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-24 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-4 h-5 w-52 animate-pulse rounded-md bg-muted" />
        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-24 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}
