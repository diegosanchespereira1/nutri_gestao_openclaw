// Super Admin — Criar novo tenant manualmente
import { AlertCircle } from "lucide-react";

import { loadSubscriptionPlans } from "@/lib/actions/admin-platform";
import { CreateTenantWizard } from "@/components/admin/create-tenant-wizard";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ERR_MESSAGES: Record<string, string> = {
  invalid: "Nome da empresa e email são obrigatórios.",
  modules:
    "Selecione pelo menos um módulo de atividade (Atendimento Nutricional ou Assessoria em Serviços de Alimentação).",
  exists: "Já existe uma conta com este email.",
  create: "Não foi possível criar a conta. Tente novamente.",
  server_config:
    "SUPABASE_SERVICE_ROLE_KEY não está definida no servidor. Adicione ao .env.local (Supabase → Project Settings → API → service_role), reinicie o next dev e tente novamente.",
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
    <PageLayout className="mx-auto w-full max-w-4xl">
      <PageHeader
        back={{ href: "/admin/tenants", label: "Tenants" }}
        title="Criar novo tenant"
        description="Siga as etapas para configurar a conta, os módulos de atividade e o plano do novo cliente."
      />

      {err && ERR_MESSAGES[err] ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Não foi possível criar a conta</AlertTitle>
          <AlertDescription>{ERR_MESSAGES[err]}</AlertDescription>
        </Alert>
      ) : null}

      <CreateTenantWizard
        serverError={err ?? null}
        plans={activePlans.map((p) => ({
          slug: p.slug,
          name: p.name,
          price_monthly_cents: p.price_monthly_cents,
          feature_portal_externo: p.feature_portal_externo,
          feature_pdf_export: p.feature_pdf_export,
          feature_csv_import: p.feature_csv_import,
          feature_api_access: p.feature_api_access,
        }))}
      />
    </PageLayout>
  );
}
