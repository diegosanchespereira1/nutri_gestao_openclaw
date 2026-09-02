import Link from "next/link";

import { loadSignupIntents } from "@/lib/actions/admin-signup-intents";
import { signupStatusLabel } from "@/lib/signup/abandonment";
import { formatBrDocument } from "@/lib/format/br-document";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SignupIntentStatus } from "@/lib/signup/types";

const FILTERS: Array<{ id: string; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "checkout", label: "Pagamento iniciado" },
  { id: "abandonado", label: "Abandonados" },
  { id: "conta_criada", label: "Convertidos" },
];

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function statusVariant(
  status: SignupIntentStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "abandonado") return "destructive";
  if (status === "conta_criada" || status === "pago") return "default";
  if (status === "checkout") return "secondary";
  return "outline";
}

export default async function AdminCadastrosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { rows, forbidden } = await loadSignupIntents(status);

  if (forbidden) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Cadastros</h1>
        <p className="text-muted-foreground text-sm">
          Apenas super admin pode ver tentativas de cadastro.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Cadastros públicos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Funil até o pagamento, incluindo sessões Stripe expiradas.
          </p>
        </div>
        <Link
          href="/admin"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Admin
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.id}
            href={
              filter.id === "todos"
                ? "/admin/cadastros"
                : `/admin/cadastros?status=${filter.id}`
            }
            className={cn(
              buttonVariants({
                size: "sm",
                variant:
                  (status ?? "todos") === filter.id ? "default" : "outline",
              }),
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{rows.length} registro(s)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma tentativa ainda.</p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="border-border space-y-1 rounded-lg border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(row.status)}>
                    {signupStatusLabel(row.status)}
                  </Badge>
                  <span className="font-medium">
                    {row.full_name || row.legal_name || row.email}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {row.email} · {row.phone} ·{" "}
                  {row.document_kind.toUpperCase()}{" "}
                  {formatBrDocument(row.document_id)}
                </p>
                <p className="text-muted-foreground text-xs">
                  Plano {row.plan_slug ?? "—"}{" "}
                  {row.billing_interval === "year"
                    ? "(anual)"
                    : row.billing_interval === "month"
                      ? "(mensal)"
                      : ""}
                  {" · "}
                  criado {formatWhen(row.created_at)}
                  {row.abandoned_at ? ` · abandonou ${formatWhen(row.abandoned_at)}` : ""}
                  {row.notified_at ? " · e-mail interno enviado" : ""}
                </p>
                {row.last_error ? (
                  <p className="text-destructive text-xs">{row.last_error}</p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
