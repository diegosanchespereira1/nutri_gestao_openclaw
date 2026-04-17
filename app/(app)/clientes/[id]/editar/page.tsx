import { notFound } from "next/navigation";
import Link from "next/link";

import { ClientExamDocumentList } from "@/components/clientes/client-exam-document-list";
import { ClientAvatar } from "@/components/clientes/client-avatar";
import { ClientContractsSection } from "@/components/clientes/client-contracts-section";
import { ClientForm } from "@/components/clientes/client-form";
import { DeleteClientButton } from "@/components/clientes/delete-client-button";
import { EstablishmentsSection } from "@/components/clientes/establishments-section";
import { PatientsSection } from "@/components/pacientes/patients-section";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { loadFinancialChargesForClient } from "@/lib/actions/financial-charges";
import { loadContractsByClient } from "@/lib/actions/client-contracts";
import { getClientLogoSignedUrl } from "@/lib/clients/logo-sync";
import { normalizeClientRow } from "@/lib/clients/normalize-client-row";
import { todayKey } from "@/lib/datetime/calendar-tz";
import {
  formatBRLFromCents,
} from "@/lib/dashboard/financial-pending";
import { metricsFromClientCharges } from "@/lib/financeiro/client-payment-status";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

function dateInputValue(isoOrDate: string | null): string {
  if (!isoOrDate) return "";
  return isoOrDate.slice(0, 10);
}

