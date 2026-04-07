import { isOpenOverdue } from "@/lib/dashboard/financial-pending";
import type { FinancialChargeListRow } from "@/lib/types/financial-charges";

export type ClientPaymentStatusRow = {
  clientId: string;
  displayName: string;
  openCount: number;
  overdueCount: number;
  openTotalCents: number;
  overdueTotalCents: number;
  paidCount: number;
  /** Há pelo menos uma cobrança em aberto vencida (inadimplência). */
  hasDelinquency: boolean;
};

type ClientLabel = {
  id: string;
  legal_name: string;
  trade_name: string | null;
};

function clientDisplayName(c: ClientLabel): string {
  const t = c.trade_name?.trim();
  return t && t.length > 0 ? t : c.legal_name;
}

/**
 * Estado de pagamento agregado por cliente (FR41 / Story 8.1).
 * Inclui todos os clientes da carteira; contagem zero quando não há cobranças.
 */
export function buildClientPaymentStatusRows(
  clients: ClientLabel[],
  charges: FinancialChargeListRow[],
  todayKey: string,
): ClientPaymentStatusRow[] {
  const byClient = new Map<
    string,
    {
      openCount: number;
      overdueCount: number;
      openTotalCents: number;
      overdueTotalCents: number;
      paidCount: number;
    }
  >();

  for (const cl of clients) {
    byClient.set(cl.id, {
      openCount: 0,
      overdueCount: 0,
      openTotalCents: 0,
      overdueTotalCents: 0,
      paidCount: 0,
    });
  }

  for (const ch of charges) {
    const agg = byClient.get(ch.client_id);
    if (!agg) continue;

    if (ch.status === "paid") {
      agg.paidCount += 1;
      continue;
    }

    agg.openCount += 1;
    agg.openTotalCents += ch.amount_cents;
    if (isOpenOverdue(ch.due_date, todayKey, ch.status)) {
      agg.overdueCount += 1;
      agg.overdueTotalCents += ch.amount_cents;
    }
  }

  const rows: ClientPaymentStatusRow[] = clients.map((cl) => {
    const agg = byClient.get(cl.id)!;
    return {
      clientId: cl.id,
      displayName: clientDisplayName(cl),
      openCount: agg.openCount,
      overdueCount: agg.overdueCount,
      openTotalCents: agg.openTotalCents,
      overdueTotalCents: agg.overdueTotalCents,
      paidCount: agg.paidCount,
      hasDelinquency: agg.overdueCount > 0,
    };
  });

  rows.sort((a, b) => {
    if (a.hasDelinquency !== b.hasDelinquency) {
      return a.hasDelinquency ? -1 : 1;
    }
    if (b.overdueTotalCents !== a.overdueTotalCents) {
      return b.overdueTotalCents - a.overdueTotalCents;
    }
    return a.displayName.localeCompare(b.displayName, "pt-BR");
  });

  return rows;
}

/** Métricas para um único cliente (ex.: ficha do cliente). */
export function metricsFromClientCharges(
  charges: FinancialChargeListRow[],
  todayKey: string,
): {
  openCount: number;
  overdueCount: number;
  openTotalCents: number;
  overdueTotalCents: number;
  paidCount: number;
  hasDelinquency: boolean;
} {
  let openCount = 0;
  let overdueCount = 0;
  let openTotalCents = 0;
  let overdueTotalCents = 0;
  let paidCount = 0;

  for (const ch of charges) {
    if (ch.status === "paid") {
      paidCount += 1;
      continue;
    }
    openCount += 1;
    openTotalCents += ch.amount_cents;
    if (isOpenOverdue(ch.due_date, todayKey, ch.status)) {
      overdueCount += 1;
      overdueTotalCents += ch.amount_cents;
    }
  }

  return {
    openCount,
    overdueCount,
    openTotalCents,
    overdueTotalCents,
    paidCount,
    hasDelinquency: overdueCount > 0,
  };
}
