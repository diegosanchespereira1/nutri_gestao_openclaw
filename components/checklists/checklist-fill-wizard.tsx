"use client";

import { Eye, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { ChecklistFillDossierPdfCard } from "@/components/checklists/checklist-fill-dossier-pdf-card";
import { ChecklistFillDossierPreview } from "@/components/checklists/checklist-fill-dossier-preview";
import { ChecklistReopenDialog } from "@/components/checklists/checklist-reopen-dialog";
import { ChecklistItemPhotos } from "@/components/checklists/checklist-item-photos";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { cn } from "@/lib/utils";
import {
  approveChecklistFillDossierAction,
  loadFillResponsesMapForSession,
  saveFillItemResponse,
  type FillActionResult,
} from "@/lib/actions/checklist-fill";
import {
  MAX_CHECKLIST_ITEM_ANNOTATION_CHARS,
  type SectionValidationIssue,
  validateChecklistSection,
  validateChecklistTemplate,
  type ChecklistFillOutcome,
  type FillItemResponseState,
  type FillResponsesMap,
} from "@/lib/types/checklist-fill";
import type { ChecklistFillPdfExportRow } from "@/lib/types/checklist-fill-pdf";
import type { ChecklistFillSessionReopenEventRow } from "@/lib/types/checklist-reopen";
import type { ChecklistFillPhotoView } from "@/lib/types/checklist-fill-photos";
import {
  clearChecklistFillBatch,
  getNextBatchItemAfterSession,
  type ChecklistFillBatchItem,
} from "@/lib/checklist-fill-batch-storage";
import type { ChecklistTemplateWithSections } from "@/lib/types/checklists";

/** Funde texto vazio no cliente com valores já persistidos (mesmo outcome). */
function mergeClientResponsesWithServer(
  client: FillResponsesMap,
  server: FillResponsesMap,
  template: ChecklistTemplateWithSections,
): FillResponsesMap {
  const out: FillResponsesMap = { ...client };
  for (const sec of template.sections) {
    for (const item of sec.items) {
      const c = out[item.id];
      const s = server[item.id];
      if (!c?.outcome || !s?.outcome) continue;
      if (c.outcome !== s.outcome) continue;
      let next: FillItemResponseState = { ...c };
      if (c.outcome === "nc") {
        const cNote = (c.note ?? "").trim();
        const sNote = (s.note ?? "").trim();
        if (cNote.length === 0 && sNote.length > 0) {
          next = { ...next, note: s.note };
        }
      }
      const cAnn = (next.annotation ?? "").trim();
      const sAnn = (s.annotation ?? "").trim();
      if (cAnn.length === 0 && sAnn.length > 0) {
        next = { ...next, annotation: s.annotation };
      }
      const cValidUntil = (next.validUntil ?? "").trim();
      const sValidUntil = (s.validUntil ?? "").trim();
      if (cValidUntil.length === 0 && sValidUntil.length > 0) {
        next = { ...next, validUntil: s.validUntil };
      }
      out[item.id] = next;
    }
  }
  return out;
}

const textareaClass =
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring mt-2 flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

const sectionSelectClassName =
  "border-input bg-background text-foreground focus-visible:ring-ring h-9 w-full min-w-[12rem] max-w-xl rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const EMPTY_ITEM_PHOTOS: ChecklistFillPhotoView[] = [];

const emptyItemState = (): FillItemResponseState => ({
  outcome: null,
  note: null,
  annotation: null,
  validUntil: null,
});

function buildIssueMessageWithSectionAndItem(
  sections: ChecklistTemplateWithSections["sections"],
  issue: SectionValidationIssue,
): string {
  const sectionIndex = sections.findIndex((sec) =>
    sec.items.some((item) => item.id === issue.item_id),
  );
  if (sectionIndex < 0) return issue.message;
  const section = sections[sectionIndex];
  const item = section.items.find((it) => it.id === issue.item_id);
  if (!section || !item) return issue.message;
  return `Seção ${sectionIndex + 1} (${section.title}) — Item "${item.description}": ${issue.message}`;
}

function scoreClassification(pct: number): {
  label: string;
  colorClass: string;
} {
  if (pct >= 90) return { label: "Excelente", colorClass: "bg-green-100 text-green-800" };
  if (pct >= 75) return { label: "Bom", colorClass: "bg-blue-100 text-blue-800" };
  if (pct >= 50) return { label: "Regular", colorClass: "bg-amber-100 text-amber-800" };
  return { label: "Crítico", colorClass: "bg-red-100 text-red-800" };
}

function formatDossierApprovedLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  sessionId: string;
  template: ChecklistTemplateWithSections;
  initialResponses: FillResponsesMap;
  establishmentLabel: string;
  /** Nome da área física avaliada nesta sessão (quando definido). */
  areaName?: string | null;
  /** Itens mapeiam para template global, personalizado ou modelo de workspace (equipe). */
  itemResponseSource: "global" | "custom" | "workspace";
  backHref?: string;
  backLabel?: string;
  /**
   * Por item: em quantas sessões anteriores (mesmo estabelecimento) este item foi NC.
   * Só aplicável no fluxo visita (FR21).
   */
  recurringNcSessionCountByItemId?: Record<string, number>;
  /** Fotos por item (URLs assinadas). */
  initialItemPhotos?: Record<string, ChecklistFillPhotoView[]>;
  /** Se já aprovado (servidor), abre diretamente o dossiê em leitura. */
  initialDossierApprovedAt?: string | null;
  /** Último job de exportação PDF (se existir). */
  initialPdfExport?: ChecklistFillPdfExportRow | null;
  /** Modo de visualização do dossiê, sem edição. */
  viewOnlyDossier?: boolean;
  /** Resend + remetente configurados (envio de PDF por email). */
  dossierEmailDeliveryConfigured?: boolean;
  /** Titular ou admin da equipa: pode reabrir checklist já aprovado. */
  canReopenDossier?: boolean;
  /** Histórico de reaberturas (auditoria). */
  initialReopenEvents?: ChecklistFillSessionReopenEventRow[];
  /** PDFs `ready` da sessão (versões / obsoletos). */
  pdfExportHistory?: ChecklistFillPdfExportRow[];
};

