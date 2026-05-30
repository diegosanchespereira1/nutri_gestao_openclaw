"use client";

import { ArrowRight } from "lucide-react";

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
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  visitTitle: string;
  oldStart: string;
  newStart: string;
  isLoading: boolean;
  error: string | null;
  onConfirm: () => void;
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isLoading) onCancel(); }}>
      <DialogContent className="max-w-sm" showCloseButton>
        <DialogHeader>
          <DialogTitle>Confirmar reagendamento</DialogTitle>
          <DialogDescription>{visitTitle}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <div className="min-w-0 flex-1 text-center">
            <p className="text-muted-foreground mb-0.5 text-[0.65rem] font-medium uppercase tracking-wide">
              Horário atual
            </p>
            <p className="text-foreground font-medium">
              {formatDateTimeShort(oldStart, tz)}
            </p>
          </div>
          <ArrowRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1 text-center">
            <p className="text-muted-foreground mb-0.5 text-[0.65rem] font-medium uppercase tracking-wide">
              Novo horário
            </p>
            <p className="text-foreground font-semibold">
              {formatDateTimeShort(newStart, tz)}
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
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(buttonVariants(), "min-h-11 flex-1 justify-center")}
          >
            {isLoading ? "A guardar…" : "Confirmar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
