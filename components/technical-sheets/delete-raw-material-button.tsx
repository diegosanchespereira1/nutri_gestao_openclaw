"use client";

// Botão "Apagar" de matéria-prima com confirmação — mesmo padrão do
// VisitCancelButton (AlertDialog + chamada direta à Server Action, sem
// FormData/redirect). Avisa que a ação não pode ser revertida e, se o item
// estiver em uso, quantas receitas serão impactadas.

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button-variants";
import { deleteRawMaterialAction } from "@/lib/actions/raw-materials";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  name: string;
  /** Quantas receitas (distintas) usam esta matéria-prima numa linha. */
  recipesCount: number;
};

export function DeleteRawMaterialButton({ id, name, recipesCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsPending(true);
    setError(null);
    const result = await deleteRawMaterialAction(id);
    setIsPending(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) {
          setOpen(next);
          if (!next) setError(null);
        }
      }}
    >
      <AlertDialogTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "text-destructive border-destructive/40 hover:bg-destructive/10",
        )}
      >
        Apagar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar &ldquo;{name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser revertida.
            {recipesCount > 0 ? (
              <>
                {" "}
                Esta matéria-prima está sendo usada em {recipesCount} receita
                {recipesCount !== 1 ? "s" : ""} — ao apagar, essa{recipesCount !== 1 ? "s" : ""}{" "}
                receita{recipesCount !== 1 ? "s" : ""} perde{recipesCount !== 1 ? "m" : ""} a
                ligação ao custo deste item.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            className={cn(buttonVariants({ variant: "destructive" }), isPending && "opacity-70")}
          >
            {isPending ? "Apagando…" : "Apagar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
