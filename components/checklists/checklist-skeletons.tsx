/**
 * Skeletons de carregamento das páginas de checklist.
 *
 * Renderizam sempre dentro do `<main>` (área de conteúdo), logo nunca cobrem a
 * sidebar/menu. Usados tanto nos `loading.tsx` de rota (streaming/transições)
 * como nos `Suspense fallback` das seções assíncronas.
 */

/** Skeleton do catálogo de templates (grade de cards). */
export function ChecklistCatalogSkeleton() {
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

/** Skeleton do assistente de preenchimento (cabeçalho + seção + itens + navegação). */
export function ChecklistFillSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="A carregar checklist"
    >
      <div className="h-8 w-56 max-w-[70%] animate-pulse rounded-lg bg-muted" />

      <div className="space-y-5 rounded-xl border border-border bg-card p-6">
        <div className="space-y-2">
          <div className="h-5 w-48 max-w-[60%] animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 max-w-[80%] animate-pulse rounded bg-muted" />
        </div>

        <div className="h-2 w-full animate-pulse rounded-full bg-muted" />

        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border border-border p-4"
            >
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="flex flex-wrap gap-2">
                <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
                <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
                <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-40 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}
