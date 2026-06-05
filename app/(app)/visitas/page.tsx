import { Suspense } from "react";

import { VisitasAgendaSection } from "@/components/visits/visitas-agenda-section";

function VisitasAgendaSkeleton() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-live="polite"
      aria-label="Carregando agenda"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-[min(60vh,28rem)] animate-pulse rounded-xl border border-border bg-muted/40" />
    </div>
  );
}

export default function VisitasPage() {
  return (
    <Suspense fallback={<VisitasAgendaSkeleton />}>
      <VisitasAgendaSection />
    </Suspense>
  );
}
