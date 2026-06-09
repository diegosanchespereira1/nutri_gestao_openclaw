import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

import { ClientExamDocumentList } from "@/components/clientes/client-exam-document-list";
import { ClientAvatar } from "@/components/clientes/client-avatar";
import { ClientContractsSection } from "@/components/clientes/client-contracts-section";
import { ClientFormLazy } from "@/components/clientes/client-form-lazy";
import { ChecklistScoreEvolutionChart } from "@/components/checklists/checklist-score-evolution-chart";
import { ClientChecklistHistorySection } from "@/components/clientes/client-checklist-history-section";
import { loadChecklistScoreHistory } from "@/lib/actions/checklist-history";
import { ClientEditTabNav } from "@/components/clientes/client-edit-tab-nav";
import { DeleteClientButton } from "@/components/clientes/delete-client-button";
import { EstablishmentsSection } from "@/components/clientes/establishments-section";
import { EstablishmentAreasSection } from "@/components/clientes/establishment-areas-section";
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
import { loadTeamMembersForSelect } from "@/lib/actions/team-members";
import { loadAreasForEstablishment } from "@/lib/actions/establishment-areas";
import { getClientLogoSignedUrl } from "@/lib/clientes/logo-sync";
import { normalizeClientRow } from "@/lib/clientes/normalize-client-row";
import { resolveClientEditTab } from "@/lib/clientes/client-edit-tab";
import { todayKey } from "@/lib/datetime/calendar-tz";
import { formatBRLFromCents } from "@/lib/dashboard/financial-pending";
import { metricsFromClientCharges } from "@/lib/financeiro/client-payment-status";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import { DEFAULT_PROFILE_TIME_ZONE } from "@/lib/timezones";
import { isTeamMember as checkIsTeamMember } from "@/lib/workspace";
import type { EstablishmentRow } from "@/lib/types/establishments";
import type { ClientRow } from "@/lib/types/clients";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

function dateInputValue(isoOrDate: string | null): string {
  if (!isoOrDate) return "";
  return isoOrDate.slice(0, 10);
}

function TabContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="h-12 rounded-xl bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
      </div>
      <div className="h-10 rounded-lg bg-muted" />
      <div className="h-32 rounded-lg bg-muted" />
    </div>
  );
}

function ScoreHistorySkeleton() {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-xs animate-pulse" aria-hidden>
      <div className="h-4 w-44 rounded bg-muted mb-2" />
      <div className="h-3 w-64 rounded bg-muted mb-4" />
      <div className="h-40 rounded-lg bg-muted" />
    </div>
  );
}

function ChecklistHistorySkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="h-28 rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="h-9 w-48 rounded-lg bg-muted" />
        <div className="h-9 w-36 rounded-lg bg-muted" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

// ─── RSC de conteúdo das abas (Suspense boundary) ────────────────────────────
// Faz o Phase 2 de data-fetching depois que o cabeçalho já foi enviado ao browser.

