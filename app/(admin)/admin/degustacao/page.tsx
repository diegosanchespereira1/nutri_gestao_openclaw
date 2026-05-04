// Super Admin — Configuração das features de degustação (self-service)
// O admin define quais features ficam activas para novos tenants que se registam
// sem plano pago. Estas features são aplicadas automaticamente via trigger de BD.

import Link from "next/link";

import {
  loadDegustacaoConfig,
  saveDegustacaoConfigAction,
} from "@/lib/actions/admin-platform";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default async function DegustacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;
  const { rows } = await loadDegustacaoConfig();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/admin"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 mb-1",
          )}
        >
          ← Admin
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Configuração de degustação
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Definir quais features ficam activas para novos profissionais que se
          registam em self-service. As alterações aplicam-se apenas a novos
          registos — contas existentes mantêm os overrides actuais.
        </p>
      </div>

      {ok === "saved" ? (
        <p
          className="rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-200"
          role="status"
        >
          Configuração guardada.
        </p>
      ) : null}
      {err ? (
        <p
          className="text-destructive rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm"
          role="alert"
        >
          Erro ao guardar. Tente novamente.
        </p>
      ) : null}

      <form action={saveDegustacaoConfigAction} className="space-y-4">
        <div className="border-border divide-border divide-y rounded-lg border">
          {rows.length === 0 ? (
            <p className="text-muted-foreground px-4 py-3 text-sm">
              Nenhuma feature configurada. Execute a migração de base de dados.
            </p>
          ) : (
            rows.map((row) => (
              <div
                key={row.feature_key}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {row.label ?? row.feature_key}
                  </p>
                  <p className="text-muted-foreground font-mono text-xs">
                    {row.feature_key}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-xs",
                      row.enabled ? "text-green-600" : "text-muted-foreground",
                    )}
                  >
                    {row.enabled ? "Activo" : "Inactivo"}
                  </span>
                  {/* Toggle as radio pair so form captures current state */}
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio"
                      name={row.feature_key}
                      value="true"
                      defaultChecked={row.enabled}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs">Activar</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio"
                      name={row.feature_key}
                      value="false"
                      defaultChecked={!row.enabled}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs">Desactivar</span>
                  </label>
                </div>
              </div>
            ))
          )}
        </div>

        {rows.length > 0 ? (
          <Button type="submit" size="sm">
            Guardar configuração
          </Button>
        ) : null}
      </form>

      <div className="border-border rounded-lg border p-4 text-sm">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Como funciona
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Quando um novo utilizador se regista via self-service, o trigger
          <code className="bg-muted mx-1 rounded px-1">handle_new_user</code>
          lê esta tabela e cria automaticamente overrides em
          <code className="bg-muted mx-1 rounded px-1">
            tenant_feature_overrides
          </code>
          . Para tenants criados pelo admin, os overrides de degustação{" "}
          <strong>não são aplicados</strong> — o plano escolhido define as
          features.
        </p>
      </div>
    </div>
  );
}
