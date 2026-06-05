import { Info } from "lucide-react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

const ChecklistFillWizard = dynamic(
  () =>
    import("@/components/checklists/checklist-fill-wizard").then(
      (mod) => mod.ChecklistFillWizard,
    ),
  { loading: () => null },
);
import { PageHelpHint } from "@/components/help/page-help-hint";
import {
  getChecklistReopenEligibility,
  loadReopenEventsForSession,
} from "@/lib/actions/checklist-fill-reopen";
import { loadFillSessionPageData } from "@/lib/actions/checklist-fill";
import { getClientSignatureRequiredAction } from "@/lib/actions/checklist-pdf-settings";
import { isDossierEmailDeliveryConfigured } from "@/lib/dossier-email-delivery";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export default async function ChecklistPreencherPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ view?: string; returnTo?: string }>;
}) {
  const { sessionId } = await params;
  const sp = await searchParams;
  const viewOnlyDossier = sp.view === "dossie";
  const backHref = sp.returnTo ? safeNextPath(sp.returnTo) : undefined;

  const supabase = await createClient();

  // Phase 1: session bundle + auth + static config in parallel
  const [bundle, { data: { user } }, initialReopenEvents, clientSignatureRequired] =
    await Promise.all([
      loadFillSessionPageData(sessionId),
      supabase.auth.getUser(),
      loadReopenEventsForSession(sessionId),
      getClientSignatureRequiredAction(),
    ]);

  if (!bundle) {
    notFound();
  }

  const dossierEmailDeliveryConfigured = isDossierEmailDeliveryConfigured();

  // Phase 2: user-dependent fetches in parallel
  const [
    { canReopen: canReopenDossier },
    professionalProfile,
  ] = await Promise.all([
    bundle.itemResponseSource === "workspace" || !user
      ? Promise.resolve({ canReopen: false })
      : getChecklistReopenEligibility(supabase, user.id),
    user
      ? supabase
          .from("profiles")
          .select("full_name, crn")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Carrega nome e CRN do profissional para exibição no dialog de assinatura
  let professionalName: string | undefined = (professionalProfile?.data?.full_name as string | null) ?? undefined;
  let professionalCrn: string | undefined = (professionalProfile?.data?.crn as string | null) ?? undefined;

  // Fallback: team_members (only when profile fields are missing)
  if (user && (!professionalName || !professionalCrn)) {
    const { data: member } = await supabase
      .from("team_members")
      .select("full_name, crn")
      .eq("member_user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!professionalName) professionalName = (member?.full_name as string | null) ?? undefined;
    if (!professionalCrn) professionalCrn = (member?.crn as string | null) ?? undefined;
  }

  // Assinaturas já salvas (para re-exibição se o dossiê já foi aprovado)
  const sessionRow = bundle.session as {
    professional_signature_data_url?: string | null;
    client_signature_data_url?: string | null;
    client_signer_name?: string | null;
    document_hash?: string | null;
  };

  const createdAt = new Date(bundle.session.created_at);
  const createdAtLabel = createdAt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Preencher checklist
          </h1>
          <PageHelpHint ariaLabel="Como funciona o preenchimento do checklist">
            <p>
              A <strong>avaliação</strong> (Conforme / Não conforme / Não aplicável) grava ao clicar.{" "}
              <strong>Descrição de não conformidade</strong> e <strong>anotação</strong> salvam ao sair
              do campo (sem gravar a cada tecla). Ao mudar de seção, os itens da seção atual
              são enviados ao servidor. Você pode usar <strong>Ir para seção</strong>,{" "}
              <strong>Próxima seção</strong> ou <strong>Seção anterior</strong> sem preencher tudo de
              uma vez.
            </p>
            <p>
              Use <strong>Pré-visualizar dossiê</strong> para revisar o rascunho. Pode anexar fotos com{" "}
              <strong>Tirar foto</strong> (câmera no celular/tablet) ou <strong>Galeria</strong>.
            </p>
            <p>
              Em <strong>Finalizar e ver dossiê</strong> e em <strong>Aprovar dossiê</strong>, o
              sistema reconcilia com o servidor e valida de novo — evita perder textos já
              gravados. Só aí é obrigatório que todos os requisitos estejam válidos; depois você pode{" "}
              <strong>ajustar textos</strong> no preview e <strong>aprovar</strong> para registrar
              (imutável).
            </p>
          </PageHelpHint>
        </div>
      </div>

      {bundle.createdByName && (
        <div className="bg-muted/60 border-border flex items-start gap-3 rounded-lg border px-4 py-3 text-sm">
          <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="text-muted-foreground">
            Este rascunho foi iniciado por{" "}
            <span className="text-foreground font-medium">{bundle.createdByName}</span> em{" "}
            <span className="text-foreground font-medium">{createdAtLabel}</span>. Você está
            continuando o preenchimento.
          </p>
        </div>
      )}

      {bundle.inheritedCount > 0 && (
        <div className="bg-muted/60 border-border flex items-start gap-3 rounded-lg border px-4 py-3 text-sm">
          <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">{bundle.inheritedCount}</span>{" "}
            {bundle.inheritedCount === 1
              ? "item com validade vigente foi carregado automaticamente"
              : "itens com validade vigente foram carregados automaticamente"}{" "}
            da sessão anterior.
          </p>
        </div>
      )}

      <ChecklistFillWizard
        sessionId={bundle.session.id}
        {...(backHref ? { backHref } : {})}
        template={bundle.template}
        initialResponses={bundle.responses}
        establishmentLabel={bundle.establishmentLabel}
        areaName={bundle.areaName}
        itemResponseSource={bundle.itemResponseSource}
        initialItemPhotos={bundle.itemPhotos}
        initialDossierApprovedAt={bundle.session.dossier_approved_at ?? null}
        initialPdfExport={bundle.latestPdfExport}
        pdfExportHistory={bundle.pdfExportHistory}
        viewOnlyDossier={viewOnlyDossier}
        dossierEmailDeliveryConfigured={dossierEmailDeliveryConfigured}
        canReopenDossier={canReopenDossier}
        initialReopenEvents={initialReopenEvents}
        clientLabel={bundle.pdfClientLabel}
        professionalName={professionalName}
        professionalCrn={professionalCrn}
        initialProfessionalSignatureDataUrl={sessionRow.professional_signature_data_url ?? null}
        initialClientSignatureDataUrl={sessionRow.client_signature_data_url ?? null}
        initialClientSignerName={sessionRow.client_signer_name ?? null}
        initialDocumentHash={sessionRow.document_hash ?? null}
        clientSignatureRequired={clientSignatureRequired}
      />
    </div>
  );
}
