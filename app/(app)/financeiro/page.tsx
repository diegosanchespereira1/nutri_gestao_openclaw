import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  createFinancialChargeAction,
  loadFinancialChargesForOwner,
  markFinancialChargePaidAction,
} from "@/lib/actions/financial-charges";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { loadCustomSegmentsAction } from "@/lib/actions/client-segments";
import { FinancialIssuedPaidBarChart } from "@/components/financeiro/financial-issued-paid-bar-chart";
import { FinancialReceivedBarChart } from "@/components/financeiro/financial-received-bar-chart";
import { FinancialTopOverdueBarChart } from "@/components/financeiro/financial-top-overdue-bar-chart";
import { FinancialChartCardTools } from "@/components/financeiro/financial-chart-card-tools";
import { FinanceiroPageTabs } from "@/components/financeiro/financeiro-page-tabs";
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
import { todayKey } from "@/lib/datetime/calendar-tz";
import {
  applyFinancialChargeFilters,
  parseChargeFilterClientId,
  parseChargeFilterStatus,
} from "@/lib/financeiro/charge-filters";
import { buildClientPaymentStatusRows } from "@/lib/financeiro/client-payment-status";
import {
  FIN_CHART_QUERY,
  chartWindowSummaryLabel,
  parseChartWindow,
  serializeChartWindow,
  type ResolvedChartWindow,
} from "@/lib/financeiro/chart-window";
import {
  buildFinancialIssuedVsPaidSeries,
  buildFinancialReceivedByMonthSeries,
  buildTopClientsByOverdueAmount,
  financialIssuedPaidSeriesHasData,
  financialReceivedSeriesHasData,
  oldestMonthFirstDayKeyInWindow,
  topOverdueDateBounds,
} from "@/lib/financeiro/financial-chart-series";
import { resolveFinanceiroInitialTab } from "@/lib/financeiro/financeiro-tab";
import {
  formatBRLFromCents,
  isOpenOverdue,
} from "@/lib/dashboard/financial-pending";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import type { FinancialChargeListRow } from "@/lib/types/financial-charges";
import { cn } from "@/lib/utils";

const errMessages: Record<string, string> = {
  invalid: "Preencha cliente, valor válido e data de vencimento.",
  client: "Cliente inválido ou sem permissão.",
  save: "Não foi possível salvar. Tente novamente.",
};

function chargeClientName(row: FinancialChargeListRow): string {
  const c = row.clients;
  if (!c) return "—";
  const t = c.trade_name?.trim();
  return t && t.length > 0 ? t : c.legal_name;
}

function clientListLabel(c: {
  legal_name: string;
  trade_name: string | null;
}): string {
  const t = c.trade_name?.trim();
  return t && t.length > 0 ? t : c.legal_name;
}

function spStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function formatDayKeyPtBr(dayKey: string): string {
  const [y, m, d] = dayKey.split("-");
  if (!y || !m || !d) return dayKey;
  return `${d}/${m}/${y}`;
}

type Props = {
  searchParams: Promise<{
    err?: string;
    status?: string;
    client?: string;
    tab?: string;
    m_rec?: string | string[];
    m_flux?: string | string[];
    m_atr?: string | string[];
    win_rec?: string | string[];
    win_flux?: string | string[];
    win_atr?: string | string[];
    from_rec?: string | string[];
    to_rec?: string | string[];
    from_flux?: string | string[];
    to_flux?: string | string[];
    from_atr?: string | string[];
    to_atr?: string | string[];
  }>;
};

function pickSp(
  sp: Record<string, string | string[] | undefined>,
  k: string,
): string | undefined {
  return spStr(sp[k]);
}

