"use client";

import { useState, useTransition } from "react";

import { generateContractHtml } from "@/lib/actions/contract-templates";
import type { ContractTemplate } from "@/lib/actions/contract-templates";
import type { BillingRecurrence } from "@/lib/types/client-contracts";
import { BILLING_RECURRENCE_LABELS } from "@/lib/types/client-contracts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileTextIcon, PrinterIcon } from "lucide-react";

type Props = {
  clientName: string;
  billingRecurrence: BillingRecurrence;
  monthlyAmountCents: number | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  templates: ContractTemplate[];
};

export function ContractGeneratorDialog({
  clientName,
  billingRecurrence,
  monthlyAmountCents,
  contractStartDate,
  contractEndDate,
  templates,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id ?? "",
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    if (!selectedTemplateId) return;
    startTransition(async () => {
      setErrorMsg(null);
      const { html, error } = await generateContractHtml({
        templateId: selectedTemplateId,
        clientName,
        billingRecurrence,
        monthlyAmountCents,
        contractStartDate,
        contractEndDate,
      });
      if (error || !html) {
        setErrorMsg(error ?? "Erro ao gerar contrato.");
        return;
      }
      setPreview(html);
    });
  }

  function handlePrint() {
    if (!preview) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Contrato — ${clientName}</title>
      <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #111; }
        h1 { font-size: 1.25rem; text-align: center; margin-bottom: 24px; }
        h2 { font-size: 1rem; margin-top: 24px; }
        p { line-height: 1.7; margin-bottom: 8px; }
        @media print { body { margin: 0; } }
      </style>
    </head><body>${preview}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  if (templates.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" aria-label="Gerar contrato PDF">
            <FileTextIcon className="mr-1.5 h-4 w-4" />
            Gerar contrato
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerar contrato a partir de modelo</DialogTitle>
          <DialogDescription>
            Selecione um modelo e pré-visualize o contrato com os dados de{" "}
            <strong>{clientName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="template-select">Modelo</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={(v: string | null) => { if (v) setSelectedTemplateId(v); }}
            >
              <SelectTrigger id="template-select">
                <SelectValue placeholder="Selecione um modelo" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                    {t.owner_user_id === null && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        (padrão)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
            <span>
              Recorrência:{" "}
              <strong>{BILLING_RECURRENCE_LABELS[billingRecurrence]}</strong>
            </span>
            {contractStartDate && (
              <span>
                Início:{" "}
                <strong>
                  {contractStartDate.split("-").reverse().join("/")}
                </strong>
              </span>
            )}
            {contractEndDate && (
              <span>
                Fim:{" "}
                <strong>
                  {contractEndDate.split("-").reverse().join("/")}
                </strong>
              </span>
            )}
          </div>

          {errorMsg && (
            <p className="text-destructive rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
              {errorMsg}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={!selectedTemplateId || isPending}
              size="sm"
            >
              {isPending ? "A gerar…" : "Pré-visualizar"}
            </Button>
            {preview && (
              <Button
                onClick={handlePrint}
                size="sm"
                variant="outline"
                aria-label="Imprimir ou guardar como PDF"
              >
                <PrinterIcon className="mr-1.5 h-4 w-4" />
                Imprimir / PDF
              </Button>
            )}
          </div>

          {preview && (
            <div
              className="border-border max-h-96 overflow-y-auto rounded-md border bg-white p-4 text-sm text-black"
              aria-label="Pré-visualização do contrato"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
