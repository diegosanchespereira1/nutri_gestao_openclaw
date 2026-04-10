import Link from "next/link";
import { Suspense } from "react";

import { RecipeListRowActions } from "@/components/technical-sheets/recipe-list-row-actions";
import { TemplateUseButton } from "@/components/technical-sheets/template-use-button";
import { RecipePagination } from "@/components/technical-sheets/recipe-pagination";
import { RecipeSearchInput } from "@/components/technical-sheets/recipe-search-input";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadTemplatesForOwner } from "@/lib/actions/technical-recipes";
import { RECIPE_LIST_PAGE_SIZE } from "@/lib/constants/recipe-list";
import { cn } from "@/lib/utils";
import type { TechnicalRecipeListItem } from "@/lib/types/technical-recipes";

function recipeContextLabel(row: TechnicalRecipeListItem): string {
  const est = row.establishments;
  if (!est?.name) return "—";
  const client = est.clients ?? undefined;
  const clientName =
    client?.trade_name?.trim() || client?.legal_name?.trim() || "Cliente";
  return `${clientName} — ${est.name}`;
}

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const [{ rows: templates, total, totalPages }, { rows: establishments }] =
    await Promise.all([
      loadTemplatesForOwner({ q, page, pageSize: RECIPE_LIST_PAGE_SIZE }),
      loadEstablishmentsForOwner(),
    ]);

  const hasEstablishments = establishments.length > 0;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Templates de fichas técnicas
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Use um template como base para criar uma nova receita. Os valores e
            fórmulas serão copiados para você editar.
          </p>
        </div>
        <Link
          href="/ficha-tecnica"
          className={buttonVariants({ variant: "outline" })}
        >
          ← Minhas receitas
        </Link>
      </div>

      {/* ── Barra de busca ── */}
      <Suspense fallback={null}>
        <RecipeSearchInput />
      </Suspense>

      {/* ── Lista vazia ── */}
      {templates.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          {q.length > 0 ? (
            <>
              Nenhum template encontrado para{" "}
              <span className="text-foreground font-medium">
                &ldquo;{q}&rdquo;
              </span>
              .
            </>
          ) : (
            "Nenhum template disponível."
          )}
        </div>
      ) : (
        <>
          {/* ── Tabela ── */}
          <div className="border-border overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-border border-b bg-primary/10 dark:bg-primary/15">
                <tr>
                  <th className="text-foreground px-4 py-3 text-left font-bold">
                    Template
                  </th>
                  <th className="text-foreground px-4 py-3 text-left font-bold">
                    Contexto
                  </th>
                  <th className="text-foreground px-4 py-3 text-left font-bold">
                    Porções
                  </th>
                  <th className="text-foreground px-4 py-3 text-left font-bold">
                    Atualizado
                  </th>
                  <th className="text-foreground px-4 py-3 text-right font-bold">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-foreground/5 last:border-0"
                  >
                    <td className="text-foreground px-4 py-3 font-medium">
                      {row.name}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {recipeContextLabel(row)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {row.portions_yield}
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap px-4 py-3">
                      {formatUpdatedAt(row.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <TemplateUseButton
                          templateId={row.id}
                          templateName={row.name}
                          establishments={establishments}
                          hasEstablishments={hasEstablishments}
                        />
                        <RecipeListRowActions
                          recipeId={row.id}
                          isTemplate={row.is_template}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Paginação ── */}
          <Suspense fallback={null}>
            <RecipePagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={RECIPE_LIST_PAGE_SIZE}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