function chartSlugForFilename(w: ResolvedChartWindow): string {
  if (w.mode === "months") return `${w.months}m`;
  if (w.mode === "total") return "total";
  return `range-${w.fromDayKey}_to_${w.toDayKey}`;
}

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
  const sp = await searchParams;
  const errMsg = sp.err && errMessages[sp.err] ? errMessages[sp.err] : null;
  const filterStatus = parseChargeFilterStatus(sp.status);
  const filterClientId = parseChargeFilterClientId(sp.client);

  const [{ rows: charges }, { rows: clients }, customSegments] = await Promise.all([
    loadFinancialChargesForOwner(),
    loadClientsForOwner({}),
    loadCustomSegmentsAction(),
  ]);

  const filteredCharges = applyFinancialChargeFilters(
    charges,
    { status: filterStatus, clientId: filterClientId },
    tKey,
  );

  const clientPaymentRows = buildClientPaymentStatusRows(
    clients.map((c) => ({
      id: c.id,
      legal_name: c.legal_name,
      trade_name: c.trade_name,
    })),
    charges,
    tKey,
  );

  const hasActiveFilters =
    filterStatus !== "all" || filterClientId !== null;

  const initialTab = resolveFinanceiroInitialTab(
    sp.tab,
    Boolean(errMsg || hasActiveFilters),
  );

  const winReceived = parseChartWindow(
    FIN_CHART_QUERY.rec,
    (k) => pickSp(sp, k),
    tKey,
  );
  const winFlux = parseChartWindow(
    FIN_CHART_QUERY.flux,
    (k) => pickSp(sp, k),
    tKey,
  );
  const winAtr = parseChartWindow(
    FIN_CHART_QUERY.atr,
    (k) => pickSp(sp, k),
    tKey,
  );

  const receivedSeries = buildFinancialReceivedByMonthSeries(
    charges,
    tz,
    winReceived,
  );
  const issuedPaidSeries = buildFinancialIssuedVsPaidSeries(
    charges,
    tz,
    winFlux,
  );
  const overdueBounds = topOverdueDateBounds(winAtr, tz);
  const topOverdue = buildTopClientsByOverdueAmount(charges, tKey, 5, {
    minDueDateKey: overdueBounds.minDueDateKey ?? undefined,
    maxDueDateKey: overdueBounds.maxDueDateKey ?? undefined,
  });
  const showReceivedChart = financialReceivedSeriesHasData(receivedSeries);
  const showIssuedPaidChart = financialIssuedPaidSeriesHasData(issuedPaidSeries);
  const showTopOverdue = topOverdue.length > 0;

  const chartParamsPersist: Record<string, string> = {
    ...serializeChartWindow(FIN_CHART_QUERY.rec, winReceived),
    ...serializeChartWindow(FIN_CHART_QUERY.flux, winFlux),
    ...serializeChartWindow(FIN_CHART_QUERY.atr, winAtr),
  };

  const rangeDefaults = {
    fromDayKey: oldestMonthFirstDayKeyInWindow(6, tz),
    toDayKey: tKey,
  };

  const csvReceivedRows = receivedSeries.map((b) => [
    b.label,
    b.monthKey,
    b.receivedCents,
    formatBRLFromCents(b.receivedCents),
  ]);
  const csvFluxRows = issuedPaidSeries.map((b) => [
    b.label,
    b.monthKey,
    b.issuedCents,
    b.paidCents,
    formatBRLFromCents(b.issuedCents),
    formatBRLFromCents(b.paidCents),
  ]);
  const csvTopRows = topOverdue.map((r) => [
    r.clientId,
    r.label,
    r.overdueCents,
    formatBRLFromCents(r.overdueCents),
  ]);

  const operacoesQuery = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    p.set("tab", "operacoes");
    for (const [k, v] of Object.entries({ ...chartParamsPersist, ...extra })) {
      if (v) p.set(k, v);
    }
    return `/financeiro?${p.toString()}`;
  };

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
          <strong className="text-foreground font-medium">Resumo e análise</strong>{" "}
          com gráficos e estado por cliente;{" "}
          <strong className="text-foreground font-medium">
            Cobranças e registos
          </strong>{" "}
          para lançamentos, filtros e tabela (FR41).
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

      <FinanceiroPageTabs
        defaultTab={initialTab}
        resumo={
          <div className="space-y-8">
            <p className="text-muted-foreground max-w-2xl text-xs">
              Cada gráfico tem período independente: últimos N meses, total desde a
              primeira movimentação com dados até hoje, ou intervalo por datas (fuso{" "}
              {tz}). Recebido usa o mês do pagamento; «lançado» usa a criação da
              cobrança. O ranking filtra por intervalo de{" "}
              <strong className="text-foreground font-medium">data de vencimento</strong>{" "}
              conforme o modo escolhido. Cores e legenda seguem o padrão do módulo
              (alto contraste entre métricas).
            </p>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border bg-white shadow-xs ring-1 ring-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Recebido por mês
                  </CardTitle>
                  <CardDescription>
                    Soma das cobranças liquidadas pelo mês do pagamento.{" "}
                    <span className="text-foreground font-medium">
                      {chartWindowSummaryLabel(winReceived)}
                    </span>
                    .
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-0">
                  {showReceivedChart ? (
                    <FinancialReceivedBarChart data={receivedSeries} />
                  ) : (
                    <p className="text-muted-foreground py-8 text-center text-sm">
                      Ainda não há recebimentos registados neste período.
                    </p>
                  )}
                  <Suspense
                    fallback={
                      <div className="text-muted-foreground border-border mt-4 border-t pt-4 text-xs">
                        A carregar controlo do gráfico…
                      </div>
                    }
                  >
                    <FinancialChartCardTools
                      chartId="rec"
                      window={winReceived}
                      todayDayKey={tKey}
                      rangeDefaults={rangeDefaults}
                      csvFilename={`nutrigestao-recebido-${chartSlugForFilename(winReceived)}-${tKey}.csv`}
                      csvHeaders={[
                        "mes_rotulo",
                        "mes_YYYY-MM",
                        "recebido_centavos",
                        "recebido_BRL",
                      ]}
                      csvRows={csvReceivedRows}
                    />
                  </Suspense>
                </CardContent>
              </Card>

              <Card className="border-border bg-white shadow-xs ring-1 ring-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Lançado vs recebido
                  </CardTitle>
                  <CardDescription>
                    Novas cobranças criadas no mês face ao valor pago no mesmo mês.{" "}
                    <span className="text-foreground font-medium">
                      {chartWindowSummaryLabel(winFlux)}
                    </span>
                    .
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-0">
                  {showIssuedPaidChart ? (
                    <FinancialIssuedPaidBarChart data={issuedPaidSeries} />
                  ) : (
                    <p className="text-muted-foreground py-8 text-center text-sm">
                      Sem lançamentos ou pagamentos neste período.
                    </p>
                  )}
                  <Suspense
                    fallback={
                      <div className="text-muted-foreground border-border mt-4 border-t pt-4 text-xs">
                        A carregar controlo do gráfico…
                      </div>
                    }
                  >
                    <FinancialChartCardTools
                      chartId="flux"
                      window={winFlux}
                      todayDayKey={tKey}
                      rangeDefaults={rangeDefaults}
                      csvFilename={`nutrigestao-lancado-recebido-${chartSlugForFilename(winFlux)}-${tKey}.csv`}
                      csvHeaders={[
                        "mes_rotulo",
                        "mes_YYYY-MM",
                        "lancado_centavos",
                        "recebido_mes_centavos",
                        "lancado_BRL",
                        "recebido_mes_BRL",
                      ]}
                      csvRows={csvFluxRows}
                    />
                  </Suspense>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-white shadow-xs ring-1 ring-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Maior inadimplência (valor em atraso)
                </CardTitle>
                <CardDescription>
                  Top clientes por valor em cobranças abertas vencidas.{" "}
                  <span className="text-foreground font-medium">
                    {chartWindowSummaryLabel(winAtr)}
                  </span>
                  {winAtr.mode === "months" && overdueBounds.minDueDateKey ? (
                    <>
                      {" "}
                      — apenas vencimentos ≥{" "}
                      {formatDayKeyPtBr(overdueBounds.minDueDateKey)}.
                    </>
                  ) : null}
                  {winAtr.mode === "range" ? (
                    <> — filtro de vencimento alinhado ao intervalo de datas.</>
                  ) : null}
                  {winAtr.mode === "total" ? (
                    <> — todo o histórico de atraso até hoje.</>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-0">
                {showTopOverdue ? (
                  <FinancialTopOverdueBarChart data={topOverdue} />
                ) : (
                  <p className="text-muted-foreground py-6 text-center text-sm">
                    Nenhuma cobrança em atraso neste intervalo de vencimentos.
                  </p>
                )}
                <Suspense
                  fallback={
                    <div className="text-muted-foreground border-border mt-4 border-t pt-4 text-xs">
                      A carregar controlo do gráfico…
                    </div>
                  }
                >
                    <FinancialChartCardTools
                      chartId="atr"
                      window={winAtr}
                      todayDayKey={tKey}
                      rangeDefaults={rangeDefaults}
                      csvFilename={`nutrigestao-inadimplencia-top-${chartSlugForFilename(winAtr)}-${tKey}.csv`}
                    csvHeaders={[
                      "cliente_id",
                      "cliente",
                      "valor_atraso_centavos",
                      "valor_atraso_BRL",
                    ]}
                    csvRows={csvTopRows}
                  />
                </Suspense>
              </CardContent>
            </Card>

            <section aria-labelledby="estado-por-cliente-heading">
              <h2
                id="estado-por-cliente-heading"
                className="text-foreground mb-3 text-base font-semibold"
              >
                Estado de pagamento por cliente
              </h2>
              <p className="text-muted-foreground mb-4 max-w-2xl text-sm">
                Resumo da carteira. Abra em{" "}
                <span className="text-foreground font-medium">
                  Cobranças e registos
                </span>{" "}
                com filtro aplicado ou use o link por cliente.
              </p>
              {clients.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Adicione clientes para ver o estado de pagamento.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border bg-white">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-border border-b bg-primary/10 dark:bg-primary/15">
                      <tr>
                        <th className="text-foreground px-3 py-2 text-left font-bold">
                          Cliente
                        </th>
                        <th className="text-foreground px-3 py-2 text-left font-bold">
                          Em aberto
                        </th>
                        <th className="text-foreground px-3 py-2 text-left font-bold">
                          Em atraso
                        </th>
                        <th className="text-foreground px-3 py-2 text-left font-bold">
                          Valor em atraso
                        </th>
                        <th className="text-foreground px-3 py-2 text-left font-bold">
                          Pagas
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientPaymentRows.map((r) => (
                        <tr
                          key={r.clientId}
                          className="border-border border-b last:border-0"
                        >
                          <td className="px-3 py-2">
                            <Link
                              href={operacoesQuery({ client: r.clientId })}
                              className="text-primary font-medium underline-offset-4 hover:underline"
                            >
                              {r.displayName}
                            </Link>
                            {r.hasDelinquency ? (
                              <span className="text-muted-foreground ml-2 text-xs">
                                · inadimplência
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {r.openCount}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {r.overdueCount}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {formatBRLFromCents(r.overdueTotalCents)}
                          </td>
                          <td className="px-3 py-2 tabular-nums">
                            {r.paidCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        }
        operacoes={
          <div className="space-y-8">
            <section aria-labelledby="nova-cobranca-heading">
              <Card className="border-border bg-white shadow-xs ring-1 ring-border">
                <CardHeader className="border-border border-b pb-4">
                  <CardTitle id="nova-cobranca-heading" className="text-lg">
                    Nova cobrança
                  </CardTitle>
                  <CardDescription className="text-pretty">
                    Associe a cobrança a um cliente, defina o valor em reais e a
                    data de vencimento. A descrição ajuda a identificar o
                    lançamento na lista.
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
                            Primeiro filtre por segmento (chips abaixo). Depois
                            abra a seleção, pesquise pelo nome e escolha o
                            cliente.
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
                          customSegments={customSegments}
                        />
                      </div>

                      <Separator className="my-8" />

                      <div
                        className="space-y-3"
                        aria-labelledby="nova-cob-sec-detalhe"
                      >
                        <h3
                          id="nova-cob-sec-detalhe"
                          className="text-foreground text-sm font-semibold tracking-tight"
                        >
                          Detalhe da cobrança
                        </h3>
                        <div className="space-y-2">
                          <Label
                            htmlFor="fc-desc"
                            className="text-sm font-medium"
                          >
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
                            <Label
                              htmlFor="fc-amount"
                              className="text-sm font-medium"
                            >
                              Valor (R$)
                            </Label>
                            <FinancialChargeAmountInput
                              id="fc-amount"
                              name="amount"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor="fc-due"
                              className="text-sm font-medium"
                            >
                              Data de vencimento
                            </Label>
                            <Input
                              id="fc-due"
                              name="due_date"
                              type="date"
                              required
                              className="w-full max-w-[11rem]"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-border flex flex-col items-stretch gap-2 border-t bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-muted-foreground text-xs">
                        Ao salvar, a cobrança fica em aberto até marcar como
                        paga.
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

              {charges.length > 0 ? (
                <div className="mb-4 flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                  <form
                    className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
                    method="get"
                    action="/financeiro"
                  >
                    <input type="hidden" name="tab" value="operacoes" />
                    {Object.entries(chartParamsPersist).map(([k, v]) => (
                      <input key={k} type="hidden" name={k} value={v} />
                    ))}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="filtro-estado"
                        className="text-xs font-medium"
                      >
                        Estado da cobrança
                      </Label>
                      <select
                        id="filtro-estado"
                        name="status"
                        defaultValue={filterStatus}
                        className="border-input bg-background h-9 min-w-[11rem] rounded-md border px-2 text-sm shadow-xs"
                      >
                        <option value="all">Todas</option>
                        <option value="open">Em aberto</option>
                        <option value="overdue">Em atraso</option>
                        <option value="paid">Pagas</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="filtro-cliente"
                        className="text-xs font-medium"
                      >
                        Cliente
                      </Label>
                      <select
                        id="filtro-cliente"
                        name="client"
                        defaultValue={filterClientId ?? ""}
                        className="border-input bg-background h-9 min-w-[12rem] max-w-[20rem] rounded-md border px-2 text-sm shadow-xs"
                      >
                        <option value="">Todos</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {clientListLabel(c)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="sm">
                        Aplicar filtros
                      </Button>
                      {hasActiveFilters ? (
                        <Link
                          href="/financeiro?tab=operacoes"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "inline-flex h-9 items-center justify-center px-3",
                          )}
                        >
                          Limpar
                        </Link>
                      ) : null}
                    </div>
                  </form>
                  <nav
                    className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs"
                    aria-label="Atalhos de filtro"
                  >
                    <span className="font-medium text-foreground">Atalhos:</span>
                    <Link
                      href={operacoesQuery({ status: "overdue" })}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Só atraso
                    </Link>
                    <Link
                      href={operacoesQuery({ status: "open" })}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Só em aberto
                    </Link>
                    <Link
                      href={operacoesQuery({ status: "paid" })}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Só pagas
                    </Link>
                  </nav>
                </div>
              ) : null}

              {charges.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Ainda não há cobranças registadas.
                </p>
              ) : filteredCharges.length === 0 ? (
                <p className="text-muted-foreground text-sm" role="status">
                  Nenhuma cobrança corresponde aos filtros.{" "}
                  <Link
                    href="/financeiro?tab=operacoes"
                    className="text-primary font-medium underline-offset-4 hover:underline"
                  >
                    Limpar filtros
                  </Link>
                  .
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
                      {filteredCharges.map((row) => {
                        const overdue =
                          row.status === "open" &&
                          isOpenOverdue(row.due_date, tKey, row.status);
                        return (
                          <tr
                            key={row.id}
                            className="border-border border-b last:border-0"
                          >
                            <td className="px-3 py-2">
                              {chargeClientName(row)}
                            </td>
                            <td className="text-muted-foreground max-w-[200px] truncate px-3 py-2">
                              {row.description || "—"}
                            </td>
                            <td className="px-3 py-2 tabular-nums">
                              {formatBRLFromCents(row.amount_cents)}
                            </td>
                            <td className="px-3 py-2 tabular-nums">
                              {row.due_date}
                            </td>
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
        }
      />
    </div>
  );
}
