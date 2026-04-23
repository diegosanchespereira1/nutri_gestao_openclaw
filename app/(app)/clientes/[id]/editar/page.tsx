import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { ClientExamDocumentList } from "@/components/clientes/client-exam-document-list";
import { ClientAvatar } from "@/components/clientes/client-avatar";
import { ClientContractsSection } from "@/components/clientes/client-contracts-section";
import { ClientForm } from "@/components/clientes/client-form";
import { ClientChecklistHistorySection } from "@/components/clientes/client-checklist-history-section";
import { ClientEditTabNav } from "@/components/clientes/client-edit-tab-nav";
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
import { loadCustomSegmentsAction } from "@/lib/actions/client-segments";
import { getClientLogoSignedUrl } from "@/lib/clients/logo-sync";
import { normalizeClientRow } from "@/lib/clients/normalize-client-row";
import { resolveClientEditTab } from "@/lib/clientes/client-edit-tab";
import { todayKey } from "@/lib/datetime/calendar-tz";
import { formatBRLFromCents } from "@/lib/dashboard/financial-pending";
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
  searchParams: Promise<{
    contractErr?: string;
    tab?: string;
    formTab?: string;
    est?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { contractErr } = sp;

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

  if (sp.tab === "estabelecimento" && row.kind === "pj") {
    const q = new URLSearchParams();
    if (sp.contractErr) q.set("contractErr", sp.contractErr);
    q.set("tab", "dados");
    q.set("formTab", "pj-estabelecimento");
    redirect(`/clientes/${id}/editar?${q.toString()}`);
  }

  const { data: estData } = row.kind === "pj"
    ? await supabase
        .from("establishments")
        .select("*")
        .eq("client_id", id)
        .maybeSingle()
    : { data: null };

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
  const customSegments = await loadCustomSegmentsAction();

  const activeTab = resolveClientEditTab(sp.tab, row.kind);

  const statusLabel =
    row.lifecycle_status === "ativo"
      ? "Ativo"
      : row.lifecycle_status === "inativo"
        ? "Inativo"
        : "Finalizado";

  const searchSnap = {
    tab: sp.tab,
    contractErr: sp.contractErr,
    est: sp.est,
    status: sp.status,
    page: sp.page,
  };

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

      <ClientEditTabNav
        clientId={row.id}
        kind={row.kind}
        searchParams={searchSnap}
      />

      {activeTab === "dados" ? (
        <>
          <ClientForm
            mode="edit"
            clientId={row.id}
            defaultKind={row.kind}
            lockKind={row.kind === "pj"}
            initialFormTab={
              sp.formTab === "pj-estabelecimento" ? "pj-estabelecimento" : undefined
            }
            defaultLegalName={row.legal_name}
            defaultTradeName={row.trade_name ?? ""}
            defaultDocumentId={row.document_id ?? ""}
            defaultEmail={row.email ?? ""}
            defaultPhone={row.phone ?? ""}
            defaultNotes={row.notes ?? ""}
            defaultAttendedFullName={row.attended_full_name ?? ""}
            defaultBirthDate={row.birth_date ?? ""}
            defaultSex={
              row.sex &&
              (row.sex === "female" || row.sex === "male" || row.sex === "other")
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
            defaultCustomSegments={customSegments}
            defaultEstName={estData?.name ?? ""}
            defaultEstAddressLine1={estData?.address_line1 ?? ""}
            defaultEstAddressLine2={estData?.address_line2 ?? ""}
            defaultEstCity={estData?.city ?? ""}
            defaultEstState={estData?.state ?? ""}
            defaultEstPostalCode={estData?.postal_code ?? ""}
          >
            {row.kind === "pj" ? (
              <EstablishmentsSection clientId={row.id} />
            ) : null}
          </ClientForm>

          {row.kind === "pf" ? (
            <>
              <Separator className="my-8" />
              <ClientExamDocumentList clientId={row.id} />
              <Separator className="my-8" />
              <PatientsSection variant="client_pf" clientId={row.id} />
            </>
          ) : null}

          <Separator className="my-8" />
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
        </>
      ) : null}

      {activeTab === "financeiro" ? (
        <>
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

          <Separator className="my-8" />
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
        </>
      ) : null}

      {activeTab === "checklists" && row.kind === "pj" ? (
        <ClientChecklistHistorySection
          clientId={row.id}
          embeddedInClientEdit
          searchParams={{
            est: sp.est,
            status: sp.status,
            page: sp.page,
          }}
        />
      ) : null}
    </PageLayout>
  );
}
