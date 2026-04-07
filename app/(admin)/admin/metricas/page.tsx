// Story 10.3 — Métricas da plataforma (super_admin)

import { loadPlatformMetrics, loadSubscriptionPlans } from "@/lib/actions/admin-platform";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number | string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-foreground text-3xl font-bold tabular-nums">{value}</p>
        {description && (
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function MetricasPage() {
  const [{ metrics }, { rows: plans }] = await Promise.all([
    loadPlatformMetrics(),
    loadSubscriptionPlans(),
  ]);

  const planMap = Object.fromEntries(plans.map((p) => [p.slug, p.name]));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Métricas da plataforma
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Visão agregada — sem dados clínicos individuais.
          </p>
        </div>
        <Link
          href="/admin"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Admin
        </Link>
      </div>

      {!metrics ? (
        <p className="text-muted-foreground text-sm">
          Não foi possível carregar métricas.
        </p>
      ) : (
        <>
          <div>
            <h2 className="text-foreground mb-3 text-sm font-semibold uppercase tracking-wide">
              Tenants
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                title="Total de tenants"
                value={metrics.total_tenants}
              />
              <MetricCard
                title="Ativos"
                value={metrics.active_tenants}
              />
              <MetricCard
                title="Suspensos"
                value={metrics.suspended_tenants}
              />
            </div>
          </div>

          <div>
            <h2 className="text-foreground mb-3 text-sm font-semibold uppercase tracking-wide">
              Distribuição de planos
            </h2>
            <div className="grid gap-3 sm:grid-cols-4">
              <MetricCard
                title={planMap.free ?? "Free"}
                value={metrics.free_plan_count}
              />
              <MetricCard
                title={planMap.starter ?? "Starter"}
                value={metrics.starter_plan_count}
              />
              <MetricCard
                title={planMap.pro ?? "Pro"}
                value={metrics.pro_plan_count}
              />
              <MetricCard
                title={planMap.enterprise ?? "Enterprise"}
                value={metrics.enterprise_plan_count}
              />
            </div>
          </div>

          <div>
            <h2 className="text-foreground mb-3 text-sm font-semibold uppercase tracking-wide">
              Dados agregados
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                title="Clientes cadastrados"
                value={metrics.total_clients}
                description="Total na plataforma"
              />
              <MetricCard
                title="Visitas agendadas"
                value={metrics.total_visits}
                description="Histórico completo"
              />
              <MetricCard
                title="Fichas técnicas"
                value={metrics.total_recipes}
                description="Receitas criadas"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
