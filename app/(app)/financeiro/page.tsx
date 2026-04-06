import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createFinancialChargeAction,
  loadFinancialChargesForOwner,
  markFinancialChargePaidAction,
} from "@/lib/actions/financial-charges";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { todayKey } from "@/lib/datetime/calendar-tz";
import {
  formatBRLFromCents,
  isOpenOverdue,
} from "@/lib/dashboard/financial-pending";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import type { FinancialChargeListRow } from "@/lib/types/financial-charges";
import { FinancialChargeAmountInput } from "@/components/financeiro/financial-charge-amount-input";
import { FinancialChargeClientPicker } from "@/components/financeiro/financial-charge-client-picker";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const errMessages: Record<string, string> = {
  invalid: "Preencha cliente, valor válido e data de vencimento.",
  client: "Cliente inválido ou sem permissão.",
  save: "Não foi possível guardar. Tente novamente.",
};

function chargeClientName(row: FinancialChargeListRow): string {
  const c = row.clients;
  if (!c) return "—";
  const t = c.trade_name?.trim();
  return t && t.length > 0 ? t : c.legal_name;
}

type Props = {
  searchParams: Promise<{ err?: string }>;
};

export default async function FinanceiroPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const tz = await fetchProfileTimeZone(supabase, user.id);
  const tKey = todayKey(new Date(), tz);
  const { err } = await searchParams;
  const errMsg = err && errMessages[err] ? errMessages[err] : null;

  const [{ rows: charges }, { rows: clients }] = await Promise.all([
    loadFinancialChargesForOwner(),
    loadClientsForOwner({}),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/inicio"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 mb-2",
          )}
        >
          ← Início
        </Link>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Financeiro
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cobranças por cliente e vencimento. Base para o controlo financeiro
          (épico 8); o resumo em atraso aparece no início.
        </p>
      </div>

      {errMsg ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          {errMsg}
        </div>
      ) : null}

      <section aria-labelledby="nova-cobranca-heading">
        <Card className="border-border bg-white shadow-xs ring-1 ring-border">
          <CardHeader className="border-border border-b pb-4">
            <CardTitle id="nova-cobranca-heading" className="text-lg">
              Nova cobrança
            </CardTitle>
            <CardDescription className="text-pretty">
              Associe a cobrança a um cliente, defina o valor em reais e a data de
              vencimento. A descrição ajuda a identificar o lançamento na lista.
            </CardDescription>
          </CardHeader>
          {clients.length === 0 ? (
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">
                Crie um{" "}
                <Link
                  href="/clientes/novo"
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  cliente
                </Link>{" "}
                antes de registar cobranças.
              </p>
            </CardContent>
          ) : (
            <form action={createFinancialChargeAction}>
              <CardContent className="space-y-0 pt-6">
                <div
                  className="space-y-3"
                  aria-labelledby="nova-cob-sec-cliente"
                >
                  <div className="space-y-1">
                    <h3
                      id="nova-cob-sec-cliente"
                      className="text-foreground text-sm font-semibold tracking-tight"
                    >
                      Cliente
                    </h3>
                    <p className="text-muted-foreground max-w-2xl text-xs leading-relaxed">
                      Primeiro filtre por segmento (chips abaixo). Depois abra a
                      seleção, pesquise pelo nome e escolha o cliente. Não há
                      lista dentro de outra lista: o filtro fica sempre visível.
                    </p>
                  </div>
                  <FinancialChargeClientPicker
                    id="fc-client"
                    required
                    clients={clients.map((c) => ({
                      id: c.id,
                      legal_name: c.legal_name,
                      trade_name: c.trade_name,
                      business_segment: c.business_segment,
                      kind: c.kind,
                    }))}
                  />
                </div>

                <Separator className="my-8" />

                <div className="space-y-3" aria-labelledby="nova-cob-sec-detalhe">
                  <h3
                    id="nova-cob-sec-detalhe"
                    className="text-foreground text-sm font-semibold tracking-tight"
                  >
                    Detalhe da cobrança
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="fc-desc" className="text-sm font-medium">
                      Descrição{" "}
                      <span className="text-muted-foreground font-normal">
                        (opcional)
                      </span>
                    </Label>
                    <Input
                      id="fc-desc"
                      name="description"
                      maxLength={500}
                      placeholder="Ex.: Mensalidade consultoria — abril"
                      className="max-w-xl"
                    />
                    <p className="text-muted-foreground text-xs">
                      Aparece na tabela de cobranças para distinguir lançamentos.
                    </p>
                  </div>
                </div>

                <Separator className="my-8" />

                <div
                  className="space-y-4"
                  aria-labelledby="nova-cob-sec-valor"
                >
                  <h3
                    id="nova-cob-sec-valor"
                    className="text-foreground text-sm font-semibold tracking-tight"
                  >
                    Valor e vencimento
                  </h3>
                  <div className="grid max-w-2xl gap-6 sm:grid-cols-2 sm:gap-8">
                    <div className="space-y-2">
                      <Label htmlFor="fc-amount" className="text-sm font-medium">
                        Valor (R$)
                      </Label>
                      <FinancialChargeAmountInput
                        id="fc-amount"
                        name="amount"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fc-due" className="text-sm font-medium">
                        Data de vencimento
                      </Label>
                      <Input
                        id="fc-due"
                        name="due_date"
                        type="date"
                        required
                        className="w-full max-w-[11rem]"
                      />
                      <p className="text-muted-foreground text-xs">
                        Usada para alertas e estado &quot;em atraso&quot;.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-border flex flex-col items-stretch gap-2 border-t bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground text-xs">
                  Ao guardar, a cobrança fica em aberto até marcar como paga.
                </p>
                <Button type="submit" className="sm:w-auto">
                  Registar cobrança
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </section>

      <section aria-labelledby="lista-cobrancas-heading">
        <h2
          id="lista-cobrancas-heading"
          className="text-foreground mb-3 text-base font-semibold"
        >
          Cobranças
        </h2>
        {charges.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ainda não há cobranças registadas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-border border-b bg-primary/10 dark:bg-primary/15">
                <tr>
                  <th className="text-foreground px-3 py-2 text-left font-bold">
                    Cliente
                  </th>
                  <th className="text-foreground px-3 py-2 text-left font-bold">
                    Descrição
                  </th>
                  <th className="text-foreground px-3 py-2 text-left font-bold">
                    Valor
                  </th>
                  <th className="text-foreground px-3 py-2 text-left font-bold">
                    Vencimento
                  </th>
                  <th className="text-foreground px-3 py-2 text-left font-bold">
                    Estado
                  </th>
                  <th className="w-36 px-3 py-2 text-left font-bold">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {charges.map((row) => {
                  const overdue =
                    row.status === "open" &&
                    isOpenOverdue(row.due_date, tKey, row.status);
                  return (
                    <tr
                      key={row.id}
                      className="border-border border-b last:border-0"
                    >
                      <td className="px-3 py-2">{chargeClientName(row)}</td>
                      <td className="text-muted-foreground max-w-[200px] truncate px-3 py-2">
                        {row.description || "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatBRLFromCents(row.amount_cents)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{row.due_date}</td>
                      <td className="px-3 py-2">
                        {row.status === "paid" ? (
                          <span
                            className={cn(
                              "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold",
                              "border-emerald-500/35 bg-emerald-500/12 text-emerald-900",
                              "dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100",
                            )}
                          >
                            Pago
                          </span>
                        ) : overdue ? (
                          <span
                            className={cn(
                              "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold",
                              "border-amber-500/40 bg-amber-500/12 text-amber-950",
                              "dark:border-amber-500/45 dark:bg-amber-500/15 dark:text-amber-100",
                            )}
                          >
                            Em atraso
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold",
                              "border-sky-500/35 bg-sky-500/10 text-sky-950",
                              "dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-100",
                            )}
                          >
                            Em aberto
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.status === "open" ? (
                          <form action={markFinancialChargePaidAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <Button
                              type="submit"
                              variant="default"
                              size="sm"
                              className={cn(
                                "cursor-pointer border-emerald-700 bg-emerald-600 text-white shadow-sm",
                                "hover:border-emerald-800 hover:bg-emerald-700 hover:text-white",
                                "active:border-emerald-900 active:bg-emerald-800",
                                "focus-visible:border-emerald-700 focus-visible:ring-emerald-500/45",
                              )}
                            >
                              Marcar pago
                            </Button>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
