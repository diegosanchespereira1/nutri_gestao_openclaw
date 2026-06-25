"use client";

import { LifeBuoy, Lock } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getModuleLabel } from "@/lib/modules/module-path-access";
import type { EnabledModuleKey } from "@/lib/types/modules";

type Props = {
  moduleKey: EnabledModuleKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModuleDisabledDialog({
  moduleKey,
  open,
  onOpenChange,
}: Props) {
  const moduleLabel = moduleKey ? getModuleLabel(moduleKey) : "Esta funcionalidade";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="bg-muted text-muted-foreground mb-1 flex size-10 items-center justify-center rounded-lg">
            <Lock className="size-4" aria-hidden />
          </div>
          <AlertDialogTitle>Funcionalidade não disponível</AlertDialogTitle>
          <AlertDialogDescription>
            O módulo {moduleLabel} não está ativo na sua conta.
          </AlertDialogDescription>
          <p className="text-muted-foreground flex items-start gap-2 text-sm leading-relaxed">
            <LifeBuoy
              className="text-primary mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <span>
              Para saber mais sobre esta funcionalidade ou solicitar a ativação,
              fale com o suporte NutriGestão.
            </span>
          </p>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Entendi</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
