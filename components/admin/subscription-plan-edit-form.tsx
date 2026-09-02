import { updateSubscriptionPlanAction } from "@/lib/actions/admin-platform";
import type { SubscriptionPlan } from "@/lib/actions/admin-platform";
import { centsToBRLInput } from "@/lib/admin/parse-subscription-plan-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  plan: SubscriptionPlan;
};

export function SubscriptionPlanEditForm({ plan }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{plan.name}</CardTitle>
          <Badge variant="secondary">{plan.slug}</Badge>
          {!plan.is_active ? (
            <Badge variant="destructive">Inativo</Badge>
          ) : null}
        </div>
        <CardDescription>
          O slug <code className="bg-muted rounded px-1 text-xs">{plan.slug}</code>{" "}
          é fixo (usado no código) e não pode ser alterado aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={updateSubscriptionPlanAction} className="space-y-4">
          <input type="hidden" name="id" value={plan.id} />
          {/* slug só para referência visual no POST — o parser ignora */}
          <input type="hidden" name="slug" value={plan.slug} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`name-${plan.id}`}>Nome</Label>
              <Input
                id={`name-${plan.id}`}
                name="name"
                required
                defaultValue={plan.name}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`description-${plan.id}`}>Descrição</Label>
              <Input
                id={`description-${plan.id}`}
                name="description"
                defaultValue={plan.description ?? ""}
                placeholder="Texto curto no cadastro público"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`price_monthly-${plan.id}`}>
                Preço mensal (R$)
              </Label>
              <Input
                id={`price_monthly-${plan.id}`}
                name="price_monthly"
                inputMode="decimal"
                defaultValue={centsToBRLInput(plan.price_monthly_cents)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`price_annual-${plan.id}`}>
                Preço anual (R$)
              </Label>
              <Input
                id={`price_annual-${plan.id}`}
                name="price_annual"
                inputMode="decimal"
                defaultValue={
                  plan.price_annual_cents != null
                    ? centsToBRLInput(plan.price_annual_cents)
                    : ""
                }
                placeholder="Vazio = sem anual"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <LimitField
              id={`max_clients-${plan.id}`}
              name="max_clients"
              label="Clientes"
              defaultValue={plan.max_clients}
            />
            <LimitField
              id={`max_establishments-${plan.id}`}
              name="max_establishments"
              label="Estabelecimentos"
              defaultValue={plan.max_establishments}
            />
            <LimitField
              id={`max_team_members-${plan.id}`}
              name="max_team_members"
              label="Membros de equipe"
              defaultValue={plan.max_team_members}
            />
            <LimitField
              id={`max_patients-${plan.id}`}
              name="max_patients"
              label="Pacientes"
              defaultValue={plan.max_patients}
            />
            <LimitField
              id={`max_storage_mb-${plan.id}`}
              name="max_storage_mb"
              label="Storage (MB)"
              defaultValue={plan.max_storage_mb}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Features</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <FeatureCheck
                id={`feature_portal_externo-${plan.id}`}
                name="feature_portal_externo"
                label="Portal externo"
                defaultChecked={plan.feature_portal_externo}
              />
              <FeatureCheck
                id={`feature_pdf_export-${plan.id}`}
                name="feature_pdf_export"
                label="Exportação PDF"
                defaultChecked={plan.feature_pdf_export}
              />
              <FeatureCheck
                id={`feature_csv_import-${plan.id}`}
                name="feature_csv_import"
                label="Importação CSV"
                defaultChecked={plan.feature_csv_import}
              />
              <FeatureCheck
                id={`feature_api_access-${plan.id}`}
                name="feature_api_access"
                label="Acesso à API"
                defaultChecked={plan.feature_api_access}
              />
              <FeatureCheck
                id={`is_active-${plan.id}`}
                name="is_active"
                label="Plano ativo no catálogo"
                defaultChecked={plan.is_active}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">IDs Stripe (opcional)</legend>
            <p className="text-muted-foreground text-xs">
              Cole o Price ID depois de criar no Dashboard. Alterar o preço em R$
              aqui <strong>não</strong> atualiza o Stripe automaticamente.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`stripe_price_monthly_id-${plan.id}`}>
                  Price mensal
                </Label>
                <Input
                  id={`stripe_price_monthly_id-${plan.id}`}
                  name="stripe_price_monthly_id"
                  defaultValue={plan.stripe_price_monthly_id ?? ""}
                  placeholder="price_…"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`stripe_price_annual_id-${plan.id}`}>
                  Price anual
                </Label>
                <Input
                  id={`stripe_price_annual_id-${plan.id}`}
                  name="stripe_price_annual_id"
                  defaultValue={plan.stripe_price_annual_id ?? ""}
                  placeholder="price_…"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </fieldset>

          {plan.slug === "enterprise" ? (
            <div className="space-y-1.5">
              <Label htmlFor={`sales_whatsapp-${plan.id}`}>
                WhatsApp comercial
              </Label>
              <Input
                id={`sales_whatsapp-${plan.id}`}
                name="sales_whatsapp"
                type="tel"
                inputMode="tel"
                defaultValue={plan.sales_whatsapp ?? ""}
                placeholder="5511999999999"
              />
              <p className="text-muted-foreground text-[11px]">
                Número com DDI (55). No cadastro, o botão Enterprise abre o
                WhatsApp Web com este contato.
              </p>
            </div>
          ) : (
            <input type="hidden" name="sales_whatsapp" value={plan.sales_whatsapp ?? ""} />
          )}

          <Button type="submit" size="sm">
            Guardar {plan.name}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function LimitField({
  id,
  name,
  label,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        inputMode="numeric"
        defaultValue={String(defaultValue)}
      />
      <p className="text-muted-foreground text-[11px]">-1 = ilimitado</p>
    </div>
  );
}

function FeatureCheck({
  id,
  name,
  label,
  defaultChecked,
}: {
  id: string;
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="border-border flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
    >
      <input
        id={id}
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="accent-primary size-4"
      />
      {label}
    </label>
  );
}
