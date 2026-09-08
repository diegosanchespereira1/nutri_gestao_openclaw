"use client";

import { PlusIcon } from "lucide-react";
import { useId, useState } from "react";

import { FinancialChargeAmountInput } from "@/components/financeiro/financial-charge-amount-input";
import { FinancialChargeCategoryField } from "@/components/financeiro/financial-charge-category-field";
import { FinancialChargeClientPicker } from "@/components/financeiro/financial-charge-client-picker";
import type { FinancialChargeClientPickerItem } from "@/components/financeiro/financial-charge-client-picker";
import type { FinancialChargeCustomCategory } from "@/lib/actions/financial-charge-categories";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFinancialChargeAction } from "@/lib/actions/financial-charges";
import type { ChargeMutationSource } from "@/lib/financeiro/charge-form";

type LockedClient = {
  id: string;
  label: string;
};

type Props = {
  source: ChargeMutationSource;
  clients?: FinancialChargeClientPickerItem[];
  customCategories?: FinancialChargeCustomCategory[];
  defaultClientId?: string;
  lockedClient?: LockedClient;
  description: string;
  errorMessage?: string | null;
};

export function FinancialChargeCreateDialog({
  source,
  clients = [],
  customCategories = [],
  defaultClientId,
  lockedClient,
  description,
  errorMessage = null,
}: Props) {
  const [open, setOpen] = useState(Boolean(errorMessage));
  const uid = useId();
  const clientFieldId = `${uid}-client`;
  const descId = `${uid}-desc`;
  const amountId = `${uid}-amount`;
  const dueId = `${uid}-due`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size="sm"
        className="w-full shrink-0 sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <PlusIcon className="size-4" />
        Adicionar cobrança
      </Button>

      <DialogContent
        showCloseButton
        className="max-h-[min(92vh,44rem)] overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>Nova cobrança</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {errorMessage ? (
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm"
          >
            {errorMessage}
          </p>
        ) : null}

        <form action={createFinancialChargeAction} className="space-y-5">
          <input type="hidden" name="source" value={source} />
          {lockedClient ? (
            <input type="hidden" name="client_id" value={lockedClient.id} />
          ) : null}

          {lockedClient ? (
            <div className="space-y-2">
              <p className="text-foreground text-sm font-medium">
                Cliente <span className="text-destructive">*</span>
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Esta cobrança será registada automaticamente para este cliente.
              </p>
              <div className="border-border bg-muted/30 rounded-lg border px-3 py-2">
                <p className="text-foreground text-sm font-medium">
                  {lockedClient.label}
                </p>
              </div>
            </div>
          ) : (
            <FinancialChargeClientPicker
              id={clientFieldId}
              required
              defaultClientId={defaultClientId}
              clients={clients}
            />
          )}

          <FinancialChargeCategoryField
            id={`${uid}-category`}
            customCategories={customCategories}
            required
          />

          <div className="space-y-2">
            <Label htmlFor={descId} className="text-sm font-medium">
              Descrição{" "}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <Input
              id={descId}
              name="description"
              maxLength={500}
              placeholder="Ex.: Mensalidade consultoria — abril"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={amountId} className="text-sm font-medium">
                Valor (R$) <span className="text-destructive">*</span>
              </Label>
              <FinancialChargeAmountInput
                id={amountId}
                name="amount"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={dueId} className="text-sm font-medium">
                Data de vencimento <span className="text-destructive">*</span>
              </Label>
              <Input id={dueId} name="due_date" type="date" required />
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <p className="text-muted-foreground text-xs sm:self-center">
              Fica em aberto até marcar como paga.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Registar cobrança</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
