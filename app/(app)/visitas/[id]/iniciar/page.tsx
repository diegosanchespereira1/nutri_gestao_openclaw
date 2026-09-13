import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import dynamic from "next/dynamic";

const ChecklistFillWizard = dynamic(
  () =>
    import("@/components/checklists/checklist-fill-wizard").then(
      (mod) => mod.ChecklistFillWizard,
    ),
  { loading: () => null },
);
import {
  getChecklistReopenEligibility,
  loadReopenEventsForSession,
} from "@/lib/actions/checklist-fill-reopen";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import { PageBackLink } from "@/components/layout/page-back-link";
import { PageHeader } from "@/components/layout/page-header";
import { VisitExecutionHeader } from "@/components/visits/visit-execution-header";
import { VisitChecklistPicker } from "@/components/visits/visit-checklist-picker";
import { loadAreasForEstablishment } from "@/lib/actions/establishment-areas";
import {
  buildVisitChecklistOptions,
  chooseVisitEstablishmentContextAction,
  getLatestFillSessionIdForVisit,
  loadVisitChecklistWizardModel,
  markScheduledVisitInProgress,
  resolveVisitChecklistEstablishmentId,
} from "@/lib/actions/visit-checklist";
import { loadScheduledVisitById } from "@/lib/visits/load-scheduled-visits";
import { formatDateTimeShort, isSameCalendarDay } from "@/lib/datetime/calendar-tz";
import { getServerContext } from "@/lib/supabase/get-server-user";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import { isDossierEmailDeliveryConfigured } from "@/lib/dossier-email-delivery";
import { visitDisplayTitle } from "@/lib/visits/display-title";
import { cn } from "@/lib/utils";

const errMessages: Record<string, string> = {
  ctx: "Selecione um estabelecimento válido para esta visita.",
  missing: "Escolha um checklist para continuar.",
  context: "Não foi possível determinar o contexto do estabelecimento.",
  session: "Não foi possível criar a sessão de preenchimento.",
  area_required: "Selecione ao menos uma área para aplicar o checklist.",
  area_invalid: "Área inválida para este estabelecimento.",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    session?: string;
    ctx_est?: string;
    err?: string;
  }>;
};

