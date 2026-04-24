import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ChecklistFillWizard } from "@/components/checklists/checklist-fill-wizard";
import { buttonVariants } from "@/components/ui/button-variants";
import { Label } from "@/components/ui/label";
import { VisitExecutionHeader } from "@/components/visits/visit-execution-header";
import {
  buildVisitChecklistOptions,
  chooseVisitEstablishmentContextAction,
  createVisitChecklistSessionAction,
  getLatestFillSessionIdForVisit,
  insertVisitChecklistFillSession,
  loadVisitChecklistWizardModel,
  markScheduledVisitInProgress,
  resolveVisitChecklistEstablishmentId,
} from "@/lib/actions/visit-checklist";
import { loadScheduledVisitById } from "@/lib/actions/visits";
import { formatDateTimeShort, isSameCalendarDay } from "@/lib/datetime/calendar-tz";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import { isDossierEmailDeliveryConfigured } from "@/lib/dossier-email-delivery";
import { visitDisplayTitle } from "@/lib/visits/display-title";
import { cn } from "@/lib/utils";

const errMessages: Record<string, string> = {
  ctx: "Selecione um estabelecimento válido para esta visita.",
  missing: "Escolha um checklist para continuar.",
  context: "Não foi possível determinar o contexto do estabelecimento.",
  session: "Não foi possível criar a sessão de preenchimento.",
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
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
        <div>
          <Link
            href={`/visitas/${id}`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground -ml-2 mb-2",
            )}
          >
            ← Detalhe da visita
          </Link>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Iniciar visita
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{title}</p>
        </div>
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
        <div>
          <Link
            href={`/visitas/${id}`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground -ml-2 mb-2",
            )}
          >
            ← Detalhe da visita
          </Link>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Iniciar visita
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{title}</p>
        </div>
        <div
          role="status"
          className="border-border bg-muted/40 rounded-lg border px-4 py-3 text-sm"
        >
          {resolvedEst.message}
        </div>
        <Link
          href={`/visitas/${id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex")}
        >
          Voltar ao detalhe
        </Link>
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

    return (
      <div className="space-y-6">
        <VisitExecutionHeader
          visitTitle={title}
          contextLine={`${model.establishmentContextLabel} · ${dateLine}`}
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
          sessionId={model.sessionId}
          template={model.fill.template}
          initialResponses={model.fill.responses}
          establishmentLabel={model.fill.establishmentLabel}
          itemResponseSource={model.fill.itemResponseSource}
          initialItemPhotos={model.fill.itemPhotos}
          backHref={`/visitas/${id}`}
          backLabel="Detalhe da visita"
          recurringNcSessionCountByItemId={model.recurringNcSessionCountByItemId}
          initialDossierApprovedAt={model.fill.session.dossier_approved_at ?? null}
          initialPdfExport={model.fill.latestPdfExport}
          dossierEmailDeliveryConfigured={dossierEmailDeliveryConfigured}
        />
      </div>
    );
  }

  const latestId = await getLatestFillSessionIdForVisit(id);
  if (latestId) {
    redirect(`/visitas/${id}/iniciar?session=${latestId}`);
  }

  const options = await buildVisitChecklistOptions({
    establishmentId,
  });

  if (options.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href={`/visitas/${id}`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground -ml-2 mb-2",
            )}
          >
            ← Detalhe da visita
          </Link>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Iniciar visita
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{title}</p>
        </div>
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

  if (options.length === 1) {
    const created = await insertVisitChecklistFillSession({
      visitId: id,
      authUserId: user.id,
      establishmentId,
      option: options[0],
    });
    if ("error" in created) {
      return (
        <div className="space-y-6">
          <p className="text-destructive text-sm" role="alert">
            {created.error}
          </p>
          <Link href={`/visitas/${id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Voltar
          </Link>
        </div>
      );
    }
    redirect(`/visitas/${id}/iniciar?session=${created.sessionId}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/visitas/${id}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 mb-2",
          )}
        >
          ← Detalhe da visita
        </Link>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Iniciar visita
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{title}</p>
      </div>
      {errMsg ? (
        <p className="text-destructive text-sm" role="alert">
          {errMsg}
        </p>
      ) : null}
      <div className="border-border rounded-lg border bg-card/40 p-6 shadow-xs">
        <p className="text-foreground text-sm font-medium">Escolher checklist</p>
        <p className="text-muted-foreground mt-2 text-sm">
          Selecione o modelo regulatório ou personalizado para esta visita.
        </p>
        <form action={createVisitChecklistSessionAction} className="mt-4 space-y-4">
          <input type="hidden" name="visit_id" value={id} />
          {ctxEstablishmentId ? (
            <input type="hidden" name="ctx_establishment_id" value={ctxEstablishmentId} />
          ) : null}
          <fieldset className="space-y-3">
            <legend className="sr-only">Modelo de checklist</legend>
            {options.map((opt) => {
              const value =
                opt.kind === "global"
                  ? `global:${opt.templateId}`
                  : `custom:${opt.customTemplateId}`;
              return (
                <label
                  key={value}
                  className="border-border flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                >
                  <input
                    type="radio"
                    name="choice"
                    value={value}
                    required
                    className="border-input text-primary mt-1 h-4 w-4"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              );
            })}
          </fieldset>
          <button
            type="submit"
            className={cn(
              buttonVariants({ size: "sm" }),
              "min-h-11 min-w-[44px]",
            )}
          >
            Começar preenchimento
          </button>
        </form>
      </div>
    </div>
  );
}
