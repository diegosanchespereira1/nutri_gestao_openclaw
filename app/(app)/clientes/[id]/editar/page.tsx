import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

import { ClientExamDocumentList } from "@/components/clientes/client-exam-document-list";
import { ClientEditHeaderAvatar } from "@/components/clientes/client-edit-header-avatar";
import { ClientEditTabShell } from "@/components/clientes/client-edit-tab-shell";
import { ClientContractsSection } from "@/components/clientes/client-contracts-section";
import { ClientFormLazy } from "@/components/clientes/client-form-lazy";
import { ChecklistEvolutionExportDialog } from "@/components/checklists/checklist-evolution-export-dialog";
import { ChecklistScoreEvolutionChart } from "@/components/checklists/checklist-score-evolution-chart";
import { ClientChecklistHistorySection } from "@/components/clientes/client-checklist-history-section";
import { loadChecklistScoreHistory } from "@/lib/actions/checklist-history";
import { DeleteClientButton } from "@/components/clientes/delete-client-button";
import { EstablishmentsSection } from "@/components/clientes/establishments-section";
import { EstablishmentAreasSection } from "@/components/clientes/establishment-areas-section";
import { SchoolGradesSection } from "@/components/clientes/school-grades-section";
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
import { loadEstablishmentCustomTypesAction } from "@/lib/actions/establishment-custom-types";
import { loadTeamMembersForSelect } from "@/lib/actions/team-members";
import { loadAreasForEstablishment } from "@/lib/actions/establishment-areas";
import { loadGradesForClient } from "@/lib/actions/school-grades";
import { getClientLogoSignedUrl } from "@/lib/clientes/logo-sync";
import { CLIENT_ROW_FULL_SELECT } from "@/lib/clientes/client-row-supabase-select";
import {
  normalizeClientRow,
  type ClientEditShell,
} from "@/lib/clientes/normalize-client-row";
import { resolveClientEditTab, type ClientEditTabValue } from "@/lib/clientes/client-edit-tab";
import { todayKey } from "@/lib/datetime/calendar-tz";
import { formatBRLFromCents } from "@/lib/dashboard/financial-pending";
import { metricsFromClientCharges } from "@/lib/financeiro/client-payment-status";
import {
  buildCurrentUrl,
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import {
  canDeleteWorkspaceMasterData,
} from "@/lib/workspace";
import type { EstablishmentRow } from "@/lib/types/establishments";
import type { ClientRow } from "@/lib/types/clients";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import type { SupabaseClient } from "@supabase/supabase-js";

function dateInputValue(isoOrDate: string | null): string {
  if (!isoOrDate) return "";
  return isoOrDate.slice(0, 10);
}

function shellFromClientRow(row: ClientRow): ClientEditShell {
  return {
    id: row.id,
    kind: row.kind,
    legal_name: row.legal_name,
    lifecycle_status: row.lifecycle_status,
    logo_storage_path: row.logo_storage_path,
  };
}

/** Placeholder enquanto o RSC carrega dados / financeiro — evita só o cabeçalho visível. */
function ClientEditPanelsSkeleton({ kind }: { kind: "pf" | "pj" }) {
  const tabCount = kind === "pj" ? 3 : 2;
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-label="A carregar dados do cliente"
    >
      <div className="border-border bg-muted/70 mb-6 inline-flex min-h-10 w-full max-w-full flex-wrap gap-1 rounded-lg border p-1 shadow-inner">
        {Array.from({ length: tabCount }).map((_, i) => (
          <div
            key={i}
            className="h-10 min-w-[7.5rem] flex-1 animate-pulse rounded-md bg-muted/80 sm:flex-none sm:min-w-[9rem]"
          />
        ))}
      </div>
      <div className="border-border space-y-4 rounded-xl border bg-card/60 p-4 shadow-xs sm:p-6">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-10 animate-pulse rounded-md bg-muted sm:col-span-2" />
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="h-10 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-24 animate-pulse rounded-md bg-muted" />
        <div className="flex flex-wrap gap-2 pt-2">
          <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}

/** Só a aba Checklists — não bloqueia Dados/Financeiro (streaming). */
function ClientEditChecklistsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="A carregar checklists">
      <div className="h-36 rounded-xl border border-border bg-muted/50" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted/60" />
        ))}
      </div>
      <div className="h-9 w-48 rounded-lg bg-muted/60" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted/50" />
        ))}
      </div>
    </div>
  );
}