export function ChecklistFillWizard({
  sessionId,
  template,
  initialResponses,
  establishmentLabel,
  areaName = null,
  itemResponseSource,
  backHref = "/checklists",
  backLabel = "Voltar ao catálogo",
  recurringNcSessionCountByItemId = {},
  initialItemPhotos = {},
  initialDossierApprovedAt = null,
  initialPdfExport = null,
  viewOnlyDossier = false,
  dossierEmailDeliveryConfigured = false,
  canReopenDossier = false,
  initialReopenEvents = [],
  pdfExportHistory = [],
}: Props) {
  const router = useRouter();
  const sections = template.sections;
  const [sectionIndex, setSectionIndex] = useState(() =>
    initialDossierApprovedAt
      ? Math.max(0, template.sections.length - 1)
      : 0,
  );
  const [responses, setResponses] = useState<FillResponsesMap>(() => ({
    ...initialResponses,
  }));
  const responsesRef = useRef<FillResponsesMap>(responses);
  const sectionIndexRef = useRef(sectionIndex);

  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  useEffect(() => {
    sectionIndexRef.current = sectionIndex;
  }, [sectionIndex]);

  const prevSectionIndexForScrollRef = useRef(sectionIndex);
  useEffect(() => {
    if (prevSectionIndexForScrollRef.current === sectionIndex) return;
    prevSectionIndexForScrollRef.current = sectionIndex;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [sectionIndex]);

  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [finalizeDialogError, setFinalizeDialogError] = useState<string | null>(null);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [finalizeBusy, setFinalizeBusy] = useState(false);
  const [dossierPreviewConfirmed, setDossierPreviewConfirmed] = useState(() =>
    Boolean(initialDossierApprovedAt),
  );
  const [dossierApprovedAt, setDossierApprovedAt] = useState<string | null>(
    () => initialDossierApprovedAt ?? null,
  );
  const [approveError, setApproveError] = useState<string | null>(null);
  const [dossierPeekOpen, setDossierPeekOpen] = useState(false);
  const [multiAreaNextDialog, setMultiAreaNextDialog] =
    useState<ChecklistFillBatchItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isApprovePending, startApproveTransition] = useTransition();

  const handleDossierReopened = useCallback(() => {
    setDossierApprovedAt(null);
    setDossierPreviewConfirmed(false);
    setSectionIndex(0);
  }, []);

  /* ── Task D: indicador de auto-save ── */
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function reportSaving() {
    if (savedTimerRef.current !== null) clearTimeout(savedTimerRef.current);
    setSaveStatus("saving");
    setSaveErrorMsg(null);
  }
  function reportSaved() {
    setSaveStatus("saved");
    setSaveErrorMsg(null);
    savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
  }
  function reportSaveError(error?: string) {
    setSaveStatus("error");
    setSaveErrorMsg(error || "Erro desconhecido ao salvar");
    if (error) {
      console.error("Erro ao salvar:", error);
    }
  }

  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const formLocked = dossierPreviewConfirmed || Boolean(dossierApprovedAt);

  /* ── Task B: guarda de navegação ── */
  const { guardTriggered, confirmLeave, cancelLeave } = useNavigationGuard({
    active: !formLocked,
    onConfirmLeave: () => {
      router.push(backHref);
    },
  });

  const showDossierPeekButton = useMemo(
    () => !dossierApprovedAt && !dossierPreviewConfirmed,
    [dossierApprovedAt, dossierPreviewConfirmed],
  );
  const [livePhotos, setLivePhotos] = useState<Record<string, ChecklistFillPhotoView[]>>(
    () => ({ ...initialItemPhotos }),
  );

  const handlePhotosChange = useCallback((itemId: string, photos: ChecklistFillPhotoView[]) => {
    setLivePhotos((prev) => ({ ...prev, [itemId]: photos }));
  }, []);

  const patchDossierResponse = useCallback(
    (
      itemId: string,
      patch: Partial<Pick<FillItemResponseState, "note" | "annotation" | "validUntil">>,
    ) => {
      setResponses((prev) => {
        const cur = prev[itemId] ?? emptyItemState();
        return { ...prev, [itemId]: { ...cur, ...patch } };
      });
    },
    [],
  );

  const syncAllResponsesToServer = useCallback(
    async (
      snapshot?: FillResponsesMap,
      persistMode: "full" | "merge" = "merge",
    ): Promise<FillActionResult> => {
      const data = snapshot ?? responsesRef.current;
      for (const itemId of Object.keys(data)) {
        const cur = data[itemId];
        if (!cur?.outcome) continue;
        const result = await saveFillItemResponse({
          sessionId,
          itemId,
          itemResponseSource,
          outcome: cur.outcome,
          note: cur.note ?? null,
          annotation: cur.annotation ?? null,
          validUntil: cur.validUntil ?? null,
          persistMode,
        });
        if (!result.ok) return result;
      }
      return { ok: true };
    },
    [sessionId, itemResponseSource],
  );

  /** Reconcilia com BD, grava com modo merge e valida o que ficou persistido. */
  const runReconcileThenSync = useCallback(async (): Promise<FillActionResult> => {
    const remote = await loadFillResponsesMapForSession(sessionId);
    if (!remote.ok) return remote;
    const merged = mergeClientResponsesWithServer(
      responsesRef.current,
      remote.responses,
      template,
    );
    setResponses(merged);
    responsesRef.current = merged;

    const synced = await syncAllResponsesToServer(merged, "merge");
    if (!synced.ok) return synced;

    const verify = await loadFillResponsesMapForSession(sessionId);
    if (!verify.ok) return verify;
    const postIssues = validateChecklistTemplate(sections, verify.responses);
    if (postIssues.length > 0) {
      return { ok: false, error: postIssues[0].message };
    }
    return { ok: true };
  }, [sessionId, template, sections, syncAllResponsesToServer]);

  /** Grava nota/anotação só ao sair do campo — evita salvar a cada tecla. */
  const persistItemOnBlur = useCallback(
    (itemId: string) => {
      startTransition(async () => {
        const cur = responsesRef.current[itemId];
        if (!cur?.outcome) return;
        reportSaving();
        const result = await saveFillItemResponse({
          sessionId,
          itemId,
          itemResponseSource,
          outcome: cur.outcome,
          note: cur.note ?? null,
          annotation: cur.annotation ?? null,
          validUntil: cur.validUntil ?? null,
          persistMode: "full",
        });
        if (result.ok) reportSaved();
        else reportSaveError(result.error);
      });
    },
    [sessionId, itemResponseSource],
  );

  const section = sections[sectionIndex];
  const isLast = sectionIndex >= sections.length - 1;

  const clientIssues = useMemo(
    () => (section ? validateChecklistSection(section, responses) : []),
    [section, responses],
  );

  const issueByItemId = useMemo(() => {
    const m: Record<string, string> = {};
    for (const i of clientIssues) {
      m[i.item_id] = i.message;
    }
    return m;
  }, [clientIssues]);

  /** Pontuação em tempo real: só computa itens com resposta (exclui pendentes e NA). */
  const liveScore = useMemo(() => {
    let earned = 0;
    let total = 0;
    for (const sec of sections) {
      for (const item of sec.items) {
        const r = responses[item.id];
        if (!r?.outcome || r.outcome === "na") continue;
        const w = item.peso ?? 1;
        total += w;
        if (r.outcome === "conforme") earned += w;
      }
    }
    if (total === 0) return null;
    return Math.round((earned / total) * 100);
  }, [sections, responses]);

  /** Pontuação por seção — null quando nenhum item respondido naquela seção. */
  const sectionScores = useMemo(() => {
    return sections.map((sec) => {
      let earned = 0;
      let total = 0;
      for (const item of sec.items) {
        const r = responses[item.id];
        if (!r?.outcome || r.outcome === "na") continue;
        const w = item.peso ?? 1;
        total += w;
        if (r.outcome === "conforme") earned += w;
      }
      if (total === 0) return null;
      return Math.round((earned / total) * 100);
    });
  }, [sections, responses]);

  function setOutcome(itemId: string, outcome: ChecklistFillOutcome | null) {
    const cur = responses[itemId] ?? emptyItemState();
    const note = outcome === "nc" ? cur.note : null;
    const annotation = cur.annotation ?? null;
    const validUntil = cur.validUntil ?? null;
    setResponses((prev) => ({
      ...prev,
      [itemId]: { outcome, note, annotation, validUntil },
    }));
    reportSaving();
    startTransition(async () => {
      const result = await saveFillItemResponse({
        sessionId,
        itemId,
        itemResponseSource,
        outcome,
        note,
        annotation,
        validUntil,
      });
      if (result.ok) {
        reportSaved();
      } else {
        reportSaveError(result.error);
      }
    });
  }

  function setNote(itemId: string, note: string) {
    setResponses((prev) => {
      const cur = prev[itemId] ?? emptyItemState();
      return {
        ...prev,
        [itemId]: { ...cur, note },
      };
    });
  }

  function setAnnotation(itemId: string, annotation: string) {
    setResponses((prev) => {
      const cur = prev[itemId] ?? emptyItemState();
      return {
        ...prev,
        [itemId]: { ...cur, annotation },
      };
    });
  }

  function setValidUntil(itemId: string, validUntil: string) {
    setResponses((prev) => {
      const cur = prev[itemId] ?? emptyItemState();
      return {
        ...prev,
        [itemId]: { ...cur, validUntil },
      };
    });
  }

  function handleNext() {
    setAdvanceError(null);
    if (!section || isLast) return;
    
    // Salvar campos antes de ir para próxima seção
    saveCurrentSectionFields();
    setSectionIndex((i) => i + 1);
  }

  function handlePrev() {
    setAdvanceError(null);
    
    // Salvar campos antes de ir para seção anterior
    saveCurrentSectionFields();
    setSectionIndex((i) => Math.max(0, i - 1));
  }

  function saveCurrentSectionFields() {
    if (!section) return;
    for (const item of section.items) {
      const cur = responsesRef.current[item.id];
      if (!cur?.outcome) continue;
      reportSaving();
      startTransition(async () => {
        const result = await saveFillItemResponse({
          sessionId,
          itemId: item.id,
          itemResponseSource,
          outcome: cur.outcome,
          note: cur.note ?? null,
          annotation: cur.annotation ?? null,
          validUntil: cur.validUntil ?? null,
          persistMode: "full",
        });
        if (result.ok) {
          reportSaved();
        } else {
          reportSaveError(result.error);
        }
      });
    }
  }

  if (!section) {
    return (
      <p className="text-muted-foreground text-sm">Modelo sem seções.</p>
    );
  }

  if (dossierApprovedAt && !viewOnlyDossier) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-muted-foreground text-sm">{establishmentLabel}</p>
            <h2 className="text-foreground text-xl font-semibold tracking-tight">
              {template.name}
            </h2>
            {areaName ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary shadow-xs">
                <MapPin className="size-4 shrink-0" aria-hidden />
                {areaName}
              </div>
            ) : null}
            <p className="text-muted-foreground mt-1 text-sm">
              Este checklist já foi finalizado. Visualize abaixo o dossiê aprovado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ChecklistReopenDialog
              sessionId={sessionId}
              canReopen={canReopenDossier}
              onReopened={handleDossierReopened}
            />
            <Link
              href={backHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {backLabel}
            </Link>
          </div>
        </div>

        {initialReopenEvents.length > 0 ? (
          <div className="bg-muted/30 rounded-lg border p-4 text-sm">
            <p className="text-foreground font-medium">Histórico de reaberturas</p>
            <ul className="text-foreground/85 mt-2 space-y-2 text-xs">
              {initialReopenEvents.map((ev) => (
                <li key={ev.id} className="border-border/60 border-b pb-2 last:border-0 last:pb-0">
                  <p>
                    {formatDossierApprovedLabel(ev.created_at)} — {ev.reopened_by_label} (
                    {ev.reopened_by_role === "owner"
                      ? "Titular"
                      : ev.reopened_by_role === "gestao"
                        ? "Gestão"
                        : "Administrador"})
                  </p>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                    Justificativa: {ev.justification}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ChecklistFillDossierPreview
          template={template}
          responses={responses}
          itemPhotos={livePhotos}
          reviewEditable={false}
          dossierApprovedAt={dossierApprovedAt}
          heading="Dossiê aprovado"
          intro="Relatório aprovado e em modo somente leitura."
        />

        <ChecklistFillDossierPdfCard
          sessionId={sessionId}
          dossierApprovedAt={dossierApprovedAt}
          initialJob={initialPdfExport ?? null}
          pdfExportHistory={pdfExportHistory}
          dossierEmailDeliveryConfigured={dossierEmailDeliveryConfigured}
        />
      </div>
    );
  }

  if (viewOnlyDossier) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-muted-foreground text-sm">{establishmentLabel}</p>
            <h2 className="text-foreground text-xl font-semibold tracking-tight">
              {template.name}
            </h2>
            {areaName ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary shadow-xs">
                <MapPin className="size-4 shrink-0" aria-hidden />
                {areaName}
              </div>
            ) : null}
            <p className="text-muted-foreground mt-1 text-sm">
              Visualização do dossiê desta sessão.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!dossierApprovedAt ? (
              <Link
                href={`/checklists/preencher/${sessionId}`}
                className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
              >
                Continuar preenchendo
              </Link>
            ) : null}
            <Link
              href={backHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {backLabel}
            </Link>
          </div>
        </div>

        <ChecklistFillDossierPreview
          template={template}
          responses={responses}
          itemPhotos={livePhotos}
          reviewEditable={false}
          dossierApprovedAt={dossierApprovedAt}
          heading={dossierApprovedAt ? "Dossiê aprovado" : "Dossiê em andamento"}
          intro={
            dossierApprovedAt
              ? "Este dossiê já foi aprovado e está em modo somente leitura."
              : "Modo de visualização. Use \"Continuar preenchendo\" para editar esta sessão."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{establishmentLabel}</p>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">
            {template.name}
          </h2>
          {areaName ? (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              📍 {areaName}
            </span>
          ) : null}
          <p className="text-muted-foreground mt-1 text-sm">
            Seção {sectionIndex + 1} de {sections.length}: {section.title}
          </p>
          {/* Task D: indicador de auto-save */}
          {saveStatus === "saving" && (
            <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground" role="status" aria-live="polite">
              <svg className="size-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Salvando…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="mt-1 flex items-center gap-1.5 text-xs text-green-600" role="status" aria-live="polite">
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Salvo
            </span>
          )}
          {saveStatus === "error" && (
            <span className="mt-1 flex items-center gap-1.5 text-xs text-destructive" role="alert" aria-live="assertive">
              <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {saveErrorMsg || "Erro ao salvar — verifique a conexão"}
            </span>
          )}
          {/* Score global + score da seção atual */}
          {(liveScore !== null || sectionScores[sectionIndex] !== null) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {liveScore !== null && (() => {
                const { label, colorClass } = scoreClassification(liveScore);
                return (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
                      colorClass,
                    )}
                    role="status"
                    aria-live="polite"
                    aria-label={`Pontuação geral: ${liveScore}% — ${label}`}
                  >
                    Geral: {liveScore}% · {label}
                  </span>
                );
              })()}
              {sectionScores[sectionIndex] !== null && (() => {
                const sc = sectionScores[sectionIndex]!;
                const { label, colorClass } = scoreClassification(sc);
                return (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums",
                      colorClass,
                    )}
                    aria-label={`Pontuação desta seção: ${sc}% — ${label}`}
                  >
                    Seção: {sc}%
                  </span>
                );
              })()}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showDossierPeekButton ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={() => setDossierPeekOpen(true)}
            >
              <Eye className="size-4 shrink-0" aria-hidden />
              Pré-visualizar dossiê
            </Button>
          ) : null}
          <Link
            href={backHref}
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            {backLabel}
          </Link>
        </div>
      </div>

      {advanceError ? (
        <p className="text-destructive text-sm" role="alert">
          {advanceError}
        </p>
      ) : null}

      <fieldset
        disabled={isPending || formLocked}
        className="space-y-6"
        aria-busy={isPending}
      >
        <legend className="sr-only">{section.title}</legend>
        {section.items.map((item) => {
          const r = responses[item.id] ?? emptyItemState();
          const err = issueByItemId[item.id];
          const requiredInvalid = item.is_required && Boolean(err);
          const recurringNcSessions = recurringNcSessionCountByItemId[item.id] ?? 0;
          const showRecurringNc = recurringNcSessions > 0;
          return (
            <div
              key={item.id}
              className={cn(
                "rounded-xl border border-border bg-white p-4 shadow-xs transition-[box-shadow,border-color] duration-150",
                requiredInvalid
                  ? "border-destructive ring-destructive/35 ring-2"
                  : "border-border",
              )}
              aria-invalid={requiredInvalid || undefined}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-foreground text-base leading-snug font-semibold tracking-tight sm:text-lg">
                  {item.description}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {showRecurringNc ? (
                    <span
                      className="bg-amber-500/15 text-amber-900 shrink-0 rounded-md px-2 py-0.5 text-xs font-medium"
                      title="Não conformidade em visitas anteriores neste estabelecimento"
                    >
                      Recorrente · {recurringNcSessions}×
                    </span>
                  ) : null}
                  {item.is_required ? (
                    <span className="bg-primary/15 text-primary shrink-0 rounded-md px-2 py-0.5 text-xs font-medium">
                      Obrigatório
                    </span>
                  ) : null}
                </div>
              </div>

              {showRecurringNc ? (
                <p
                  className="text-muted-foreground mt-2 border-l-2 border-amber-500/60 pl-3 text-xs"
                  role="status"
                >
                  Este item foi assinalado como não conforme em{" "}
                  <span className="text-foreground font-medium">
                    {recurringNcSessions}
                  </span>{" "}
                  {recurringNcSessions === 1
                    ? "visita anterior"
                    : "visitas anteriores"}{" "}
                  neste estabelecimento.
                </p>
              ) : null}

              <div
                className="mt-3 space-y-2"
                role="radiogroup"
                aria-label={item.description}
                aria-invalid={requiredInvalid && r.outcome === null ? true : undefined}
              >
                <Label
                  className={cn(
                    "text-xs",
                    requiredInvalid && r.outcome === null
                      ? "text-destructive font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  Avaliação
                  {item.is_required ? (
                    <span className="sr-only"> (obrigatório)</span>
                  ) : null}
                </Label>
                <div className="flex flex-wrap gap-4">
                  {(
                    [
                      ["conforme", "Conforme"],
                      ["nc", "Não conforme"],
                      ["na", "Não aplicável"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name={`outcome-${item.id}`}
                        value={value}
                        checked={r.outcome === value}
                        onChange={() => setOutcome(item.id, value)}
                        className="border-input text-primary h-4 w-4"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <ChecklistItemPhotos
                sessionId={sessionId}
                itemId={item.id}
                itemResponseSource={itemResponseSource}
                initialPhotos={livePhotos[item.id] ?? EMPTY_ITEM_PHOTOS}
                disabled={isPending || formLocked}
                onPhotosChange={(photos) => handlePhotosChange(item.id, photos)}
              />

              {r.outcome === "nc" ? (
                <div className="mt-3">
                  <Label htmlFor={`note-${item.id}`}>
                    Descrição da não conformidade
                  </Label>
                  <textarea
                    id={`note-${item.id}`}
                    rows={3}
                    value={r.note ?? ""}
                    onChange={(e) => {
                      setNote(item.id, e.target.value);
                    }}
                    onBlur={() => persistItemOnBlur(item.id)}
                    className={textareaClass}
                    aria-invalid={Boolean(err)}
                    aria-describedby={
                      err ? `err-${item.id}` : undefined
                    }
                  />
                </div>
              ) : null}

              {r.outcome !== null ? (
                <div className="mt-3">
                  <Label htmlFor={`valid-until-${item.id}`}>
                    Válido até{" "}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <input
                    id={`valid-until-${item.id}`}
                    type="date"
                    value={r.validUntil ?? ""}
                    onChange={(e) => {
                      setValidUntil(item.id, e.target.value);
                    }}
                    onBlur={() => persistItemOnBlur(item.id)}
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring mt-2 flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              ) : null}

              {r.outcome !== null ? (
                <div className="mt-3">
                  <Label htmlFor={`annotation-${item.id}`}>
                    Anotação{" "}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <textarea
                    id={`annotation-${item.id}`}
                    rows={3}
                    maxLength={MAX_CHECKLIST_ITEM_ANNOTATION_CHARS}
                    value={r.annotation ?? ""}
                    onChange={(e) => {
                      setAnnotation(item.id, e.target.value);
                    }}
                    onBlur={() => persistItemOnBlur(item.id)}
                    className={textareaClass}
                    aria-describedby={`annotation-hint-${item.id}`}
                  />
                  <p
                    id={`annotation-hint-${item.id}`}
                    className="text-muted-foreground mt-1 text-xs"
                  >
                    {(r.annotation ?? "").length}/{MAX_CHECKLIST_ITEM_ANNOTATION_CHARS}{" "}
                    caracteres
                  </p>
                </div>
              ) : null}

              {err ? (
                <p
                  id={`err-${item.id}`}
                  className="text-destructive mt-2 text-sm"
                  role="alert"
                >
                  {err}
                </p>
              ) : null}
            </div>
          );
        })}
      </fieldset>

      <div className="flex flex-col gap-4 border-t pt-4">
        {!formLocked ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5 sm:max-w-xl">
              <Label htmlFor="checklist-section-jump" className="text-xs">
                Ir para seção
              </Label>
              <select
                id="checklist-section-jump"
                className={sectionSelectClassName}
                value={sectionIndex}
                onChange={(e) => {
                  setAdvanceError(null);
                  const next = Number.parseInt(e.target.value, 10);
                  if (!Number.isFinite(next)) return;
                  saveCurrentSectionFields();
                  setSectionIndex(Math.min(Math.max(0, next), sections.length - 1));
                }}
                aria-label="Escolher seção do checklist"
              >
                {sections.map((s, i) => {
                  const sc = sectionScores[i];
                  return (
                    <option key={s.id} value={i}>
                      {i + 1}. {s.title}{sc !== null ? ` — ${sc}%` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={sectionIndex === 0 || isPending || formLocked}
          >
            Seção anterior
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={isPending || formLocked || isLast}
          >
            Próxima seção
          </Button>
          {!formLocked ? (
            <Button
              type="button"
              variant={isLast ? "default" : "secondary"}
              disabled={isPending}
              onClick={() => {
                setAdvanceError(null);
                setFinalizeDialogError(null);
                setFinalizeDialogOpen(true);
              }}
            >
              Finalizar e ver dossiê
            </Button>
          ) : null}
        </div>
        {dossierPreviewConfirmed || dossierApprovedAt ? (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg border p-4 text-sm">
              <p className="text-foreground font-medium">
                {dossierApprovedAt
                  ? "Dossiê aprovado"
                  : "Dossiê em revisão"}
              </p>
              <p className="text-muted-foreground mt-1">
                {dossierApprovedAt
                  ? "Dossiê aprovado e registrado. Se esta sessão estiver ligada a uma visita, a visita foi marcada como concluída."
                  : "Dossiê compilado abaixo. Ajuste textos se necessário e aprove para fechar o ciclo."}
              </p>
              {dossierApprovedAt ? (
                <p
                  className="text-primary mt-2 text-xs font-medium"
                  role="status"
                >
                  Aprovado em {formatDossierApprovedLabel(dossierApprovedAt)}. Respostas e
                  anexos ficam imutáveis (FR70).
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {dossierApprovedAt ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setDossierPeekOpen(true)}
                  >
                    <Eye className="size-4 shrink-0" aria-hidden />
                    Ver dossiê
                  </Button>
                ) : null}
                <ChecklistReopenDialog
                  sessionId={sessionId}
                  canReopen={canReopenDossier && Boolean(dossierApprovedAt)}
                  onReopened={handleDossierReopened}
                />
                <Link
                  href={backHref}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex")}
                >
                  {backLabel}
                </Link>
              </div>
            </div>
            {initialReopenEvents.length > 0 ? (
              <div className="bg-muted/30 rounded-lg border p-4 text-sm">
                <p className="text-foreground font-medium">Histórico de reaberturas</p>
                <ul className="text-foreground/85 mt-2 space-y-2 text-xs">
                  {initialReopenEvents.map((ev) => (
                    <li key={ev.id} className="border-border/60 border-b pb-2 last:border-0 last:pb-0">
                      <p>
                        {formatDossierApprovedLabel(ev.created_at)} — {ev.reopened_by_label} (
                        {ev.reopened_by_role === "owner"
                          ? "Titular"
                          : ev.reopened_by_role === "gestao"
                            ? "Gestão"
                            : "Administrador"})
                      </p>
                      <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                        Justificativa: {ev.justification}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {dossierPreviewConfirmed ? (
              <>
                <ChecklistFillDossierPreview
                  template={template}
                  responses={responses}
                  itemPhotos={livePhotos}
                  reviewEditable={Boolean(
                    dossierPreviewConfirmed && !dossierApprovedAt,
                  )}
                  sessionId={sessionId}
                  itemResponseSource={itemResponseSource}
                  onPatchResponse={patchDossierResponse}
                  dossierApprovedAt={dossierApprovedAt}
                />
                {dossierPreviewConfirmed && !dossierApprovedAt ? (
                  <div className="border-border space-y-3 rounded-lg border bg-muted/20 p-4">
                    <p className="text-muted-foreground text-xs">
                      Após aprovar, o relatório fica registrado e deixa de ser editável. Novas
                      alterações no produto seguirão o fluxo de nova versão do relatório
                      (FR70).
                    </p>
                    {approveError ? (
                      <p className="text-destructive text-sm" role="alert">
                        {approveError}
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      disabled={isApprovePending}
                      onClick={() => {
                        setApproveError(null);
                        startApproveTransition(async () => {
                          const synced = await runReconcileThenSync();
                          if (!synced.ok) {
                            setApproveError(synced.error);
                            return;
                          }
                          const r = await approveChecklistFillDossierAction(sessionId);
                          if (!r.ok) {
                            setApproveError(r.error);
                            return;
                          }
                          setDossierApprovedAt(r.approvedAt);
                          const nextInBatch = getNextBatchItemAfterSession(sessionId);
                          if (nextInBatch) {
                            setMultiAreaNextDialog(nextInBatch);
                          } else {
                            clearChecklistFillBatch();
                          }
                          router.refresh();
                        });
                      }}
                    >
                      {isApprovePending ? "Aprovando…" : "Aprovar dossiê"}
                    </Button>
                  </div>
                ) : null}
                {dossierApprovedAt ? (
                  <ChecklistFillDossierPdfCard
                    sessionId={sessionId}
                    dossierApprovedAt={dossierApprovedAt}
                    initialJob={initialPdfExport ?? null}
                    pdfExportHistory={pdfExportHistory}
                    dossierEmailDeliveryConfigured={dossierEmailDeliveryConfigured}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Dialog de finalização */}
      <Dialog
        open={finalizeDialogOpen}
        onOpenChange={(open) => {
          setFinalizeDialogOpen(open);
          if (!open) setFinalizeDialogError(null);
        }}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Finalizar e compilar dossiê?</DialogTitle>
            <DialogDescription>
              Será gerado um relatório único com todas as seções, avaliações, textos de
              não conformidade, anotações e fotos. Ao confirmar, sincronizamos com o
              servidor e validamos tudo outra vez. Se faltar algum requisito, indicamos a
              seção a corrigir.
            </DialogDescription>
          </DialogHeader>
          {finalizeDialogError ? (
            <p className="text-destructive text-sm" role="alert">
              {finalizeDialogError}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFinalizeDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={finalizeBusy}
              onClick={() => {
                const snap = responsesRef.current;
                const issues = validateChecklistTemplate(sections, snap);
                if (issues.length > 0) {
                  const first = issues[0];
                  const idx = sections.findIndex((sec) =>
                    sec.items.some((it) => it.id === first.item_id),
                  );
                  if (idx >= 0) setSectionIndex(idx);
                  setFinalizeDialogError(
                    buildIssueMessageWithSectionAndItem(sections, first),
                  );
                  return;
                }
                setFinalizeDialogError(null);
                setFinalizeBusy(true);
                void (async () => {
                  const synced = await runReconcileThenSync();
                  setFinalizeBusy(false);
                  if (!synced.ok) {
                    setFinalizeDialogError(synced.error);
                    return;
                  }
                  setDossierPreviewConfirmed(true);
                  setFinalizeDialogOpen(false);
                })();
              }}
            >
              {finalizeBusy ? "Salvando…" : "Confirmar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task B: Dialog de guarda de navegação */}
      <Dialog open={guardTriggered} onOpenChange={(open) => { if (!open) cancelLeave(); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Sair do preenchimento?</DialogTitle>
            <DialogDescription>
              Suas respostas foram salvas automaticamente. Você pode retomar
              este preenchimento quando quiser — basta selecionar o mesmo
              template e estabelecimento no catálogo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={cancelLeave}
            >
              Ficar na página
            </Button>
            <Button
              type="button"
              onClick={confirmLeave}
            >
              Sair — rascunho salvo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de peek do dossiê */}
      <Dialog open={dossierPeekOpen} onOpenChange={setDossierPeekOpen}>
        <DialogContent
          className="flex max-h-[min(88vh,840px)] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
          showCloseButton
        >
          <div className="border-border shrink-0 border-b px-6 py-4 pr-12">
            <DialogHeader className="gap-1">
              <DialogTitle>
                {dossierApprovedAt
                  ? "Dossiê aprovado"
                  : dossierPreviewConfirmed
                    ? "Dossiê (vista expandida)"
                    : "Pré-visualização do dossiê"}
              </DialogTitle>
              <DialogDescription>
                {dossierApprovedAt ? (
                  "Relatório aprovado e imutável."
                ) : dossierPreviewConfirmed ? (
                  <>
                    Leitura do dossiê compilado. Para ajustar textos antes de aprovar, use
                    os campos na área abaixo desta página.
                  </>
                ) : (
                  <>
                    Vista com base no que já foi salvo (rascunho). Itens por preencher
                    aparecem como “Sem avaliação”. Continue nas seções; quando terminar,
                    use{" "}
                    <span className="text-foreground font-medium">
                      Finalizar e ver dossiê
                    </span>{" "}
                    para rever, editar textos e aprovar.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {dossierPeekOpen ? (
              <ChecklistFillDossierPreview
                template={template}
                responses={responses}
                itemPhotos={livePhotos}
                dossierApprovedAt={dossierApprovedAt}
                heading={
                  dossierApprovedAt
                    ? "Relatório aprovado"
                    : dossierPreviewConfirmed
                      ? "Dossiê atual"
                      : "Como está o relatório"
                }
                intro={
                  dossierApprovedAt
                    ? undefined
                    : dossierPreviewConfirmed
                      ? "Seções expansíveis — mesmos dados da visualização na página."
                      : "Seções expansíveis — o conteúdo reflete o rascunho atual; feche o diálogo e continue a preencher se precisar."
                }
                className="border-0 bg-transparent p-3 shadow-none sm:p-4"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={multiAreaNextDialog !== null}
        onOpenChange={(open) => {
          if (!open) setMultiAreaNextDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Próxima área</DialogTitle>
            <DialogDescription className="space-y-3">
              <span className="block">
                Você selecionou várias áreas para este checklist. Deseja iniciar agora o
                preenchimento da próxima?
              </span>
              {multiAreaNextDialog ? (
                <span className="text-foreground block text-sm font-semibold">
                  {multiAreaNextDialog.areaName?.trim() ||
                    (multiAreaNextDialog.areaId
                      ? `Área ${multiAreaNextDialog.areaId.slice(0, 8)}…`
                      : "Próxima área")}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMultiAreaNextDialog(null);
                clearChecklistFillBatch();
              }}
            >
              Preencher depois
            </Button>
            <Button
              type="button"
              onClick={() => {
                const next = multiAreaNextDialog;
                setMultiAreaNextDialog(null);
                if (next) {
                  router.push(`/checklists/preencher/${next.sessionId}`);
                }
              }}
            >
              Iniciar checklist
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
