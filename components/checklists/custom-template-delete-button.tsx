"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteCustomTemplateAction } from "@/lib/actions/checklist-custom";

type Props = {
  customTemplateId: string;
  templateName: string;
};

export function CustomTemplateDeleteButton({
  customTemplateId,
  templateName,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCustomTemplateAction(customTemplateId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push("/checklists/personalizados");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-3.5" />
        Excluir modelo
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Excluir modelo personalizado?</DialogTitle>
            <DialogDescription>
              O modelo &quot;{templateName}&quot; será removido do catálogo. Os
              preenchimentos já feitos continuam no histórico de cada cliente.
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Excluindo…
                </>
              ) : (
                "Excluir modelo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
