"use client";

import { Eye, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { pushWithLoading, signalNavigationCancel } from "@/lib/navigation-pending";
import { toast } from "sonner";

import { ChecklistFillDossierPdfCard } from "@/components/checklists/checklist-fill-dossier-pdf-card";
import { ChecklistFillDossierPreview } from "@/components/checklists/checklist-fill-dossier-preview";
import { ChecklistReopenDialog } from "@/components/checklists/checklist-reopen-dialog";
import { ChecklistItemPhotos } from "@/components/checklists/checklist-item-photos";
import {
  SignatureCaptureDialog,
  type SignaturePair,
} from "@/components/checklists/signature-capture-dialog";
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
  saveFillResponsesBatch,
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
import { isStructureOnlyItem } from "@/lib/checklists/is-structure-only-item";
import {
  hasResponseChanged,
  pickBatchItemIdsForSave,
} from "@/lib/checklists/save-batch";
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
      if (isStructureOnlyItem(item)) continue;
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
/** Reagendar save em lote quando já há um em curso (evita corridas). */
const SAVE_BATCH_RESCHEDULE_MS = 500;

/* ── Visualização de assinaturas após aprovação ─────────────────────── */
/** Cabeçalho de subseção (sem avaliação nem fotos). */
function ChecklistFillStructureHeading({ description }: { description: string }) {
  return (
    <div
      role="presentation"
      className="border-border/60 text-foreground border-b pb-2 pt-5 first:pt-0"
    >
      <h3 className="text-sm font-bold tracking-tight">{description}</h3>
    </div>
  );
}

/* ─── ChecklistFillItem — componente memoizado por item ─────────────────── */
/**
 * Extração do item de checklist em componente separado com React.memo.
 * Com isso, ao alterar um item (ex: marcar "Conforme"), apenas ESSE item
 * re-renderiza — os demais ficam em cache, eliminando o re-render em cascata
 * de toda a seção a cada interação.
 */
type ChecklistFillItemProps = {
  item: { id: string; description: string; is_required: boolean; is_structure_only?: boolean };
  response: import("@/lib/types/checklist-fill").FillItemResponseState | undefined;
  err: string | undefined;
  recurringNcSessions: number;
  sessionId: string;
  itemResponseSource: "global" | "custom" | "workspace";
  photos: ChecklistFillPhotoView[];
  formLocked: boolean;
  onSetOutcome: (itemId: string, outcome: import("@/lib/types/checklist-fill").ChecklistFillOutcome | null) => void;
  onSetNote: (itemId: string, note: string) => void;
  onSetValidUntil: (itemId: string, validUntil: string) => void;
  onSetAnnotation: (itemId: string, annotation: string) => void;
  onPhotosChange: (itemId: string, photos: ChecklistFillPhotoView[]) => void;
};

const ChecklistFillItem = memo(function ChecklistFillItem({
  item,
  response: r,
  err,
  recurringNcSessions,
  sessionId,
  itemResponseSource,
  photos,
  formLocked,
  onSetOutcome,
  onSetNote,
  onSetValidUntil,
  onSetAnnotation,
  onPhotosChange,
}: ChecklistFillItemProps) {
  if (isStructureOnlyItem(item)) {
    return <ChecklistFillStructureHeading description={item.description} />;
  }

  const requiredInvalid = item.is_required && Boolean(err);
  const showRecurringNc = recurringNcSessions > 0;
  const empty = r ?? { outcome: null, note: null, annotation: null, validUntil: null };

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
          <span className="text-foreground font-medium">{recurringNcSessions}</span>{" "}
          {recurringNcSessions === 1 ? "visita anterior" : "visitas anteriores"}{" "}
          neste estabelecimento.
        </p>
      ) : null}

      <div
        className="mt-3 space-y-2"
        role="radiogroup"
        aria-label={item.description}
        aria-invalid={requiredInvalid && empty.outcome === null ? true : undefined}
      >
        <Label
          className={cn(
            "text-xs",
            requiredInvalid && empty.outcome === null
              ? "text-destructive font-medium"
              : "text-muted-foreground",
          )}
        >
          Avaliação
          {item.is_required ? <span className="sr-only"> (obrigatório)</span> : null}
        </Label>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ["conforme", "Conforme"],
              ["nc", "Não conforme"],
              ["na", "Não aplicável"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={`outcome-${item.id}`}
                value={value}
                checked={empty.outcome === value}
                onChange={() => onSetOutcome(item.id, value)}
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
        initialPhotos={photos}
        disabled={formLocked}
        onPhotosChange={(p) => onPhotosChange(item.id, p)}
      />

      {empty.outcome === "nc" ? (
        <div className="mt-3">
          <Label htmlFor={`note-${item.id}`}>Descrição da não conformidade</Label>
          <textarea
            id={`note-${item.id}`}
            rows={3}
            value={empty.note ?? ""}
            onChange={(e) => onSetNote(item.id, e.target.value)}
            className={textareaClass}
            aria-invalid={Boolean(err)}
            aria-describedby={err ? `err-${item.id}` : undefined}
          />
        </div>
      ) : null}

      {empty.outcome !== null ? (
        <div className="mt-3">
          <Label htmlFor={`valid-until-${item.id}`}>
            Válido até{" "}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              id={`valid-until-${item.id}`}
              type="date"
              value={empty.validUntil ?? ""}
              onChange={(e) => onSetValidUntil(item.id, e.target.value)}
              disabled={formLocked}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 min-w-[10rem] flex-1 rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            {(empty.validUntil ?? "").trim() ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1"
                disabled={formLocked}
                onClick={() => {
                  onSetValidUntil(item.id, "");
                }}
              >
                <X className="size-4" aria-hidden />
                Limpar data
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {empty.outcome !== null ? (
        <div className="mt-3">
          <Label htmlFor={`annotation-${item.id}`}>
            Anotação{" "}
            <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <textarea
            id={`annotation-${item.id}`}
            rows={3}
            maxLength={MAX_CHECKLIST_ITEM_ANNOTATION_CHARS}
            value={empty.annotation ?? ""}
            onChange={(e) => onSetAnnotation(item.id, e.target.value)}
            className={textareaClass}
            aria-describedby={`annotation-hint-${item.id}`}
          />
          <p id={`annotation-hint-${item.id}`} className="text-muted-foreground mt-1 text-xs">
            {(empty.annotation ?? "").length}/{MAX_CHECKLIST_ITEM_ANNOTATION_CHARS} caracteres
          </p>
        </div>
      ) : null}

      {err ? (
        <p id={`err-${item.id}`} className="text-destructive mt-2 text-sm" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
});

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
  /** Nome limpo do cliente/estabelecimento (para exibir no dialog de assinatura). */
  clientLabel?: string;
  /** Nome da profissional (para exibir no dialog de assinatura). */
  professionalName?: string;
  /** CRN da profissional (para exibir no dialog de assinatura). */
  professionalCrn?: string;
  /** Assinaturas salvas (para exibir após aprovação). */
  initialProfessionalSignatureDataUrl?: string | null;
  initialClientSignatureDataUrl?: string | null;
  initialClientSignerName?: string | null;
  initialDocumentHash?: string | null;
  /** Quando false, a assinatura do cliente não é exigida na aprovação. */
  clientSignatureRequired?: boolean;
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
  clientLabel,
  professionalName,
  professionalCrn,
  initialProfessionalSignatureDataUrl = null,
  initialClientSignatureDataUrl = null,
  initialClientSignerName = null,
  initialDocumentHash = null,
  clientSignatureRequired = true,
}: Props) {
  const router = useRouter();
  const sections = template.sections;
  const [sectionIndex, setSectionIndex] = useState(() =>
    initialDossierApprovedAt
      ? Math.max(0, template.sections.length - 1)
      : 0,
  );
  const [sectionNavLoading, setSectionNavLoading] = useState(false);
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
    const doneTimer = setTimeout(() => setSectionNavLoading(false), 180);
    return () => clearTimeout(doneTimer);
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

  /* ── Assinaturas ── */
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [pendingSignatures, setPendingSignatures] = useState<SignaturePair | null>(null);
  // Assinaturas persistidas — inicializadas com os dados vindos do servidor
  const [savedProfessionalSig, setSavedProfessionalSig] = useState<string | null>(
    initialProfessionalSignatureDataUrl ?? null,
  );
  const [savedClientSig, setSavedClientSig] = useState<string | null>(
    initialClientSignatureDataUrl ?? null,
  );
  const [savedClientSignerName, setSavedClientSignerName] = useState<string | null>(
    initialClientSignerName ?? null,
  );
  const [savedDocumentHash, setSavedDocumentHash] = useState<string | null>(
    initialDocumentHash ?? null,
  );

  useEffect(() => {
    setSavedDocumentHash(initialDocumentHash ?? null);
  }, [initialDocumentHash]);

  useEffect(() => {
    setSavedProfessionalSig(initialProfessionalSignatureDataUrl ?? null);
    setSavedClientSig(initialClientSignatureDataUrl ?? null);
    setSavedClientSignerName(initialClientSignerName ?? null);
  }, [
    initialProfessionalSignatureDataUrl,
    initialClientSignatureDataUrl,
    initialClientSignerName,
  ]);

  const handleDossierReopened = useCallback(() => {
    setDossierApprovedAt(null);
    setDossierPreviewConfirmed(false);
    setSectionIndex(0);
  }, []);

  /* ── Task D: indicador de auto-save ── */
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyItemIdsRef = useRef<Set<string>>(new Set());
  const saveBatchInFlightRef = useRef(false);
  /** Ref para o próprio saveProgressBatch — permite reagendar saves concorrentes sem dependência circular. */
  const saveProgressBatchRef = useRef<(scope: "section" | "all", forceAll: boolean) => void>(
    () => {},
  );

  /** Reagenda um ciclo de save (itens continuam dirty) em vez de o descartar. */
  const rescheduleSave = useCallback((scope: "section" | "all", forceAll: boolean, delayMs: number) => {
    if (autosaveTimerRef.current !== null) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      saveProgressBatchRef.current(scope, forceAll);
    }, delayMs);
  }, []);

  function reportSaving() {
    if (savedTimerRef.current !== null) clearTimeout(savedTimerRef.current);
    setSaveStatus("saving");
    setSaveErrorMsg(null);
  }
  function reportSaved() {
    if (savedTimerRef.current !== null) clearTimeout(savedTimerRef.current);
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
      if (autosaveTimerRef.current !== null) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  const markItemDirty = useCallback((itemId: string) => {
    dirtyItemIdsRef.current.add(itemId);
  }, []);

  const clearDirtyItems = useCallback((itemIds: string[]) => {
    for (const itemId of itemIds) {
      dirtyItemIdsRef.current.delete(itemId);
    }
  }, []);

  const formLocked = dossierPreviewConfirmed || Boolean(dossierApprovedAt);

  const [leaveLinkTarget, setLeaveLinkTarget] = useState<string | null>(null);
  const leaveLinkTargetRef = useRef<string | null>(null);
  const leavePromptOpenRef = useRef(false);
  const [leaveActionBusy, setLeaveActionBusy] = useState(false);
  const [leaveActionError, setLeaveActionError] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  /* ── Task B: guarda de navegação (Voltar do browser + links internos) ── */
  const { guardTriggered, cancelLeave, completeBrowserBack } = useNavigationGuard({
    active: !formLocked,
    fallbackHref: backHref,
  });

  const leaveDialogOpen = guardTriggered || leaveLinkTarget !== null;
  useEffect(() => {
    leavePromptOpenRef.current = leaveDialogOpen;
  }, [leaveDialogOpen]);

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
      const entries = Object.entries(data).map(([itemId, cur]) => ({
        itemId,
        outcome: cur?.outcome ?? null,
        note: cur?.note ?? null,
        annotation: cur?.annotation ?? null,
        validUntil: cur?.validUntil ?? null,
      }));
      return saveFillResponsesBatch({
        sessionId,
        itemResponseSource,
        entries,
        persistMode,
        withRevalidate: false,
      });
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

  /** Grava rascunho completo no servidor sem exigir validação do template (saída segura). */
  const persistDraftForLeave = useCallback(async (): Promise<FillActionResult> => {
    const remote = await loadFillResponsesMapForSession(sessionId);
    if (!remote.ok) return remote;
    const merged = mergeClientResponsesWithServer(
      responsesRef.current,
      remote.responses,
      template,
    );
    setResponses(merged);
    responsesRef.current = merged;
    return syncAllResponsesToServer(merged, "merge");
  }, [sessionId, template, syncAllResponsesToServer]);

  const clearLeaveLinkTarget = useCallback(() => {
    leaveLinkTargetRef.current = null;
    setLeaveLinkTarget(null);
    leavePromptOpenRef.current = false;
  }, []);

  const handleCancelLeaveDialog = useCallback(() => {
    cancelLeave();
    clearLeaveLinkTarget();
    setLeaveActionError(null);
    // Cliques em links internos disparam `beginNavigation` no AppMainContent antes de
    // sabermos se o utilizador confirma ou cancela a saída. Se cancelar, fechamos o overlay.
    signalNavigationCancel();
  }, [cancelLeave, clearLeaveLinkTarget]);

  const handleConfirmLeaveDialog = useCallback(async () => {
    setLeaveActionBusy(true);
    setLeaveActionError(null);
    try {
      const result = await persistDraftForLeave();
      if (!result.ok) {
        setLeaveActionError(result.error);
        return;
      }
      const dest = leaveLinkTargetRef.current;
      clearLeaveLinkTarget();
      cancelLeave();
      if (dest) {
        pushWithLoading(router, dest);
      } else {
        completeBrowserBack();
      }
    } finally {
      setLeaveActionBusy(false);
    }
  }, [persistDraftForLeave, clearLeaveLinkTarget, cancelLeave, completeBrowserBack, router]);

  const handleDiscardAndLeave = useCallback(() => {
    const dest = leaveLinkTargetRef.current;
    setDiscardConfirmOpen(false);
    clearLeaveLinkTarget();
    cancelLeave();
    if (dest) {
      router.push(dest);
    } else {
      completeBrowserBack();
    }
  }, [clearLeaveLinkTarget, cancelLeave, completeBrowserBack, router]);

  /** Bloqueia navegação interna (sidebar, etc.) até confirmar gravação do rascunho. */
  useEffect(() => {
    if (formLocked) return;

    function handleClickCapture(e: MouseEvent) {
      if (leavePromptOpenRef.current) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const el = (e.target as Element | null)?.closest?.("a[href]");
      if (!el || !(el instanceof HTMLAnchorElement)) return;
      if (el.hasAttribute("download")) return;

      const hrefAttr = el.getAttribute("href");
      if (
        !hrefAttr ||
        hrefAttr.startsWith("#") ||
        hrefAttr.startsWith("mailto:") ||
        hrefAttr.startsWith("tel:")
      ) {
        return;
      }

      let url: URL;
      try {
        url = new URL(hrefAttr, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const currentPath = window.location.pathname;
      if (!currentPath.startsWith("/checklists/preencher/")) return;

      const here = `${window.location.pathname}${window.location.search}`;
      const there = `${url.pathname}${url.search}`;
      if (there === here) return;

      e.preventDefault();
      e.stopPropagation();
      const dest = `${url.pathname}${url.search}${url.hash}`;
      leavePromptOpenRef.current = true;
      leaveLinkTargetRef.current = dest;
      setLeaveLinkTarget(dest);
    }

    document.addEventListener("click", handleClickCapture, true);
    return () => document.removeEventListener("click", handleClickCapture, true);
  }, [formLocked]);

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
        if (isStructureOnlyItem(item)) continue;
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
        if (isStructureOnlyItem(item)) continue;
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

  const saveProgressBatch = useCallback(
    (scope: "section" | "all", forceAll: boolean) => {
      if (!section) return;
      if (saveBatchInFlightRef.current) {
        // Save em curso — reagenda em vez de descartar (itens continuam dirty).
        rescheduleSave(scope, forceAll, SAVE_BATCH_RESCHEDULE_MS);
        return;
      }

      const itemIds = pickBatchItemIdsForSave({
        scope,
        sectionItemIds: section.items.map((item) => item.id),
        responses: responsesRef.current,
        dirtyItemIds: dirtyItemIdsRef.current,
        forceAll,
      });
      if (itemIds.length === 0) return;

      saveBatchInFlightRef.current = true;
      startTransition(async () => {
        reportSaving();
        const entries = itemIds.map((itemId) => {
          const cur = responsesRef.current[itemId];
          return {
            itemId,
            outcome: cur?.outcome ?? null,
            note: cur?.note ?? null,
            annotation: cur?.annotation ?? null,
            validUntil: cur?.validUntil ?? null,
          };
        });
        try {
          const result = await saveFillResponsesBatch({
            sessionId,
            itemResponseSource,
            entries,
            persistMode: "full",
            withRevalidate: false,
          });
          if (!result.ok) {
            reportSaveError(result.error);
            return;
          }
          clearDirtyItems(itemIds);
          reportSaved();
        } catch (err) {
          // Falha de rede / deploy a meio do save: não deixar a flag in-flight presa.
          console.error("[saveProgressBatch] falha de conexão", err);
          reportSaveError("Falha de conexão ao salvar. Tentando novamente…");
          rescheduleSave(scope, forceAll, 4000);
        } finally {
          saveBatchInFlightRef.current = false;
        }
      });
    },
    [clearDirtyItems, itemResponseSource, section, sessionId, rescheduleSave],
  );

  // Mantém a ref sincronizada para reagendamentos (sem dependência circular).
  useEffect(() => {
    saveProgressBatchRef.current = saveProgressBatch;
  }, [saveProgressBatch]);

  // ── Handlers memoizados — estáveis entre renders para que React.memo
  //    no ChecklistFillItem funcione corretamente e só re-renderize o item
  //    cujo estado mudou, não todos os itens da seção.
  const setOutcome = useCallback(
    (itemId: string, outcome: ChecklistFillOutcome | null) => {
      // Usa responsesRef para leitura síncrona sem capturar `responses` em closure
      const cur = responsesRef.current[itemId] ?? emptyItemState();
      const note = outcome === "nc" ? cur.note : null;
      const annotation = cur.annotation ?? null;
      const validUntil = cur.validUntil ?? null;
      if (hasResponseChanged(cur.outcome, outcome)) {
        markItemDirty(itemId);
      }
      setResponses((prev) => ({
        ...prev,
        [itemId]: { outcome, note, annotation, validUntil },
      }));
    },
    [markItemDirty],
  );

  const setNote = useCallback((itemId: string, note: string) => {
    setResponses((prev) => {
      const cur = prev[itemId] ?? emptyItemState();
      if (hasResponseChanged(cur.note ?? "", note)) {
        markItemDirty(itemId);
      }
      return { ...prev, [itemId]: { ...cur, note } };
    });
  }, [markItemDirty]);

  const setAnnotation = useCallback((itemId: string, annotation: string) => {
    setResponses((prev) => {
      const cur = prev[itemId] ?? emptyItemState();
      if (hasResponseChanged(cur.annotation ?? "", annotation)) {
        markItemDirty(itemId);
      }
      return { ...prev, [itemId]: { ...cur, annotation } };
    });
  }, [markItemDirty]);

  const setValidUntil = useCallback((itemId: string, raw: string) => {
    const normalized = raw.trim() === "" ? null : raw;
    setResponses((prev) => {
      const cur = prev[itemId] ?? emptyItemState();
      const prevStr = cur.validUntil ?? "";
      const nextStr = normalized ?? "";
      if (hasResponseChanged(prevStr, nextStr)) {
        markItemDirty(itemId);
      }
      return { ...prev, [itemId]: { ...cur, validUntil: normalized } };
    });
  }, [markItemDirty]);

  function handleNext() {
    setAdvanceError(null);
    if (!section || isLast) return;
    setSectionNavLoading(true);
    setSectionIndex((i) => i + 1);
  }

  function handlePrev() {
    setAdvanceError(null);
    setSectionNavLoading(true);
    setSectionIndex((i) => Math.max(0, i - 1));
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
          professionalSignatureDataUrl={savedProfessionalSig}
          clientSignatureDataUrl={savedClientSig}
          clientSignerName={savedClientSignerName}
          professionalName={professionalName}
          professionalCrn={professionalCrn}
          clientLabel={clientLabel}
          documentHash={savedDocumentHash}
          reopenEvents={initialReopenEvents}
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
          professionalSignatureDataUrl={savedProfessionalSig}
          clientSignatureDataUrl={savedClientSig}
          clientSignerName={savedClientSignerName}
          professionalName={professionalName}
          professionalCrn={professionalCrn}
          clientLabel={clientLabel}
          documentHash={savedDocumentHash}
          reopenEvents={initialReopenEvents}
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
          <div className="mt-2 border-l-2 border-primary pl-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Seção {sectionIndex + 1} de {sections.length}
            </p>
            <p className="text-[15px] font-bold text-foreground leading-snug uppercase">
              {section.title}
            </p>
          </div>
          {sectionNavLoading ? (
            <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground" role="status" aria-live="polite">
              <svg className="size-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Carregando seção...
            </span>
          ) : null}
          {/* Indicador de gravação explícita (Salvar agora / finalizar) */}
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
        disabled={formLocked}
        className="relative space-y-6"
        aria-busy={isPending}
      >
        {sectionNavLoading ? (
          <div className="absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-background/65 pt-6 backdrop-blur-[1px]">
            <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
              <svg className="size-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Atualizando seção...
            </div>
          </div>
        ) : null}
        <legend className="sr-only">{section.title}</legend>
        {section.items.map((item) =>
          isStructureOnlyItem(item) ? (
            <ChecklistFillStructureHeading key={item.id} description={item.description} />
          ) : (
          <ChecklistFillItem
            key={item.id}
            item={item}
            response={responses[item.id]}
            err={issueByItemId[item.id]}
            recurringNcSessions={recurringNcSessionCountByItemId[item.id] ?? 0}
            sessionId={sessionId}
            itemResponseSource={itemResponseSource}
            photos={livePhotos[item.id] ?? EMPTY_ITEM_PHOTOS}
            formLocked={formLocked}
            onSetOutcome={setOutcome}
            onSetNote={setNote}
            onSetValidUntil={setValidUntil}
            onSetAnnotation={setAnnotation}
            onPhotosChange={handlePhotosChange}
          />
          ))}
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
                disabled={sectionNavLoading}
                onChange={(e) => {
                  setAdvanceError(null);
                  const next = Number.parseInt(e.target.value, 10);
                  if (!Number.isFinite(next)) return;
                  setSectionNavLoading(true);
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
          {!formLocked ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => saveProgressBatch("all", true)}
              disabled={formLocked || sectionNavLoading}
            >
              {isPending ? "Salvando..." : "Salvar agora"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={sectionIndex === 0 || formLocked || sectionNavLoading}
          >
            {sectionNavLoading ? "Carregando..." : "Seção anterior"}
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={formLocked || isLast || sectionNavLoading}
          >
            {sectionNavLoading ? "Carregando..." : "Próxima seção"}
          </Button>
          {!formLocked ? (
            <Button
              type="button"
              variant={isLast ? "default" : "secondary"}
              disabled={formLocked || sectionNavLoading}
              onClick={() => {
                setAdvanceError(null);
                setFinalizeDialogError(null);
                setFinalizeBusy(false);
                setFinalizeDialogOpen(true);
              }}
            >
              Finalizar e ver dossiê
            </Button>
          ) : null}
        </div>
        {!formLocked ? (
          <p className="text-muted-foreground max-w-xl text-xs">
            As respostas só são gravadas no servidor ao usar{" "}
            <span className="text-foreground font-medium">Salvar agora</span>, ao
            confirmar{" "}
            <span className="text-foreground font-medium">Finalizar e ver dossiê</span>, ao
            aprovar o dossiê ou ao sair da página escolhendo gravar o rascunho.
          </p>
        ) : null}
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
                  : "Dossiê compilado abaixo. Ajuste textos se necessário; ao aprovar, as alterações são gravadas no servidor e o ciclo fecha."}
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
                  professionalSignatureDataUrl={savedProfessionalSig}
                  clientSignatureDataUrl={savedClientSig}
                  clientSignerName={savedClientSignerName}
                  professionalName={professionalName}
                  professionalCrn={professionalCrn}
                  clientLabel={clientLabel}
                  documentHash={savedDocumentHash}
                  reopenEvents={initialReopenEvents}
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
                        // Abre o dialog de assinatura antes de aprovar
                        setSignatureDialogOpen(true);
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
          if (!open) {
            setFinalizeDialogError(null);
            setFinalizeBusy(false);
          }
        }}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Finalizar e compilar dossiê?</DialogTitle>
            <DialogDescription>
              Será gerado um relatório único com todas as seções, avaliações, textos de
              não conformidade, anotações e fotos. Ao confirmar, sincronizamos com o
              servidor tudo o que ainda não foi gravado e validamos outra vez. Se faltar
              algum requisito, indicamos a seção a corrigir.
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
                  try {
                    const synced = await runReconcileThenSync();
                    if (!synced.ok) {
                      setFinalizeDialogError(synced.error);
                      return;
                    }
                    setDossierPreviewConfirmed(true);
                    setFinalizeDialogOpen(false);
                  } catch (err) {
                    console.error("[checklist-fill-wizard] finalizar dossiê", err);
                    setFinalizeDialogError(
                      err instanceof Error
                        ? err.message
                        : "Erro inesperado ao sincronizar. Tente de novo ou recarregue a página.",
                    );
                  } finally {
                    setFinalizeBusy(false);
                  }
                })();
              }}
            >
              {finalizeBusy ? "Salvando…" : "Confirmar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task B: Dialog de guarda de navegação (Voltar do browser ou link interno) */}
      <Dialog
        open={leaveDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCancelLeaveDialog();
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Sair do checklist?</DialogTitle>
            <DialogDescription>
              Se sair agora, pode perder alterações que ainda não foram sincronizadas com o
              servidor. Ao confirmar, gravamos todo o rascunho (respostas e textos já
              introduzidos) e só depois mudamos de página.
            </DialogDescription>
          </DialogHeader>
          {leaveActionError ? (
            <p className="text-destructive text-sm" role="alert">
              {leaveActionError}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
              disabled={leaveActionBusy}
              onClick={() => setDiscardConfirmOpen(true)}
            >
              Descartar alterações
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={leaveActionBusy}
              onClick={handleCancelLeaveDialog}
            >
              Não, ficar
            </Button>
            <Button
              type="button"
              disabled={leaveActionBusy}
              onClick={() => void handleConfirmLeaveDialog()}
            >
              {leaveActionBusy ? "A gravar…" : "Sim, gravar e sair"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de descarte — irreversível */}
      <Dialog open={discardConfirmOpen} onOpenChange={(open) => { if (!open) setDiscardConfirmOpen(false); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Descartar alterações?</DialogTitle>
            <DialogDescription>
              Todas as respostas e textos ainda não sincronizados serão perdidos permanentemente.
              Esta ação é irreversível e não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDiscardConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDiscardAndLeave}
            >
              Sim, descartar e sair
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
                    Pré-visualização com o rascunho atual nesta página (inclui alterações
                    ainda não gravadas com o botão Salvar agora). Para rever, editar textos
                    e aprovar, use{" "}
                    <span className="text-foreground font-medium">
                      Finalizar e ver dossiê
                    </span>
                    .
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
                void (async () => {
                  const next = multiAreaNextDialog;
                  if (!next) return;
                  const r = await persistDraftForLeave();
                  if (!r.ok) {
                    toast.error(r.error);
                    return;
                  }
                  setMultiAreaNextDialog(null);
                  pushWithLoading(router, `/checklists/preencher/${next.sessionId}`);
                })();
              }}
            >
              Iniciar checklist
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de captura de assinaturas — exibido antes de aprovar o dossiê */}
      <SignatureCaptureDialog
        open={signatureDialogOpen}
        onOpenChange={(open) => {
          setSignatureDialogOpen(open);
          if (!open) setPendingSignatures(null);
        }}
        professionalName={professionalName}
        professionalCrn={professionalCrn}
        clientLabel={clientLabel}
        clientSignatureRequired={clientSignatureRequired}
        onConfirm={(signatures) => {
          setPendingSignatures(signatures);
          setSignatureDialogOpen(false);
          setApproveError(null);
          startApproveTransition(async () => {
            try {
              const synced = await runReconcileThenSync();
              if (!synced.ok) {
                setApproveError(synced.error);
                setPendingSignatures(null);
                return;
              }
              const r = await approveChecklistFillDossierAction(
                sessionId,
                signatures,
              );
              if (!r.ok) {
                setApproveError(r.error);
                setPendingSignatures(null);
                return;
              }
              // Persiste assinaturas e hash localmente para exibição imediata
              setSavedProfessionalSig(signatures.professional);
              setSavedClientSig(signatures.client || null);
              setSavedClientSignerName(signatures.clientSignerName || null);
              setSavedDocumentHash(r.documentHash ?? null);
              setPendingSignatures(null);
              setDossierApprovedAt(r.approvedAt);
              const nextInBatch = getNextBatchItemAfterSession(sessionId);
              if (nextInBatch) {
                setMultiAreaNextDialog(nextInBatch);
              } else {
                clearChecklistFillBatch();
              }
              router.refresh();
            } catch (err) {
              console.error("[checklist-fill-wizard] aprovar dossiê", err);
              setApproveError(
                err instanceof Error
                  ? err.message
                  : "Erro inesperado ao aprovar. Tente de novo ou recarregue a página.",
              );
              setPendingSignatures(null);
            }
          });
        }}
      />
    </div>
  );
}
