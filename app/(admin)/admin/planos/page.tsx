// Story 10.2 — Planos, limites e add-ons (super_admin) — editor do catálogo

import Link from "next/link";

import { loadSubscriptionPlans } from "@/lib/actions/admin-platform";
import { SubscriptionPlanEditForm } from "@/components/admin/subscription-plan-edit-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; msg?: string }>;
}) {
  const { ok, err, msg } = await searchParams;
  const { rows: plans } = await loadSubscriptionPlans();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Planos e limites
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Edite nome, descrição, preços, limites e features do catálogo.
            No Enterprise, configure o WhatsApp comercial. Alterações aparecem
            de imediato na aba Cadastre-se.
          </p>
        </div>
        <Link
          href="/admin"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Admin
        </Link>
      </div>

      {ok === "plan_saved" ? (
        <p
          className="rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-200"
          role="status"
        >
          Plano guardado.
        </p>
      ) : null}
      {err === "invalid" ? (
        <p
          className="text-destructive rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm"
          role="alert"
        >
          {msg ? decodeURIComponent(msg) : "Dados inválidos. Confira o formulário."}
        </p>
      ) : null}
      {err === "save" ? (
        <p
          className="text-destructive rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm"
          role="alert"
        >
          Não foi possível guardar. Tente novamente.
        </p>
      ) : null}

      <div
        className="border-border bg-muted/30 rounded-lg border p-4 text-sm"
        role="note"
      >
        <p className="text-muted-foreground text-xs leading-relaxed">
          <strong className="text-foreground">Atenção:</strong> mudar o preço em
          R$ no catálogo atualiza o cadastro público e os defaults de feature, mas{" "}
          <strong className="text-foreground">não</strong> altera Prices no
          Stripe nem os <code className="bg-muted rounded px-1">tenant_limits</code>{" "}
          já gravados. Assinaturas em curso continuam no Price antigo até você
          colar um novo Price ID e o cliente renovar/migrar.
        </p>
      </div>

      {plans.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum plano encontrado. Execute as migrações de base de dados.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <SubscriptionPlanEditForm key={p.id} plan={p} />
          ))}
        </div>
      )}
    </div>
  );
}
