import Link from "next/link";
import { Suspense } from "react";
import { ClipboardList } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button-variants";
import { FichaTecnicaToolbar } from "@/components/technical-sheets/ficha-tecnica-toolbar";
import { RecipePagination } from "@/components/technical-sheets/recipe-pagination";
import { RecipeSearchInput } from "@/components/technical-sheets/recipe-search-input";
import { RecipeListTable } from "@/components/technical-sheets/recipe-list-table";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { RECIPE_LIST_PAGE_SIZE } from "@/lib/constants/recipe-list";
import { loadTechnicalRecipesForOwner } from "@/lib/actions/technical-recipes";
import { cn } from "@/lib/utils";

// ── page ─────────────────────────────────────────────────────────────────────

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function FichaTecnicaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const [
    { rows: recipes, total, totalPages },
    { rows: establishments },
    { rows: pjClients },
  ] = await Promise.all([
    loadTechnicalRecipesForOwner({ q, page, pageSize: RECIPE_LIST_PAGE_SIZE }),
    loadEstablishmentsForOwner(),
    loadClientsForOwner({ kind: "pj" }),
  ]);

  const hasEstablishments = establishments.length > 0;
  const canCreateRecipe = hasEstablishments || pjClients.length > 0;

  return (
    <PageLayout>
      <PageHeader
        title="Ficha técnica"
        description="Receitas com ingredientes, TACO e custo por matéria-prima. Exporte PDF a partir de cada linha ou na edição da receita."
        actions={
          <FichaTecnicaToolbar canCreateRecipe={canCreateRecipe} />
        }
      />

      {!canCreateRecipe && (
        <Alert>
          <AlertTitle>Cliente PJ necessário</AlertTitle>
          <AlertDescription>
            Precisa de um cliente pessoa jurídica para criar receitas (pode
            associar a um estabelecimento ou salvar no repositório de
            receitas).{" "}
            <Link
              href="/clientes/novo"
              className="text-primary font-medium underline underline-offset-4 hover:no-underline"
            >
              Criar cliente
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Barra de busca ── */}
      <Suspense fallback={null}>
        <RecipeSearchInput />
      </Suspense>

      {/* ── Lista vazia ── */}
      {recipes.length === 0 ? (
        q.length > 0 ? (
          <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Nenhuma ficha técnica encontrada para{" "}
              <span className="text-foreground font-medium">
                &ldquo;{q}&rdquo;
              </span>
              .
            </p>
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Ainda não há receitas"
            description="Adicione ingredientes, ligações TACO e custos por matéria-prima. Pode começar por um template ou criar uma receita nova."
            action={
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                <Link
                  href="/ficha-tecnica/templates"
                  className={cn(buttonVariants({ variant: "outline", size: "default" }))}
                >
                  Ver templates
                </Link>
                <Link
                  href="/ficha-tecnica/nova"
                  className={cn(
                    buttonVariants({ size: "default" }),
                    !canCreateRecipe && "pointer-events-none opacity-50",
                  )}
                  aria-disabled={!canCreateRecipe}
                >
                  Nova receita
                </Link>
              </div>
            }
          />
        )
      ) : (
        <>
          {/* ── Tabela com modal de detalhes ── */}
          <RecipeListTable recipes={recipes} />

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
