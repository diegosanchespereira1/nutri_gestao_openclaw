import { PageLayout } from "@/components/layout/page-layout";

export default function SchoolNutritionOverviewLoading() {
  return (
    <PageLayout variant="wide">
      <div
        className="space-y-6"
        role="status"
        aria-live="polite"
        aria-label="A carregar visão nutricional"
      >
        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-8 w-72 max-w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 max-w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
