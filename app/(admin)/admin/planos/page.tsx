// Story 10.2 — Planos, limites e add-ons (super_admin)

import { loadSubscriptionPlans } from "@/lib/actions/admin-platform";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

function formatCents(cents: number): string {
  if (cents === 0) return "Gratuito";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function limitLabel(v: number): string {
  return v === -1 ? "Ilimitado" : String(v);
}

export default async function PlanosPage() {
  const { rows: plans } = await loadSubscriptionPlans();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Planos e limites
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configuração de planos de assinatura e feature flags.
          </p>
        </div>
        <Link
          href="/admin"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Admin
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{p.name}</CardTitle>
                <Badge variant="secondary">{p.slug}</Badge>
                {!p.is_active && (
                  <Badge variant="destructive">Inativo</Badge>
                )}
              </div>
              {p.description && (
                <CardDescription>{p.description}</CardDescription>
              )}
              <div className="mt-1 space-y-0.5">
                <p className="text-foreground text-sm font-semibold">
                  {formatCents(p.price_monthly_cents)}
                  {p.price_monthly_cents > 0 && (
                    <span className="text-muted-foreground text-xs font-normal">
                      {" "}
                      /mês
                    </span>
                  )}
                </p>
                {p.price_annual_cents && (
                  <p className="text-muted-foreground text-xs">
                    {formatCents(p.price_annual_cents)} /ano
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Clientes:</span>
                <span>{limitLabel(p.max_clients)}</span>
                <span className="text-muted-foreground">Estabelecimentos:</span>
                <span>{limitLabel(p.max_establishments)}</span>
                <span className="text-muted-foreground">Membros equipe:</span>
                <span>{limitLabel(p.max_team_members)}</span>
                <span className="text-muted-foreground">Pacientes:</span>
                <span>{limitLabel(p.max_patients)}</span>
                <span className="text-muted-foreground">Storage:</span>
                <span>
                  {p.max_storage_mb === -1
                    ? "Ilimitado"
                    : `${p.max_storage_mb} MB`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <FeatureBadge label="Portal externo" enabled={p.feature_portal_externo} />
                <FeatureBadge label="Export PDF" enabled={p.feature_pdf_export} />
                <FeatureBadge label="Import CSV" enabled={p.feature_csv_import} />
                <FeatureBadge label="API access" enabled={p.feature_api_access} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-muted-foreground text-xs">
        Para editar planos, use o Supabase Dashboard (tabela{" "}
        <code className="bg-muted rounded px-1">subscription_plans</code>). Alterações
        refletem automaticamente na próxima sessão dos tenants.
      </p>
    </div>
  );
}

function FeatureBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <Badge
      variant={enabled ? "default" : "secondary"}
      className="text-xs"
    >
      {enabled ? "✓" : "✗"} {label}
    </Badge>
  );
}
