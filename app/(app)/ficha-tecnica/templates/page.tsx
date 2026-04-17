import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { RecipeListRowActions } from "@/components/technical-sheets/recipe-list-row-actions";
import { TemplateUseButton } from "@/components/technical-sheets/template-use-button";
import { RecipePagination } from "@/components/technical-sheets/recipe-pagination";
import { RecipeSearchInput } from "@/components/technical-sheets/recipe-search-input";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadTemplatesForOwner } from "@/lib/actions/technical-recipes";
import { RECIPE_LIST_PAGE_SIZE } from "@/lib/constants/recipe-list";
import {
  recipeClientIdForListRow,
  recipeContextLabel,
} from "@/lib/utils/technical-recipe-list-labels";

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
    <PageLayout>
      <PageHeader
        title="Repositório de Receitas"
        description="Receitas genéricas e reutilizáveis. Use como modelo para criar uma nova receita num estabelecimento — os dados são copiados e ficam independentes."
        back={{ href: "/ficha-tecnica", label: "Ficha técnica" }}
      />

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
          <div className="border-border bg-card overflow-x-auto rounded-lg border shadow-sm">
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
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-foreground/5 last:border-0"
                  >
                    <td className="text-foreground px-4 py-3 text-base font-semibold">
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
                      <div
                        className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
                        role="group"
                        aria-label="Ações do template"
                      >
                        <TemplateUseButton
                          templateId={row.id}
                          templateName={row.name}
                          establishments={establishments}
                          hasEstablishments={hasEstablishments}
                        />
                        <RecipeListRowActions
                          recipeId={row.id}
                          isTemplate={row.is_template}
                          clientId={recipeClientIdForListRow(row)}
                          isTemplateFavorite={row.is_template_favorite ?? false}
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
    </PageLayout>
  );
}
