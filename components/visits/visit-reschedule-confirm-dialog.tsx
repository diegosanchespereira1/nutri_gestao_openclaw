"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button-variants";
import { useAppTimeZone } from "@/components/app-timezone-provider";
import { formatDateTimeShort } from "@/lib/datetime/calendar-tz";
import { localDateTimeInTimeZoneToUtcIso } from "@/lib/datetime/local-datetime-tz";
import { cn } from "@/lib/utils";

/** Converts a UTC ISO string to the "YYYY-MM-DDTHH:mm" format expected by datetime-local inputs. */
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
  open: boolean;
  visitTitle: string;
  oldStart: string;
  newStart: string;
  isLoading: boolean;
  error: string | null;
  onConfirm: (newStartIso: string) => void;
  onCancel: () => void;
};

export function VisitRescheduleConfirmDialog({
  open,
  visitTitle,
  oldStart,
  newStart,
  isLoading,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const tz = useAppTimeZone();

  const [editedLocal, setEditedLocal] = useState(() => toDatetimeLocalValue(newStart, tz));

  // Sync whenever the drag produces a new newStart
  useEffect(() => {
    setEditedLocal(toDatetimeLocalValue(newStart, tz));
  }, [newStart, tz]);

  function handleConfirm() {
    const iso = localDateTimeInTimeZoneToUtcIso(editedLocal, tz);
    if (!iso) return;
    onConfirm(iso);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isLoading) onCancel(); }}>
      <DialogContent className="max-w-sm" showCloseButton>
        <DialogHeader>
          <DialogTitle>Reagendar visita</DialogTitle>
          <DialogDescription>{visitTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-muted-foreground text-[0.65rem] font-medium uppercase tracking-wide">
              Horário atual
            </p>
            <p className="text-foreground text-sm font-medium">
              {formatDateTimeShort(oldStart, tz)}
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="reschedule-new-start"
              className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Novo horário
            </label>
            <input
              id="reschedule-new-start"
              type="datetime-local"
              value={editedLocal}
              onChange={(e) => setEditedLocal(e.target.value)}
              disabled={isLoading}
              className={cn(
                "border-input bg-background text-foreground focus-visible:ring-ring h-9 w-full rounded-md border px-2.5 text-sm font-semibold shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                isLoading && "opacity-50",
              )}
            />
            <p className="text-muted-foreground text-xs">
              Horário no fuso de Definições → Região.
            </p>
          </div>
        </div>

        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : null}

        <div className="flex gap-2 border-t pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "min-h-11 flex-1 justify-center",
            )}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || !editedLocal}
            className={cn(buttonVariants(), "min-h-11 flex-1 justify-center")}
          >
            {isLoading ? "Salvando…" : "Confirmar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
