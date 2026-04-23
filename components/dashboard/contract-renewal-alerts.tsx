import Link from "next/link";

import type { ContractAlertRow } from "@/lib/types/client-contracts";
import { BILLING_RECURRENCE_LABELS } from "@/lib/types/client-contracts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { CalendarClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function clientDisplayName(row: ContractAlertRow): string {
  const c = row.clients;
  if (!c) return "—";
  const t = c.trade_name?.trim();
  return t && t.length > 0 ? t : c.legal_name;
}

function formatDateBR(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function urgencyVariant(days: number): {
  badge: "destructive" | "default" | "secondary";
  label: string;
} {
  if (days <= 7) return { badge: "destructive", label: `${days}d` };
  if (days <= 30) return { badge: "default", label: `${days}d` };
  return { badge: "secondary", label: `${days}d` };
}

type Props = {
  rows: ContractAlertRow[];
  withinDays?: number;
};

export function ContractRenewalAlerts({ rows, withinDays = 60 }: Props) {
  if (rows.length === 0) return null;

  return (
    <Alert className="border-amber-500/40 bg-amber-500/8 dark:bg-amber-500/10">
      <CalendarClockIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        {rows.length === 1
          ? "1 contrato a vencer nos próximos"
          : `${rows.length} contratos a vencer nos próximos`}{" "}
        {withinDays} dias
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <ul className="space-y-1.5" role="list">
          {rows.map((r) => {
            const { badge, label } = urgencyVariant(r.days_until_expiry);
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={badge} className="tabular-nums">
                  {label}
                </Badge>
                <span className="text-amber-950 dark:text-amber-100 font-medium">
                  {clientDisplayName(r)}
                </span>
                <span className="text-amber-800 dark:text-amber-200 text-xs">
                  {BILLING_RECURRENCE_LABELS[r.billing_recurrence]} — vence{" "}
                  {formatDateBR(r.contract_end_date)}
                </span>
                <Link
                  href={`/clientes/${r.client_id}/editar?tab=financeiro`}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-auto px-2 py-0.5 text-xs text-amber-700 hover:text-amber-900 dark:text-amber-300",
                  )}
                >
                  Renovar →
                </Link>
              </li>
            );
          })}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
