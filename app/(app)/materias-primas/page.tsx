import Link from "next/link";
import { Suspense } from "react";
import { Coins, Package, Upload } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { DeleteRawMaterialButton } from "@/components/technical-sheets/delete-raw-material-button";
import { MateriasPrimasToolbar } from "@/components/technical-sheets/materias-primas-toolbar";
import { RecipeSearchInput } from "@/components/technical-sheets/recipe-search-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadRawMaterialsForOwner } from "@/lib/actions/raw-materials";
import {
  buildCurrentUrl,
  withReturnTo,
} from "@/lib/navigation/return-to";
import {
  RECIPE_LINE_UNIT_LABELS,
} from "@/lib/constants/recipe-line-units";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { countRecipesUsingRawMaterials } from "@/lib/technical-recipes/raw-material-recipe-impact";
import { cn } from "@/lib/utils";

function formatBrl(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

const errMessages: Record<string, string> = {
  invalid: "Pedido inválido.",
  save: "Não foi possível apagar. Tente novamente.",
};

type Props = {
  searchParams: Promise<{
    q?: string;
    err?: string;
    priceUpdated?: string;
    recipes?: string;
  }>;
};

export default async function MateriasPrimasPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const { err, priceUpdated, recipes } = sp;

  const [{ rows }, { supabase }] = await Promise.all([
    loadRawMaterialsForOwner({ q }),
    getServerContext(),
  ]);
  const impactByMaterialId = await countRecipesUsingRawMaterials(
    supabase,
    rows.map((r) => r.id),
  );

  const errMsg = err && errMessages[err] ? errMessages[err] : null;
  const recipesN = parseInt(String(recipes ?? "0"), 10);
  const showPriceBanner =
    priceUpdated === "1" && !errMsg && Number.isFinite(recipesN);
  const returnToOrigin = buildCurrentUrl("/materias-primas", sp);
  const novaHref = withReturnTo("/materias-primas/nova", returnToOrigin);

  return (
    <PageLayout>
      <PageHeader
        title="Matérias-primas"
        description="Registe o custo unitário de compra; nas receitas, ligue cada linha a uma matéria-prima para ver o custo estimado da ficha."
        actions={<MateriasPrimasToolbar novaHref={novaHref} />}
      />

      {errMsg ? (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{errMsg}</AlertDescription>
        </Alert>
      ) : null}

      {showPriceBanner ? (
        <Alert>
          <AlertTitle>Preço salvo</AlertTitle>
          <AlertDescription>
            {recipesN > 0 ? (
              <>
                Afeta {recipesN}{" "}
                {recipesN === 1 ? "receita" : "receitas"} — reabra cada ficha
                técnica para ver custos atualizados.
              </>
            ) : (
              <>Nenhuma linha de receita usa este item.</>
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* ── Busca e ações secundárias ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Suspense fallback={null}>
          <RecipeSearchInput
            basePath="/materias-primas"
            placeholder="Buscar matéria-prima por nome…"
            aria-label="Buscar matéria-prima por nome"
          />
        </Suspense>
        <nav
          className="flex flex-wrap items-center gap-2"
          aria-label="Upload em massa"
        >
          <Link
            href="/importar/materias-primas"
            className={cn(buttonVariants({ variant: "outline", size: "default" }))}
          >
            <Upload data-icon="inline-start" className="size-4" aria-hidden />
            Importar
          </Link>
          <Link
            href="/importar/materias-primas/atualizar-precos"
            className={cn(buttonVariants({ variant: "outline", size: "default" }))}
          >
            <Coins data-icon="inline-start" className="size-4" aria-hidden />
            Atualizar preços
          </Link>
        </nav>
      </div>

      {rows.length === 0 ? (
        q.length > 0 ? (
          <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Nenhuma matéria-prima encontrada para &ldquo;{q}&rdquo;.
            </p>
          </div>
        ) : (
          <EmptyState
            icon={Package}
            title="Ainda não há matérias-primas"
            description="Crie a primeira para associar às linhas das receitas, ou importe uma lista em massa."
            action={
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                <Link
                  href="/importar/materias-primas"
                  className={cn(buttonVariants({ variant: "outline", size: "default" }))}
                >
                  Importar
                </Link>
                <Link
                  href={novaHref}
                  className={cn(buttonVariants({ size: "default" }))}
                >
                  Nova matéria-prima
                </Link>
              </div>
            }
          />
        )
      ) : (
        <div className="border-border bg-card w-full min-w-0 overflow-x-auto rounded-lg border shadow-sm">
          <table className="w-full min-w-[640px] table-fixed text-left text-sm">
            <thead className="border-border border-b bg-primary/10 dark:bg-primary/15">
              <tr>
                <th className="text-foreground w-[42%] px-4 py-3 text-left font-bold">
                  Nome
                </th>
                <th className="text-foreground w-[14%] px-4 py-3 text-left font-bold">
                  Unidade
                </th>
                <th className="text-foreground w-[22%] px-4 py-3 text-left font-bold">
                  Preço unitário
                </th>
                <th className="text-foreground w-[22%] px-4 py-3 text-right font-bold">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-foreground/5 last:border-0"
                >
                  <td className="text-foreground truncate px-4 py-3 text-base font-semibold">
                    {row.name}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {RECIPE_LINE_UNIT_LABELS[row.price_unit]}
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap px-4 py-3">
                    {formatBrl(row.unit_price_brl)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={withReturnTo(
                          `/materias-primas/${row.id}/editar`,
                          returnToOrigin,
                        )}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        Editar
                      </Link>
                      <DeleteRawMaterialButton
                        id={row.id}
                        name={row.name}
                        recipesCount={impactByMaterialId.get(row.id) ?? 0}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}