export default async function IniciarVisitaPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { session: sessionParam, ctx_est: ctxEst, err } = await searchParams;
  const { supabase, user } = await getServerContext();
  if (!user) redirect("/login");
  const [{ row }, tz] = await Promise.all([
    loadScheduledVisitById(id),
    fetchProfileTimeZone(supabase, user.id),
  ]);
  if (!row) notFound();

  if (row.status !== "scheduled" && row.status !== "in_progress") {
    redirect(`/visitas/${id}?aviso=visita_nao_agendada`);
  }
  if (!isSameCalendarDay(row.scheduled_start, tz)) {
    redirect(`/visitas/${id}?aviso=inicio_somente_hoje`);
  }

  /** Visita já iniciada antes — retoma sessão em curso; primeira vez exige escolha do checklist. */
  const isContinuingVisit = row.status === "in_progress";

  await markScheduledVisitInProgress(id);

  const ctxEstablishmentId =
    typeof ctxEst === "string" && ctxEst.trim().length > 0 ? ctxEst.trim() : null;

  const resolvedEst = await resolveVisitChecklistEstablishmentId({
    visit: row,
    authUserId: user.id,
    ctxEstablishmentId,
  });

  const title = visitDisplayTitle(row);
  const dateLine = formatDateTimeShort(row.scheduled_start, tz);
  const errMsg = err && errMessages[err] ? errMessages[err] : null;

  if (!resolvedEst.ok && resolvedEst.reason === "pick") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Iniciar visita"
          description={title}
          back={{ href: `/visitas/${id}`, label: "Detalhe da visita" }}
        />
        {errMsg ? (
          <p className="text-destructive text-sm" role="alert">
            {errMsg}
          </p>
        ) : null}
        <div className="border-border rounded-lg border bg-card/40 p-6 shadow-xs">
          <p className="text-foreground text-sm font-medium">
            Estabelecimento para o checklist
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Este paciente está ligado a mais do que um estabelecimento. Indique
            qual contexto usar para portarias e checklist.
          </p>
          <form action={chooseVisitEstablishmentContextAction} className="mt-4 space-y-4">
            <input type="hidden" name="visit_id" value={id} />
            <div className="space-y-2">
              <Label htmlFor="establishment_id">Estabelecimento</Label>
              <select
                id="establishment_id"
                name="establishment_id"
                required
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full max-w-md rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <option value="">Selecione…</option>
                {resolvedEst.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className={cn(
                buttonVariants({ size: "sm" }),
                "min-h-11 min-w-[44px]",
              )}
            >
              Continuar
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!resolvedEst.ok) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Iniciar visita"
          description={title}
          back={{ href: `/visitas/${id}`, label: "Detalhe da visita" }}
        />
        <div
          role="status"
          className="border-border bg-muted/40 rounded-lg border px-4 py-3 text-sm"
        >
          {resolvedEst.message}
        </div>
        <PageBackLink href={`/visitas/${id}`} label="Voltar ao detalhe" />
      </div>
    );
  }

  const establishmentId = resolvedEst.establishmentId;

  if (sessionParam) {
    const model = await loadVisitChecklistWizardModel({
      visit: row,
      sessionId: sessionParam,
    });
    if (!model) notFound();

    const dossierEmailDeliveryConfigured = isDossierEmailDeliveryConfigured();

    const [{ canReopen: canReopenDossier }, initialReopenEvents] =
      await Promise.all([
        model.fill.itemResponseSource === "workspace" || !user
          ? Promise.resolve({ canReopen: false })
          : getChecklistReopenEligibility(supabase, user.id),
        loadReopenEventsForSession(sessionParam),
      ]);

    return (
      <div className="space-y-6">
        <VisitExecutionHeader
          visitTitle={title}
          contextLine={
            model.fill.session.area_name
              ? `${model.establishmentContextLabel} · ${model.fill.session.area_name} · ${dateLine}`
              : `${model.establishmentContextLabel} · ${dateLine}`
          }
          progressDone={model.progress.done}
          progressTotal={model.progress.total}
          detailHref={`/visitas/${id}`}
        />
        {Object.keys(model.recurringNcSessionCountByItemId).length > 0 ? (
          <p
            className="border-border bg-muted/30 text-muted-foreground rounded-lg border px-4 py-3 text-sm"
            role="status"
          >
            Itens com não conformidade em visitas anteriores neste estabelecimento
            mostram o aviso <span className="text-foreground font-medium">Recorrente</span>{" "}
            e quantas sessões registaram NC.
          </p>
        ) : null}
        <ChecklistFillWizard
          key={model.sessionId}
          sessionId={model.sessionId}
          template={model.fill.template}
          initialResponses={model.fill.responses}
          establishmentLabel={model.fill.establishmentLabel}
          areaName={model.fill.session.area_name ?? null}
          itemResponseSource={model.fill.itemResponseSource}
          initialItemPhotos={model.fill.itemPhotos}
          backHref={`/visitas/${id}`}
          backLabel="Detalhe da visita"
          nextBatchSessionBasePath={`/visitas/${id}/iniciar`}
          recurringNcSessionCountByItemId={model.recurringNcSessionCountByItemId}
          initialDossierApprovedAt={model.fill.session.dossier_approved_at ?? null}
          initialPdfExport={model.fill.latestPdfExport}
          pdfExportHistory={model.fill.pdfExportHistory}
          dossierEmailDeliveryConfigured={dossierEmailDeliveryConfigured}
          canReopenDossier={canReopenDossier}
          initialReopenEvents={initialReopenEvents}
        />
      </div>
    );
  }

  const latestId = isContinuingVisit
    ? await getLatestFillSessionIdForVisit(id)
    : null;
  if (latestId) {
    redirect(`/visitas/${id}/iniciar?session=${latestId}`);
  }

  const [options, areas] = await Promise.all([
    buildVisitChecklistOptions(),
    loadAreasForEstablishment(establishmentId),
  ]);

  if (options.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Iniciar visita"
          description={title}
          back={{ href: `/visitas/${id}`, label: "Detalhe da visita" }}
        />
        <div
          role="status"
          className="border-border bg-muted/40 rounded-lg border px-4 py-3 text-sm"
        >
          Não há checklists aplicáveis a este estabelecimento (UF e tipo).
          Verifique o cadastro ou os modelos ativos em Checklists.
        </div>
        <Link
          href="/checklists"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex")}
        >
          Ir para Checklists
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Iniciar visita"
        description={title}
        back={{ href: `/visitas/${id}`, label: "Detalhe da visita" }}
      />
      {errMsg ? (
        <p className="text-destructive text-sm" role="alert">
          {errMsg}
        </p>
      ) : null}
      <VisitChecklistPicker
        visitId={id}
        establishmentId={establishmentId}
        ctxEstablishmentId={ctxEstablishmentId}
        options={options}
        areas={areas}
      />
    </div>
  );
}
