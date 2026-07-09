import Link from "next/link";

import { loadAccountClosureRequests } from "@/lib/actions/admin-account-closure-requests";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ACCOUNT_CLOSURE_STATUS_LABELS,
  type AccountClosureRequestStatus,
} from "@/lib/types/account-closure-request";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function statusVariant(
  status: AccountClosureRequestStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "confirmed") return "destructive";
  if (status === "cancelled" || status === "not_found") return "secondary";
  if (status === "failed" || status === "expired") return "outline";
  return "default";
}

export default async function AdminAccountClosureRequestsPage() {
  const { rows, pendingCount } = await loadAccountClosureRequests();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Pedidos de exclusão de conta
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Solicitações recebidas via{" "}
            <code className="text-xs">/excluir-conta</code> (Google Play / LGPD).
            {pendingCount > 0 ? (
              <>
                {" "}
                <strong className="text-foreground">{pendingCount}</strong>{" "}
                pendente(s).
              </>
            ) : null}
          </p>
        </div>
        <Link
          href="/admin"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Admin
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Últimos pedidos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum pedido registado.</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-border border-b text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Origem</th>
                  <th className="py-2 pr-3 font-medium">Solicitado</th>
                  <th className="py-2 pr-3 font-medium">Processado</th>
                  <th className="py-2 font-medium">Tenant</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-border/60 border-b align-top">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{row.email}</div>
                      {row.notes ? (
                        <p className="text-muted-foreground mt-1 max-w-xs text-xs">
                          {row.notes}
                        </p>
                      ) : null}
                      {row.failure_reason ? (
                        <p className="mt-1 text-xs text-amber-700">
                          {row.failure_reason}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">
                      <Badge variant={statusVariant(row.status)}>
                        {ACCOUNT_CLOSURE_STATUS_LABELS[row.status]}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground py-3 pr-3 text-xs">
                      {row.source === "public_web" ? "Web pública" : "App"}
                    </td>
                    <td className="text-muted-foreground py-3 pr-3 text-xs whitespace-nowrap">
                      {formatDateTime(row.requested_at)}
                    </td>
                    <td className="text-muted-foreground py-3 pr-3 text-xs whitespace-nowrap">
                      {formatDateTime(row.processed_at)}
                    </td>
                    <td className="py-3 text-xs">
                      {row.profile_id ? (
                        <Link
                          href={`/admin/tenants/${row.profile_id}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          Ver tenant
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