async function ClientEditTabContent({
  clientId,
  row,
  activeTab,
  sp,
  isTeamMember,
  contractErr,
  logoPreviewUrl,
}: {
  clientId: string;
  row: ClientRow;
  activeTab: string;
  sp: Record<string, string | undefined>;
  isTeamMember: boolean;
  contractErr?: string;
  logoPreviewUrl: string | null;
}) {
  const { supabase, user } = await getServerContext();

  const needDadosExtras = activeTab === "dados";
  const needFinancial = activeTab === "financeiro";
  const needEstablishment =
    row.kind === "pj" && (needDadosExtras || activeTab === "checklists");

  // Phase 2: tudo em paralelo, incluindo loadAreasForEstablishment
  // (antes era sequencial após este bloco — waterfall eliminado).
  const [
    { data: estData },
    tz,
    { rows: chargesForClient },
    { rows: contracts },
    customSegments,
    teamMembersForSelect,
  ] = await Promise.all([
    needEstablishment
      ? supabase
          .from("establishments")
          .select("*")
          .eq("client_id", clientId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    needFinancial
      ? fetchProfileTimeZone(supabase, user?.id ?? "")
      : Promise.resolve(DEFAULT_PROFILE_TIME_ZONE),
    needFinancial
      ? loadFinancialChargesForClient(row.id)
      : Promise.resolve({ rows: [] }),
    needFinancial
      ? loadContractsByClient(row.id)
      : Promise.resolve({ rows: [] }),
    needDadosExtras
      ? loadCustomSegmentsAction()
      : Promise.resolve([]),
    needDadosExtras
      ? loadTeamMembersForSelect()
      : Promise.resolve([]),
  ]);

  const social = row.social_links ?? {};
  const tKey = needFinancial ? todayKey(new Date(), tz) : "";
  const payMetrics = needFinancial
    ? metricsFromClientCharges(chargesForClient, tKey)
    : metricsFromClientCharges([], tKey);

  // loadAreasForEstablishment agora corre logo após o Promise.all,
  // sem esperar por Phase 2 completo (estData.id já disponível).
  const establishmentAreas =
    needDadosExtras && row.kind === "pj" && estData?.id
      ? await loadAreasForEstablishment(estData.id)
      : [];

  const estRow: EstablishmentRow | null = estData
    ? (estData as EstablishmentRow)
    : null;

  return (
    <>
      {activeTab === "dados" ? (
        <>
          <ClientFormLazy
            mode="edit"
            clientId={row.id}
            defaultKind={row.kind}
            lockKind={row.kind === "pj"}
            initialFormTab={
              sp.formTab === "pj-estabelecimento"
                ? "pj-estabelecimento"
                : undefined
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
            teamMembersForSelect={teamMembersForSelect}
            defaultResponsibleTeamMemberId={
              row.responsible_team_member_id ?? null
            }
            defaultEstName={estData?.name ?? ""}
            defaultEstType={estData?.establishment_type ?? undefined}
            defaultEstAddressLine1={estData?.address_line1 ?? ""}
            defaultEstAddressLine2={estData?.address_line2 ?? ""}
            defaultEstCity={estData?.city ?? ""}
            defaultEstState={estData?.state ?? ""}
            defaultEstPostalCode={estData?.postal_code ?? ""}
          >
            {row.kind === "pj" ? (
              <EstablishmentsSection clientId={row.id} establishment={estRow} />
            ) : null}
          </ClientFormLazy>

          {row.kind === "pj" && estData?.id ? (
            <>
              <Separator className="my-8" />
              <EstablishmentAreasSection
                establishmentId={estData.id}
                initialAreas={establishmentAreas}
              />
            </>
          ) : null}

          {row.kind === "pf" ? (
            <>
              <Separator className="my-8" />
              <ClientExamDocumentList clientId={row.id} />
              <Separator className="my-8" />
              <PatientsSection variant="client_pf" clientId={row.id} />
            </>
          ) : null}

          {!isTeamMember ? (
            <>
              <Separator className="my-8" />
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <h2 className="text-sm font-semibold text-destructive">
                  Zona de perigo
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Eliminar remove o cliente da sua carteira. Em versões futuras,
                  dados ligados (estabelecimentos, pacientes) podem restringir
                  esta ação.
                </p>
                <div className="mt-3">
                  <DeleteClientButton clientId={row.id} />
                </div>
              </div>
            </>
          ) : null}
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
        <ChecklistsTabContent clientId={row.id} sp={sp} />
      ) : null}
    </>
  );
}

/**
 * Carrega e renderiza o gráfico de evolução de score em componente isolado,
 * para que possa ser renderizado em paralelo com ClientChecklistHistorySection.
 */
async function ChecklistScoreHistoryBlock({ clientId }: { clientId: string }) {
  const scoreHistory = await loadChecklistScoreHistory(clientId);
  if (scoreHistory.byTemplate.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-xs">
      <h3 className="text-base font-semibold text-foreground tracking-tight">
        Evolução da pontuação
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Pontuação por dossiê aprovado — cada linha representa um template de
        checklist.
      </p>
      <div className="mt-4">
        <ChecklistScoreEvolutionChart byTemplate={scoreHistory.byTemplate} />
      </div>
    </div>
  );
}

/**
 * Componente síncrono: React inicia ChecklistScoreHistoryBlock e
 * ClientChecklistHistorySection em paralelo ao renderizar os filhos.
 * Cada filho tem o seu próprio Suspense para streaming progressivo —
 * o score chart aparece mal os dados cheguem, sem esperar pelo histórico.
 */
function ChecklistsTabContent({
  clientId,
  sp,
}: {
  clientId: string;
  sp: { est?: string; area?: string; status?: string; page?: string };
}) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<ScoreHistorySkeleton />}>
        <ChecklistScoreHistoryBlock clientId={clientId} />
      </Suspense>
      <Suspense fallback={<ChecklistHistorySkeleton />}>
        <ClientChecklistHistorySection
          clientId={clientId}
          embeddedInClientEdit
          searchParams={sp}
        />
      </Suspense>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
    area?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  // Phase 1: usa getServerContext() — lê workspaceOwnerId do cookie,
  // evitando round-trip ao Supabase Auth e query à tabela team_members.
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const row = normalizeClientRow(data as Record<string, unknown>);

  if (sp.tab === "estabelecimento" && row.kind === "pj") {
    const q = new URLSearchParams();
    if (sp.contractErr) q.set("contractErr", sp.contractErr);
    q.set("tab", "dados");
    q.set("formTab", "pj-estabelecimento");
    redirect(`/clientes/${id}/editar?${q.toString()}`);
  }

  const activeTab = resolveClientEditTab(sp.tab, row.kind);
  const isTeamMember = checkIsTeamMember(user.id, workspaceOwnerId);

  // Logo URL cacheada (50 min) — evita round-trip ao Storage em cada render.
  const logoPreviewUrl = row.logo_storage_path
    ? await getClientLogoSignedUrl(supabase, row.logo_storage_path)
    : null;

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
      {/* Cabeçalho renderizado imediatamente (Phase 1 ~150 ms) */}
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

      {/* Phase 2: conteúdo da aba em streaming — o browser recebe o cabeçalho
          acima antes mesmo de as queries abaixo terminarem. */}
      <Suspense fallback={<TabContentSkeleton />}>
        <ClientEditTabContent
          clientId={id}
          row={row}
          activeTab={activeTab}
          sp={{
            formTab: sp.formTab,
            est: sp.est,
            area: sp.area,
            status: sp.status,
            page: sp.page,
          }}
          isTeamMember={isTeamMember}
          contractErr={sp.contractErr}
          logoPreviewUrl={logoPreviewUrl}
        />
      </Suspense>
    </PageLayout>
  );
}
