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
import type { ClientRow } from "@/lib/types/clients";
import type { FinancialChargeListRow } from "@/lib/types/financial-charges";
import { buttonVariants } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const errMessages: Record<string, string> = {
  invalid: "Preencha cliente, valor válido e data de vencimento.",
  client: "Cliente inválido ou sem permissão.",
  save: "Não foi possível guardar. Tente novamente.",
};

function clientLabel(row: ClientRow): string {
  const t = row.trade_name?.trim();
  return t && t.length > 0 ? t : row.legal_name;
}

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

      <section
        className="border-border rounded-xl border p-4 sm:p-5"
        aria-labelledby="nova-cobranca-heading"
      >
        <h2
          id="nova-cobranca-heading"
          className="text-foreground mb-4 text-base font-semibold"
        >
          Nova cobrança
        </h2>
        {clients.length === 0 ? (
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
        ) : (
          <form action={createFinancialChargeAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fc-client">Cliente</Label>
              <select
                id="fc-client"
                name="client_id"
                required
                className={cn(
                  "border-input bg-background h-8 w-full max-w-md rounded-lg border px-2.5 text-sm",
                  "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                )}
                defaultValue=""
              >
                <option value="" disabled>
                  Selecionar…
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {clientLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fc-desc">Descrição (opcional)</Label>
              <Input
                id="fc-desc"
                name="description"
                maxLength={500}
                placeholder="Ex.: Mensalidade consultoria"
                className="max-w-md"
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label htmlFor="fc-amount">Valor (R$)</Label>
                <Input
                  id="fc-amount"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0,00"
                  className="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fc-due">Vencimento</Label>
                <Input
                  id="fc-due"
                  name="due_date"
                  type="date"
                  required
                  className="w-44"
                />
              </div>
            </div>
            <Button type="submit">Registar cobrança</Button>
          </form>
        )}
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
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Descrição</th>
                  <th className="px-3 py-2 font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Vencimento</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium w-36" />
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
                          <span className="text-muted-foreground">Pago</span>
                        ) : overdue ? (
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            Em atraso
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Em aberto</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.status === "open" ? (
                          <form action={markFinancialChargePaidAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <Button type="submit" variant="outline" size="sm">
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
