// Super Admin — Criar novo tenant manualmente
import Link from "next/link";

import {
  createTenantAsAdminAction,
  loadSubscriptionPlans,
} from "@/lib/actions/admin-platform";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ERR_MESSAGES: Record<string, string> = {
  invalid: "Nome e email são obrigatórios.",
  exists: "Já existe uma conta com este email.",
  create: "Não foi possível criar a conta. Tente novamente.",
};

export default async function NovoTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  const { rows: plans } = await loadSubscriptionPlans();
  const activePlans = plans.filter((p) => p.is_active);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/admin/tenants"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 mb-1",
          )}
        >
          ← Tenants
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Criar novo tenant
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cria a conta no Supabase Auth e define o plano inicial. O profissional
          receberá um email se &quot;enviar convite&quot; estiver activo.
        </p>
      </div>

      {err && ERR_MESSAGES[err] ? (
        <p
          className="text-destructive rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm"
          role="alert"
        >
          {ERR_MESSAGES[err]}
        </p>
      ) : null}

      <form action={createTenantAsAdminAction} className="space-y-5">
        {/* Nome */}
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Nome completo</Label>
          <Input
            id="full_name"
            name="full_name"
            placeholder="Dra. Ana Silva"
            required
            autoComplete="off"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="ana@clinica.com.br"
            required
            autoComplete="off"
          />
        </div>

        {/* Senha */}
        <div className="space-y-1.5">
          <Label htmlFor="password">
            Senha inicial{" "}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 12 caracteres (ou deixe em branco para gerar)"
            autoComplete="new-password"
            minLength={12}
          />
          <p className="text-muted-foreground text-xs">
            Se em branco, uma senha aleatória é gerada. O utilizador pode usar
            &ldquo;Esqueci a senha&rdquo; para definir a sua.
          </p>
        </div>

        {/* Plano */}
        <div className="space-y-1.5">
          <Label htmlFor="plan_slug">Plano inicial</Label>
          <Select name="plan_slug" defaultValue="free">
            <SelectTrigger id="plan_slug" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activePlans.map((p) => (
                <SelectItem key={p.slug} value={p.slug}>
                  {p.name}{" "}
                  {p.price_monthly_cents > 0
                    ? `— R$ ${(p.price_monthly_cents / 100).toFixed(0)}/mês`
                    : "— Gratuito"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Enviar convite */}
        <div className="flex items-center gap-2">
          <input
            id="send_invite"
            name="send_invite"
            type="checkbox"
            value="true"
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="send_invite" className="cursor-pointer font-normal">
            Enviar email de convite ao profissional
          </Label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" className="min-w-[120px]">
            Criar conta
          </Button>
          <Link
            href="/admin/tenants"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
