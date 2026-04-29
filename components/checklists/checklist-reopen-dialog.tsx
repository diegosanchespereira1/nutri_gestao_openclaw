"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reopenChecklistFillDossierAction } from "@/lib/actions/checklist-fill-reopen";

const MIN_JUSTIFICATION = 10;

type Props = {
  sessionId: string;
  canReopen: boolean;
  /** Chamado após reabertura bem-sucedida (atualizar estado local antes do refresh). */
  onReopened?: () => void;
  /** Variante visual do gatilho (lista de histórico vs. página de preenchimento). */
  triggerVariant?: "outline" | "ghost";
  triggerSize?: "sm" | "default";
};

export function ChecklistReopenDialog({
  sessionId,
  canReopen,
  onReopened,
  triggerVariant = "outline",
  triggerSize = "sm",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [justification, setJustification] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canReopen) return null;

  const trimmedLen = justification.trim().length;
  const canSubmit = trimmedLen >= MIN_JUSTIFICATION && !pending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setJustification("");
      setError(null);
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await reopenChecklistFillDossierAction(sessionId, justification);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success("Checklist reaberto. Pode corrigir e voltar a aprovar o dossiê.");
      onReopened?.();
      setOpen(false);
      setJustification("");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        className="gap-1.5 text-destructive hover:text-destructive"
        onClick={() => handleOpenChange(true)}
      >
        <RotateCcw className="size-4 shrink-0" aria-hidden />
        Reabrir checklist
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reabrir checklist finalizado?</DialogTitle>
          <DialogDescription>
            O score deste checklist será removido até nova aprovação. Os PDFs já gerados ficam
            marcados como obsoletos. A justificativa fica registada para auditoria.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reopen-justification">Justificativa (obrigatória)</Label>
          <Textarea
            id="reopen-justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Descreva o motivo da reabertura (mínimo 10 caracteres)."
            rows={4}
            disabled={pending}
            className="resize-y"
          />
          <p className="text-muted-foreground text-xs">
            {trimmedLen < MIN_JUSTIFICATION
              ? `Faltam ${MIN_JUSTIFICATION - trimmedLen} caracteres.`
              : "Pronto para enviar."}
          </p>
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!canSubmit}
            onClick={() => void submit()}
          >
            {pending ? "A processar…" : "Confirmar reabertura"}
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
