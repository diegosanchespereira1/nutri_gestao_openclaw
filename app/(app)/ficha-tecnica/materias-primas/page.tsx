import Link from "next/link";

import {
  deleteRawMaterialAction,
  loadRawMaterialsForOwner,
} from "@/lib/actions/raw-materials";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
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
  save: "Não foi possível eliminar. Tente novamente.",
};

type Props = {
  searchParams: Promise<{
    err?: string;
    priceUpdated?: string;
    recipes?: string;
  }>;
};

export default async function MateriasPrimasPage({ searchParams }: Props) {
  const { rows } = await loadRawMaterialsForOwner();
  const sp = await searchParams;
  const { err, priceUpdated, recipes } = sp;
  const errMsg = err && errMessages[err] ? errMessages[err] : null;
  const recipesN = parseInt(String(recipes ?? "0"), 10);
  const showPriceBanner =
    priceUpdated === "1" && !errMsg && Number.isFinite(recipesN);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/ficha-tecnica"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground -ml-2 mb-2",
            )}
          >
            ← Ficha técnica
          </Link>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Matérias-primas
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Registe o custo unitário de compra; nas receitas, ligue cada linha a
            uma matéria-prima para ver o custo estimado da ficha.
          </p>
        </div>
        <Link href="/ficha-tecnica/materias-primas/nova" className={buttonVariants()}>
          Nova matéria-prima
        </Link>
      </div>

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
                      <form action={deleteRawMaterialAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/40 hover:bg-destructive/10"
                        >
                          Eliminar
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