async function ChecklistScoreHistoryBlock({ clientId }: { clientId: string }) {
  const scoreHistory = await loadChecklistScoreHistory(clientId);
  if (scoreHistory.byTemplate.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground tracking-tight">
          Evolução da pontuação
        </h3>
        <ChecklistEvolutionExportDialog clientId={clientId} />
      </div>
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

async function ClientEditChecklistsTabPanel({
  clientId,
  sp,
}: {
  clientId: string;
  sp: { est?: string; area?: string; status?: string; page?: string };
}) {
  const [scoreHistoryEl, checklistHistoryEl] = await Promise.all([
    ChecklistScoreHistoryBlock({ clientId }),
    ClientChecklistHistorySection({
      clientId,
      embeddedInClientEdit: true,
      searchParams: {
        est: sp.est,
        area: sp.area,
        status: sp.status,
        page: sp.page,
      },
    }),
  ]);
  return (
    <div className="space-y-6">
      {scoreHistoryEl}
      {checklistHistoryEl}
    </div>
  );
}

type EditSearchParams = {
  formTab?: string;
  est?: string;
  area?: string;
  status?: string;
  page?: string;
};

type ServerUser = NonNullable<Awaited<ReturnType<typeof getServerContext>>["user"]>;

/**
 * Carrega dados + financeiro em paralelo (sem a aba Checklists, que faz streaming
 * à parte). O `ClientEditTabShell` troca abas no cliente sem nova navegação RSC.
 */
async function ClientEditLoadedPanels({
  supabase,
  user,
  row,
  logoPreviewUrl,
  sp,
  canDelete,
  canEdit,
  contractErr,
  activeTab,
  returnToOrigin,
}: {
  supabase: SupabaseClient;
  user: ServerUser | null;
  row: ClientRow;
  logoPreviewUrl: string | null;
  sp: EditSearchParams;
  canDelete: boolean;
  canEdit: boolean;
  contractErr?: string;
  activeTab: ClientEditTabValue;
  returnToOrigin: string;
}) {
  const shell = shellFromClientRow(row);
  const needEstablishment = row.kind === "pj";

  const [estRes, customSegments, customEstTypes, teamMembersForSelect, tz, chargesResult, contractsResult] =
    await Promise.all([
      needEstablishment
        ? supabase
            .from("establishments")
            .select("*")
            .eq("client_id", row.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      loadCustomSegmentsAction(),
      loadEstablishmentCustomTypesAction(),
      loadTeamMembersForSelect(),
      fetchProfileTimeZone(supabase, user?.id ?? ""),
      loadFinancialChargesForClient(row.id),
      loadContractsByClient(row.id),
    ]);

  const estRow = (estRes.data as EstablishmentRow | null) ?? null;
  const establishmentAreas =
    row.kind === "pj" && estRow?.id ? await loadAreasForEstablishment(estRow.id) : [];
  const isSchoolClient = row.kind === "pj" && row.business_segment === "escola";
  const schoolGrades = isSchoolClient ? await loadGradesForClient(row.id) : [];

  const social = row.social_links ?? {};
  const tKey = todayKey(new Date(), tz);
  const payMetrics = metricsFromClientCharges(chargesResult.rows, tKey);

  const dadosPanel = (
    <>
      <ClientFormLazy
        mode="edit"
        clientId={row.id}
        canEdit={canEdit}
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
        defaultTechnicalRepProfessionalId={row.technical_rep_professional_id ?? ""}
        defaultTechnicalRepEmail={row.technical_rep_email ?? ""}
        defaultTechnicalRepPhone={row.technical_rep_phone ?? ""}
        defaultBusinessSegment={row.business_segment ?? ""}
        defaultCustomSegments={customSegments}
        defaultCustomEstTypes={customEstTypes}
        teamMembersForSelect={teamMembersForSelect}
        defaultResponsibleTeamMemberId={row.responsible_team_member_id ?? null}
        defaultEstName={estRow?.name ?? ""}
        defaultEstType={estRow?.establishment_type ?? undefined}
        defaultEstAddressLine1={estRow?.address_line1 ?? ""}
        defaultEstAddressLine2={estRow?.address_line2 ?? ""}
        defaultEstCity={estRow?.city ?? ""}
        defaultEstState={estRow?.state ?? ""}
        defaultEstPostalCode={estRow?.postal_code ?? ""}
      >
        {row.kind === "pj" ? (
          <EstablishmentsSection
            clientId={row.id}
            establishment={estRow}
            returnToOrigin={returnToOrigin}
          />
        ) : null}
      </ClientFormLazy>

      {row.kind === "pj" && estRow?.id ? (
        <>
          <Separator className="my-8" />
          <EstablishmentAreasSection
            establishmentId={estRow.id}
            initialAreas={establishmentAreas}
          />
        </>
      ) : null}

      {isSchoolClient ? (
        <>
          <Separator className="my-8" />
          <SchoolGradesSection clientId={row.id} initialGrades={schoolGrades} />
        </>
      ) : null}

      {row.kind === "pf" ? (
        <>
          <Separator className="my-8" />
          <ClientExamDocumentList clientId={row.id} />
          <Separator className="my-8" />
          <PatientsSection
            variant="client_pf"
            clientId={row.id}
            returnToOrigin={returnToOrigin}
          />
        </>
      ) : null}

      {!canDelete ? null : (
        <>
          <Separator className="my-8" />
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <h2 className="text-sm font-semibold text-destructive">Zona de perigo</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Eliminar remove o cliente da sua carteira. Em versões futuras, dados ligados
              (estabelecimentos, pacientes) podem restringir esta ação.
            </p>
            <div className="mt-3">
              <DeleteClientButton clientId={row.id} />
            </div>
          </div>
        </>
      )}
    </>
  );

  const financeiroPanel = (
    <>
      <section aria-labelledby="pagamentos-cliente-heading">
        <Card className="border-border shadow-xs ring-1 ring-border">
          <CardHeader className="pb-2">
            <CardTitle id="pagamentos-cliente-heading" className="text-base font-semibold">
              Pagamentos e inadimplência
            </CardTitle>
            <CardDescription>
              Resumo do estado de cobranças deste cliente; filtre e registe lançamentos no módulo
              financeiro.
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
                {payMetrics.openCount} em aberto ({formatBRLFromCents(payMetrics.openTotalCents)}), sem
                vencimento ultrapassado.
              </p>
            ) : payMetrics.paidCount > 0 ? (
              <p className="text-muted-foreground">
                {payMetrics.paidCount} cobrança(s) paga(s); nada em aberto.
              </p>
            ) : (
              <p className="text-muted-foreground">Ainda não há cobranças associadas a este cliente.</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs tabular-nums">
              <span>
                Em aberto:{" "}
                <span className="text-foreground font-medium">{payMetrics.openCount}</span>
              </span>
              <span>
                Em atraso:{" "}
                <span className="text-foreground font-medium">{payMetrics.overdueCount}</span>
              </span>
              <span>
                Pagas: <span className="text-foreground font-medium">{payMetrics.paidCount}</span>
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
          contracts={contractsResult.rows}
          contractErr={contractErr}
        />
      </section>
    </>
  );

  const checklistsPanel =
    row.kind === "pj" ? (
      <Suspense fallback={<ClientEditChecklistsSkeleton />}>
        <ClientEditChecklistsTabPanel
          clientId={row.id}
          sp={{
            est: sp.est,
            area: sp.area,
            status: sp.status,
            page: sp.page,
          }}
        />
      </Suspense>
    ) : null;

  return (
    <ClientEditTabShell
      clientId={shell.id}
      kind={shell.kind}
      initialTab={activeTab}
      contractErr={contractErr}
      checklistQuery={{ est: sp.est, status: sp.status, page: sp.page }}
      panels={{
        dados: dadosPanel,
        financeiro: financeiroPanel,
        checklists: checklistsPanel,
      }}
    />
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

  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_ROW_FULL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const row = normalizeClientRow(data as unknown as Record<string, unknown>);
  const shell = shellFromClientRow(row);

  if (sp.tab === "estabelecimento" && shell.kind === "pj") {
    const q = new URLSearchParams();
    if (sp.contractErr) q.set("contractErr", sp.contractErr);
    q.set("tab", "dados");
    q.set("formTab", "pj-estabelecimento");
    redirect(`/clientes/${id}/editar?${q.toString()}`);
  }

  const activeTab = resolveClientEditTab(sp.tab, shell.kind);
  const canDelete = await canDeleteWorkspaceMasterData(
    supabase,
    user.id,
    workspaceOwnerId,
  );
  const canEdit = true;

  const statusLabel =
    shell.lifecycle_status === "ativo"
      ? "Ativo"
      : shell.lifecycle_status === "inativo"
        ? "Inativo"
        : "Finalizado";

  const logoPreviewUrl = row.logo_storage_path
    ? await getClientLogoSignedUrl(supabase, row.logo_storage_path)
    : null;

  const returnToOrigin = buildCurrentUrl(`/clientes/${id}/editar`, sp);
  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/clientes",
    fallbackLabel: "Clientes",
    currentPath: `/clientes/${id}/editar`,
  });

  return (
    <PageLayout variant="form">
      <div className="flex flex-wrap items-start gap-4">
        <ClientEditHeaderAvatar row={shell} imageUrl={logoPreviewUrl} />
        <PageHeader
          title={shell.legal_name}
          description={`${shell.kind === "pf" ? "Pessoa física" : "Pessoa jurídica"}${shell.kind === "pj" ? ` · ${statusLabel}` : ""}`}
          back={back}
          className="flex-1 min-w-0"
        />
      </div>

      <Suspense fallback={<ClientEditPanelsSkeleton kind={shell.kind} />}>
        <ClientEditLoadedPanels
          supabase={supabase}
          user={user}
          row={row}
          logoPreviewUrl={logoPreviewUrl}
          sp={{
            formTab: sp.formTab,
            est: sp.est,
            area: sp.area,
            status: sp.status,
            page: sp.page,
          }}
          canDelete={canDelete}
          canEdit={canEdit}
          contractErr={sp.contractErr}
          activeTab={activeTab}
          returnToOrigin={returnToOrigin}
        />
      </Suspense>
    </PageLayout>
  );
}
