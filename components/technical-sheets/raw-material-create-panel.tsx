"use client";

// Painel de criação rápida de matéria-prima, aberto de dentro do formulário
// de receita (recipe-form.tsx) quando o seletor de ingredientes está vazio
// para o âmbito atual. Alinhado à direita da tela, desliza da direita para a
// esquerda e ocupa boa parte da tela em telas de computador, para o usuário
// nunca precisar sair da receita que está preenchendo (e perder o que já
// digitou lá).

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { RawMaterialForm } from "@/components/technical-sheets/raw-material-form";
import type { RawMaterialRow } from "@/lib/types/raw-materials";
import type { ClientRow } from "@/lib/types/clients";
import type { EstablishmentWithClientNames } from "@/lib/types/establishments";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pjClients: ClientRow[];
  establishments: EstablishmentWithClientNames[];
  defaultClientId?: string;
  defaultEstablishmentId?: string;
  onCreated: (row: RawMaterialRow) => void;
};

export function RawMaterialCreatePanel({
  open,
  onOpenChange,
  pjClients,
  establishments,
  defaultClientId,
  defaultEstablishmentId,
  onCreated,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={
          "data-[side=right]:w-full data-[side=right]:max-w-full " +
          "data-[side=right]:sm:max-w-2xl data-[side=right]:overflow-y-auto"
        }
      >
        <SheetHeader>
          <SheetTitle>Nova matéria-prima</SheetTitle>
          <SheetDescription>
            Cadastre sem sair da receita — o que você já preencheu por aqui continua
            do jeito que estava.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <RawMaterialForm
            pjClients={pjClients}
            establishments={establishments}
            defaultClientId={defaultClientId}
            defaultEstablishmentId={defaultEstablishmentId}
            onCreated={(row) => {
              onCreated(row);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
