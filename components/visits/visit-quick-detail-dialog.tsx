"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button-variants";
import { visitKindLabel } from "@/lib/constants/visit-kinds";
import { teamJobRoleLabel } from "@/lib/constants/team-roles";
import { visitPriorityLabel } from "@/lib/constants/visit-priorities";
import { VisitCancelButton } from "@/components/visits/visit-cancel-button";
import { visitStatusLabel } from "@/lib/constants/visit-status";
import { useAppTimeZone } from "@/components/app-timezone-provider";
import { formatDateTimeShort } from "@/lib/datetime/calendar-tz";
import { localDateTimeInTimeZoneToUtcIso } from "@/lib/datetime/local-datetime-tz";
import { rescheduleVisitAction } from "@/lib/actions/visits";
import type { ScheduledVisitWithTargets, VisitKind } from "@/lib/types/visits";
import { visitDisplayTitle, visitProfessionalLabel, visitTargetName } from "@/lib/visits/display-title";
import { cn } from "@/lib/utils";

function toDatetimeLocalValue(isoUtc: string, tz: string): string {
  const date = new Date(isoUtc);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

type Props = {
  visit: ScheduledVisitWithTargets | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canStartVisit: (v: ScheduledVisitWithTargets) => boolean;
  canCancelVisit?: (v: ScheduledVisitWithTargets) => boolean;
};

function assigneeLabel(visit: ScheduledVisitWithTargets): string {
  return visitProfessionalLabel(visit, visit.creator_full_name);
}

export function VisitQuickDetailDialog({
  visit,
  open,
  onOpenChange,
  canStartVisit,
  canCancelVisit,
}: Props) {
  const tz = useAppTimeZone();
  const router = useRouter();

  const [editedLocal, setEditedLocal] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync input when the visit or timezone changes
  useEffect(() => {
    if (visit) setEditedLocal(toDatetimeLocalValue(visit.scheduled_start, tz));
  }, [visit?.id, visit?.scheduled_start, tz]);

  // Clear error when dialog closes
  useEffect(() => {
    if (!open) setSaveError(null);
  }, [open]);

  const originalLocal = visit ? toDatetimeLocalValue(visit.scheduled_start, tz) : "";
  const hasChanged = !!visit && editedLocal !== originalLocal;

  async function handleSaveTime() {
    if (!visit) return;
    const iso = localDateTimeInTimeZoneToUtcIso(editedLocal, tz);
    if (!iso) return;
    setIsSaving(true);
    setSaveError(null);
    const result = await rescheduleVisitAction(visit.id, iso);
    setIsSaving(false);
    if (result.ok) {
      router.refresh();
      onOpenChange(false);
    } else {
      setSaveError(result.error);
    }
  }

  if (!open) return null;

  if (!visit) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Detalhe da visita</DialogTitle>
            <DialogDescription>Selecione um compromisso na agenda.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const title = visitTargetName(visit) ?? visitDisplayTitle(visit);
  const assignee = assigneeLabel(visit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {visitPriorityLabel[visit.priority]} · {visitStatusLabel[visit.status]}
          </DialogDescription>
        </DialogHeader>

        <dl className="text-muted-foreground space-y-3 text-sm">
          {/* Data e hora — editável */}
          <div className="flex gap-2">
            <dt className="text-foreground/80 w-28 shrink-0 font-medium">
              Data e hora
            </dt>
            <dd className="min-w-0 flex-1">
              <input
                type="datetime-local"
                value={editedLocal}
                onChange={(e) => setEditedLocal(e.target.value)}
                disabled={isSaving}
                className={cn(
                  "border-input bg-background text-foreground focus-visible:ring-ring h-8 w-full rounded-md border px-2 text-xs shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  isSaving && "opacity-50",
                )}
              />
              {hasChanged && (
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleSaveTime}
                    disabled={isSaving}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "h-7 px-2.5 text-xs",
                    )}
                  >
                    {isSaving ? "A guardar…" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditedLocal(originalLocal)}
                    disabled={isSaving}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "h-7 px-2.5 text-xs",
                    )}
                  >
                    Reverter
                  </button>
                </div>
              )}
              {saveError && (
                <p className="text-destructive mt-1 text-xs">{saveError}</p>
              )}
            </dd>
          </div>

          <div className="flex gap-2">
            <dt className="text-foreground/80 w-28 shrink-0 font-medium">
              Tipo de visita
            </dt>
            <dd>
              {visitKindLabel[(visit.visit_kind ?? "other") as VisitKind]}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-foreground/80 w-28 shrink-0 font-medium">
              Profissional
            </dt>
            <dd>{assignee}</dd>
          </div>
        </dl>

        {visit.notes ? (
          <p className="text-muted-foreground border-t pt-3 text-sm">
            <span className="text-foreground font-medium">Notas: </span>
            {visit.notes}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 border-t pt-2 sm:flex-row sm:flex-wrap">
          <Link
            href={`/visitas/${visit.id}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "min-h-11 flex-1 justify-center",
            )}
            onClick={() => onOpenChange(false)}
          >
            Ficha completa
          </Link>
          {canStartVisit(visit) ? (
            <Link
              href={`/visitas/${visit.id}/iniciar`}
              className={cn(buttonVariants(), "min-h-11 flex-1 justify-center")}
              onClick={() => onOpenChange(false)}
            >
              {visit.status === "in_progress"
                ? "Continuar visita"
                : "Iniciar visita"}
            </Link>
          ) : null}
          {canCancelVisit?.(visit) ? (
            <VisitCancelButton
              visitId={visit.id}
              visitTitle={title}
              size="sm"
              variant="destructive"
              className="min-h-11 flex-1"
              onCancelled={() => onOpenChange(false)}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
