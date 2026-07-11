import Link from "next/link";
import { Coins, Plus, Upload } from "lucide-react";

import { loadRawMaterialsForOwner } from "@/lib/actions/raw-materials";
import { countRecipesUsingRawMaterials } from "@/lib/technical-recipes/raw-material-recipe-impact";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { DeleteRawMaterialButton } from "@/components/technical-sheets/delete-raw-material-button";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  RECIPE_LINE_UNIT_LABELS,
} from "@/lib/constants/recipe-line-units";
import type { RawMaterialRow } from "@/lib/types/raw-materials";
import { cn } from "@/lib/utils";

function formatBrl(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function priceLabel(row: RawMaterialRow): string {
  const u = RECIPE_LINE_UNIT_LABELS[row.price_unit];
  return `${formatBrl(row.unit_price_brl)} / ${u}`;
}

const errMessages: Record<string, string> = {
  invalid: "Pedido inválido.",
  save: "Não foi possível apagar. Tente novamente.",
};

type Props = {
  searchParams: Promise<{
    err?: string;
    priceUpdated?: string;
    recipes?: string;
  }>;
};

export default async function MateriasPrimasPage({ searchParams }: Props) {
  const [{ rows }, { supabase }] = await Promise.all([
    loadRawMaterialsForOwner(),
    getServerContext(),
  ]);
  const impactByMaterialId = await countRecipesUsingRawMaterials(
    supabase,
    rows.map((r) => r.id),
  );

  const sp = await searchParams;
  const { err, priceUpdated, recipes } = sp;
  const errMsg = err && errMessages[err] ? errMessages[err] : null;
  const recipesN = parseInt(String(recipes ?? "0"), 10);
  const showPriceBanner =
    priceUpdated === "1" && !errMsg && Number.isFinite(recipesN);

  return (
    <PageLayout>
      <PageHeader
        title="Matérias-primas"
        description="Registe o custo unitário de compra; nas receitas, ligue cada linha a uma matéria-prima para ver o custo estimado da ficha."
        back={{ href: "/ficha-tecnica", label: "Ficha técnica" }}
        actions={
          <div
            className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
            role="toolbar"
            aria-label="Ações — matérias-primas"
          >
            <nav
              className="flex flex-wrap items-center gap-2"
              aria-label="Upload em massa"
            >
              <Link
                href="/importar/materias-primas"
                className={cn(buttonVariants({ variant: "outline", size: "default" }))}
              >
                <Upload data-icon="inline-start" className="size-4" aria-hidden />
                Importar em massa
              </Link>
              <Link
                href="/importar/materias-primas/atualizar-precos"
                className={cn(buttonVariants({ variant: "outline", size: "default" }))}
              >
                <Coins data-icon="inline-start" className="size-4" aria-hidden />
                Atualizar preços em massa
              </Link>
            </nav>

            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" aria-hidden />

            <Link
              href="/ficha-tecnica/materias-primas/nova"
              className={cn(buttonVariants({ variant: "default", size: "default" }))}
            >
              <Plus data-icon="inline-start" className="size-4" aria-hidden />
              Nova matéria-prima
            </Link>
          </div>
        }
      />

      {errMsg ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          {errMsg}
        </div>
      ) : null}

      {showPriceBanner ? (
        <div
          role="status"
          className="border-primary/35 bg-primary/10 text-foreground rounded-lg border px-4 py-3 text-sm"
        >
          Preço salvo.
          {recipesN > 0 ? (
            <>
              {" "}
              Afeta {recipesN}{" "}
              {recipesN === 1 ? "receita" : "receitas"} — reabra cada ficha
              técnica para ver custos atualizados.
            </>
          ) : (
            <> Nenhuma linha de receita usa este item.</>
          )}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Ainda não há matérias-primas. Crie a primeira para associar às linhas
          das receitas.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-border border-b bg-primary/10 dark:bg-primary/15">
              <tr>
                <th className="text-foreground px-4 py-3 text-left font-bold">
                  Nome
                </th>
                <th className="text-foreground px-4 py-3 text-left font-bold">
                  Preço unitário
                </th>
                <th className="text-foreground px-4 py-3 text-right font-bold">
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
                  <td className="text-foreground px-4 py-3 font-medium">
                    {row.name}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {priceLabel(row)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/ficha-tecnica/materias-primas/${row.id}/editar`}
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
