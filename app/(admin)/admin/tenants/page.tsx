// Story 10.1 — Gestão de tenants (super_admin only)

import {
  loadTenants,
  suspendTenantAction,
  reactivateTenantAction,
  changeTenantPlanAction,
  unblockLgpdTenantAction,
} from "@/lib/actions/admin-platform";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const PLAN_SLUGS = ["free", "starter", "pro", "enterprise"] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; ok?: string; err?: string }>;
}) {
  const { search, ok, err } = await searchParams;
  const { rows } = await loadTenants(search);

  const okMessages: Record<string, string> = {
    suspended: "Tenant suspenso com sucesso.",
    reactivated: "Tenant reativado.",
    plan_updated: "Plano atualizado.",
    lgpd_unblocked: "Bloqueio LGPD revogado; utilizador pode voltar a aceder (se a sessão/ban for limpo).",
    tenant_created: "Conta criada com sucesso.",
  };
  const errMessages: Record<string, string> = {
    invalid: "Dados inválidos.",
    save: "Erro ao salvar. Tente novamente.",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Gestão de tenants
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {rows.length} profissional(is) registado(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/tenants/novo"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            + Criar tenant
          </Link>
          <Link
            href="/admin"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            ← Admin
          </Link>
        </div>
      </div>

      {ok && (
        <p
          className="rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-200"
          role="status"
        >
          {okMessages[ok] ?? "Ação concluída."}
        </p>
      )}
      {err && (
        <p className="text-destructive rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
          {errMessages[err] ?? "Erro."}
        </p>
      )}

      {/* Search */}
      <form method="get" className="flex gap-2">
        <Input
          name="search"
          defaultValue={search}
          placeholder="Pesquisar por nome ou e-mail…"
          className="max-w-sm"
        />
        <Button type="submit" size="sm" variant="secondary">
          Pesquisar
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum tenant encontrado.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((t) => (
            <li key={t.id}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-sm font-medium">
                        {t.full_name ?? "(sem nome)"}
                      </CardTitle>
                      {t.lgpd_blocked_at != null && t.lgpd_unblocked_at == null ? (
                        <Badge variant="destructive">LGPD bloqueado</Badge>
                      ) : t.is_suspended ? (
                        <Badge variant="destructive">Suspenso</Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500/50 text-green-700">
                          Ativo
                        </Badge>
                      )}
                      <Badge variant="secondary">{t.plan_slug}</Badge>
                    </div>
                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 text-xs")}
                    >
                      Ver cockpit →
                    </Link>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Desde {formatDate(t.created_at)}
                    {t.plan_expires_at &&
                      ` · Plano expira ${formatDate(t.plan_expires_at)}`}
                  </p>
                  {t.suspended_reason && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Motivo: {t.suspended_reason}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Change plan */}
                  <form action={changeTenantPlanAction} className="flex flex-wrap gap-2 items-end">
                    <input type="hidden" name="tenant_id" value={t.id} />
                    <div className="space-y-1">
                      <Label htmlFor={`plan-${t.id}`} className="text-xs">
                        Alterar plano
                      </Label>
                      <Select name="plan_slug" defaultValue={t.plan_slug}>
                        <SelectTrigger id={`plan-${t.id}`} className="h-8 text-xs w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLAN_SLUGS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
                      Salvar plano
                    </Button>
                  </form>

                  {/* Suspend / Reactivate */}
                  <div className="flex flex-wrap gap-2">
                    {t.lgpd_blocked_at != null && t.lgpd_unblocked_at == null && (
                      <form action={unblockLgpdTenantAction}>
                        <input type="hidden" name="tenant_id" value={t.id} />
                        <Button type="submit" size="sm" variant="outline" className="text-xs">
                          Desbloquear LGPD
                        </Button>
                      </form>
                    )}
                    {t.is_suspended ? (
                      <form action={reactivateTenantAction}>
                        <input type="hidden" name="tenant_id" value={t.id} />
                        <Button type="submit" size="sm" variant="outline" className="text-xs">
                          Reativar
                        </Button>
                      </form>
                    ) : (
                      <form action={suspendTenantAction} className="flex gap-2 items-center">
                        <input type="hidden" name="tenant_id" value={t.id} />
                        <Input
                          name="reason"
                          placeholder="Motivo (opcional)"
                          className="h-8 text-xs max-w-xs"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="destructive"
                          className="text-xs"
                        >
                          Suspender
                        </Button>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