export default async function EditarClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ contractErr?: string }>;
}) {
  const { id } = await params;
  const { contractErr } = await searchParams;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const row = normalizeClientRow(data as Record<string, unknown>);
  const logoPreviewUrl = await getClientLogoSignedUrl(
    supabase,
    row.logo_storage_path,
  );

  const social = row.social_links ?? {};

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tz = await fetchProfileTimeZone(supabase, user?.id ?? "");
  const tKey = todayKey(new Date(), tz);
  const { rows: chargesForClient } = await loadFinancialChargesForClient(
    row.id,
  );
  const payMetrics = metricsFromClientCharges(chargesForClient, tKey);
  const { rows: contracts } = await loadContractsByClient(row.id);

  const statusLabel =
    row.lifecycle_status === "ativo"
      ? "Ativo"
      : row.lifecycle_status === "inativo"
        ? "Inativo"
        : "Finalizado";

  return (
    <PageLayout variant="form">
      <div className="flex flex-wrap items-start gap-4">
        <ClientAvatar
          name={row.legal_name}
          imageUrl={logoPreviewUrl}
          size="lg"
          className="shrink-0"
        />
        <PageHeader
          title={row.legal_name}
          description={`${row.kind === "pf" ? "Pessoa física" : "Pessoa jurídica"}${row.kind === "pj" ? ` · ${statusLabel}` : ""}`}
          back={{ href: "/clientes", label: "Clientes" }}
          className="flex-1 min-w-0"
        />
      </div>
      <ClientForm
        mode="edit"
        clientId={row.id}
        defaultKind={row.kind}
        lockKind={row.kind === "pj"}
        defaultLegalName={row.legal_name}
        defaultTradeName={row.trade_name ?? ""}
        defaultDocumentId={row.document_id ?? ""}
        defaultEmail={row.email ?? ""}
        defaultPhone={row.phone ?? ""}
        defaultNotes={row.notes ?? ""}
        defaultAttendedFullName={row.attended_full_name ?? ""}
        defaultBirthDate={row.birth_date ?? ""}
        defaultSex={
          row.sex && (row.sex === "female" || row.sex === "male" || row.sex === "other")
            ? row.sex
            : ""
        }
        defaultDietaryRestrictions={row.dietary_restrictions ?? ""}
        defaultChronicMedications={row.chronic_medications ?? ""}
        defaultGuardianFullName={row.guardian_full_name ?? ""}
        defaultGuardianDocumentId={row.guardian_document_id ?? ""}
        defaultGuardianEmail={row.guardian_email ?? ""}
        defaultGuardianPhone={row.guardian_phone ?? ""}
        defaultGuardianRelationship={row.guardian_relationship ?? ""}
        defaultLifecycleStatus={row.lifecycle_status}
        defaultActivatedAt={dateInputValue(row.activated_at)}
        defaultStateRegistration={row.state_registration ?? ""}
        defaultMunicipalRegistration={row.municipal_registration ?? ""}
        defaultSanitaryLicense={row.sanitary_license ?? ""}
        defaultWebsiteUrl={row.website_url ?? ""}
        defaultSocialInstagram={social.instagram ?? ""}
        defaultSocialFacebook={social.facebook ?? ""}
        defaultSocialLinkedin={social.linkedin ?? ""}
        defaultSocialWhatsapp={social.whatsapp ?? ""}
        defaultSocialOther={social.other ?? ""}
        defaultLogoPreviewUrl={logoPreviewUrl}
        defaultLegalRepFullName={row.legal_rep_full_name ?? ""}
        defaultLegalRepDocumentId={row.legal_rep_document_id ?? ""}
        defaultLegalRepRole={row.legal_rep_role ?? ""}
        defaultLegalRepEmail={row.legal_rep_email ?? ""}
        defaultLegalRepPhone={row.legal_rep_phone ?? ""}
        defaultTechnicalRepFullName={row.technical_rep_full_name ?? ""}
        defaultTechnicalRepProfessionalId={
          row.technical_rep_professional_id ?? ""
        }
        defaultTechnicalRepEmail={row.technical_rep_email ?? ""}
        defaultTechnicalRepPhone={row.technical_rep_phone ?? ""}
        defaultBusinessSegment={row.business_segment ?? ""}
      />

      <Separator />
      <section aria-labelledby="pagamentos-cliente-heading">
        <Card className="border-border shadow-xs ring-1 ring-border">
          <CardHeader className="pb-2">
            <CardTitle
              id="pagamentos-cliente-heading"
              className="text-base font-semibold"
            >
              Pagamentos e inadimplência
            </CardTitle>
            <CardDescription>
              Resumo do estado de cobranças deste cliente; filtre e registe
              lançamentos no módulo financeiro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {payMetrics.hasDelinquency ? (
              <p
                className="border-amber-500/35 bg-amber-500/10 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100 rounded-md border px-3 py-2 text-sm"
                role="status"
              >
                <span className="font-semibold">Inadimplência: </span>
                {payMetrics.overdueCount} cobrança(s) em atraso, total{" "}
                {formatBRLFromCents(payMetrics.overdueTotalCents)}.
              </p>
            ) : payMetrics.openCount > 0 ? (
              <p className="text-muted-foreground">
                {payMetrics.openCount} em aberto (
                {formatBRLFromCents(payMetrics.openTotalCents)}
                ), sem vencimento ultrapassado.
              </p>
            ) : payMetrics.paidCount > 0 ? (
              <p className="text-muted-foreground">
                {payMetrics.paidCount} cobrança(s) paga(s); nada em aberto.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Ainda não há cobranças associadas a este cliente.
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs tabular-nums">
              <span>
                Em aberto:{" "}
                <span className="text-foreground font-medium">
                  {payMetrics.openCount}
                </span>
              </span>
              <span>
                Em atraso:{" "}
                <span className="text-foreground font-medium">
                  {payMetrics.overdueCount}
                </span>
              </span>
              <span>
                Pagas:{" "}
                <span className="text-foreground font-medium">
                  {payMetrics.paidCount}
                </span>
              </span>
            </div>
            <Link
              href={`/financeiro?client=${encodeURIComponent(row.id)}&tab=operacoes`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "inline-flex w-full justify-center sm:w-auto",
              )}
            >
              Abrir no financeiro
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Story 8.2 + 8.3 — Contratos e recorrência */}
      <Separator />
      <section aria-labelledby="contratos-cliente-heading">
        <h2 id="contratos-cliente-heading" className="sr-only">
          Contratos e recorrência
        </h2>
        <ClientContractsSection
          clientId={row.id}
          contracts={contracts}
          contractErr={contractErr}
        />
      </section>

      {row.kind === "pf" ? (
        <>
          <Separator />
          <ClientExamDocumentList clientId={row.id} />
          <Separator />
          <PatientsSection variant="client_pf" clientId={row.id} />
        </>
      ) : null}
      {row.kind === "pj" ? (
        <>
          <Separator />
          <EstablishmentsSection clientId={row.id} />
          {/* Task F: acesso rápido ao histórico de checklists — apenas clientes PJ */}
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Histórico de checklists</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Todos os checklists realizados nos estabelecimentos deste cliente.
              </p>
            </div>
            <Link
              href={`/clientes/${row.id}/checklists`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Ver histórico →
            </Link>
          </div>
        </>
      ) : null}
      <Separator />
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h2 className="text-sm font-semibold text-destructive">
          Zona de perigo
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Eliminar remove o cliente da sua carteira. Em versões futuras, dados
          ligados (estabelecimentos, pacientes) podem restringir esta ação.
        </p>
        <div className="mt-3">
          <DeleteClientButton clientId={row.id} />
        </div>
      </div>
    </PageLayout>
  );
}
