"use client";

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
import { cancelVisitAction } from "@/lib/actions/visits";
import { cn } from "@/lib/utils";

type Props = {
  visitId: string;
  visitTitle: string;
  /** Fecha diálogos pais após cancelar (ex.: detalhe rápido na agenda). */
  onCancelled?: () => void;
  className?: string;
  variant?: "outline" | "destructive" | "ghost";
  size?: "default" | "sm";
  fullWidth?: boolean;
};

export function VisitCancelButton({
  visitId,
  visitTitle,
  onCancelled,
  className,
  variant = "outline",
  size = "default",
  fullWidth = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsPending(true);
    setError(null);
    const result = await cancelVisitAction(visitId);
    setIsPending(false);
    if (result.ok) {
      setOpen(false);
      onCancelled?.();
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
          buttonVariants({
            variant: variant === "destructive" ? "destructive" : variant,
            size,
          }),
          fullWidth && "w-full justify-center",
          className,
        )}
      >
        Cancelar visita
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar visita?</AlertDialogTitle>
          <AlertDialogDescription>
            A visita «{visitTitle}» passará ao estado cancelada e deixará de
            aparecer na agenda activa. Esta acção não elimina o registo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            className={cn(
              buttonVariants({ variant: "destructive" }),
              isPending && "opacity-70",
            )}
          >
            {isPending ? "A cancelar…" : "Confirmar cancelamento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
