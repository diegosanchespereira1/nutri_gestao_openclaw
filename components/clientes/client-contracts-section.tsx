"use client";

import { useState } from "react";

import {
  createContractAction,
  updateContractAction,
  deleteContractAction,
} from "@/lib/actions/client-contracts";
import {
  BILLING_RECURRENCE_LABELS,
  type BillingRecurrence,
  type ClientContract,
} from "@/lib/types/client-contracts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PlusIcon, PencilIcon, TrashIcon, XIcon } from "lucide-react";

function formatCentsAsBRL(cents: number | null): string {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function contractStatusBadge(contract: ClientContract): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (!contract.contract_end_date) {
    return { label: "Sem data de fim", variant: "secondary" };
  }
  const today = new Date();
  const end = new Date(`${contract.contract_end_date}T12:00:00Z`);
  const diffDays = Math.round(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return { label: "Vencido", variant: "destructive" };
  if (diffDays <= contract.alert_days_before)
    return { label: `Vence em ${diffDays}d`, variant: "default" };
  return { label: "Vigente", variant: "outline" };
}

// ── Form ─────────────────────────────────────────────────────────────────────

function ContractForm({
  clientId,
  initial,
  onCancel,
  errorMsg,
}: {
  clientId: string;
  initial?: ClientContract;
  onCancel: () => void;
  errorMsg?: string;
}) {
  const [recurrence, setRecurrence] = useState<BillingRecurrence>(
    initial?.billing_recurrence ?? "monthly",
  );
  const [pending, setPending] = useState(false);

  const action = initial ? updateContractAction : createContractAction;

  return (
    <form
      action={async (fd) => {
        setPending(true);
        await action(fd);
        setPending(false);
      }}
      className="space-y-4"
    >
      <input type="hidden" name="client_id" value={clientId} />
      {initial && (
        <input type="hidden" name="contract_id" value={initial.id} />
      )}

      {errorMsg && (
        <p className="text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
          {errorMsg}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Recorrência */}
        <div className="space-y-1.5">
          <Label htmlFor="billing_recurrence">Recorrência</Label>
          <Select
            name="billing_recurrence"
            value={recurrence}
            onValueChange={(v: string | null) => { if (v) setRecurrence(v as BillingRecurrence); }}
          >
            <SelectTrigger id="billing_recurrence">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(BILLING_RECURRENCE_LABELS) as [
                  BillingRecurrence,
                  string,
                ][]
              ).map(([v, label]) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Valor */}
        <div className="space-y-1.5">
          <Label htmlFor="monthly_amount">
            Valor{" "}
            {recurrence === "monthly"
              ? "mensal"
              : recurrence === "annual"
                ? "anual"
                : ""}
          </Label>
          <Input
            id="monthly_amount"
            name="monthly_amount"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={
              initial?.monthly_amount_cents
                ? (initial.monthly_amount_cents / 100).toFixed(2)
                : ""
            }
            aria-label="Valor do contrato em reais"
          />
        </div>

        {/* Data início */}
        <div className="space-y-1.5">
          <Label htmlFor="contract_start_date">Início do contrato</Label>
          <Input
            id="contract_start_date"
            name="contract_start_date"
            type="date"
            defaultValue={initial?.contract_start_date ?? ""}
          />
        </div>

        {/* Data fim */}
        <div className="space-y-1.5">
          <Label htmlFor="contract_end_date">Fim do contrato</Label>
          <Input
            id="contract_end_date"
            name="contract_end_date"
            type="date"
            defaultValue={initial?.contract_end_date ?? ""}
          />
        </div>

        {/* Alerta antecipado */}
        <div className="space-y-1.5">
          <Label htmlFor="alert_days_before">
            Alertar (dias antes do vencimento)
          </Label>
          <Input
            id="alert_days_before"
            name="alert_days_before"
            type="number"
            min={0}
            max={365}
            defaultValue={initial?.alert_days_before ?? 30}
          />
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Condições especiais, observações..."
          defaultValue={initial?.notes ?? ""}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending
            ? "Salvando…"
            : initial
              ? "Salvar alterações"
              : "Criar contrato"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <XIcon className="mr-1 h-4 w-4" />
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ClientContractsSection({
  clientId,
  contracts,
  contractErr,
}: {
  clientId: string;
  contracts: ClientContract[];
  contractErr?: string;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const errMessages: Record<string, string> = {
    invalid: "Preencha os campos obrigatórios corretamente.",
    client: "Cliente inválido ou sem permissão.",
    save: "Não foi possível salvar o contrato. Tente novamente.",
  };

  const errorMsg = contractErr ? (errMessages[contractErr] ?? errMessages.save) : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">
              Contratos e recorrência
            </CardTitle>
            <CardDescription>
              Recorrência, vigência e alertas de vencimento por cliente.
            </CardDescription>
          </div>
          {!showCreate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setShowCreate(true);
              }}
              aria-label="Adicionar contrato"
            >
              <PlusIcon className="mr-1 h-4 w-4" />
              Adicionar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showCreate && (
          <div className="rounded-md border p-4">
            <p className="text-muted-foreground mb-3 text-sm font-medium">
              Novo contrato
            </p>
            <ContractForm
              clientId={clientId}
              onCancel={() => setShowCreate(false)}
              errorMsg={errorMsg}
            />
          </div>
        )}

        {contracts.length === 0 && !showCreate && (
          <p className="text-muted-foreground text-sm">
            Nenhum contrato registado para este cliente.
          </p>
        )}

        {contracts.map((c, idx) => {
          const { label, variant } = contractStatusBadge(c);
          const isEditing = editingId === c.id;

          return (
            <div key={c.id}>
              {idx > 0 && <Separator className="my-3" />}
              {isEditing ? (
                <div className="rounded-md border p-4">
                  <p className="text-muted-foreground mb-3 text-sm font-medium">
                    Editar contrato
                  </p>
                  <ContractForm
                    clientId={clientId}
                    initial={c}
                    onCancel={() => setEditingId(null)}
                    errorMsg={errorMsg}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={variant}>{label}</Badge>
                    <span className="text-sm font-medium">
                      {BILLING_RECURRENCE_LABELS[c.billing_recurrence]}
                    </span>
                    {c.monthly_amount_cents && (
                      <span className="text-sm">
                        — {formatCentsAsBRL(c.monthly_amount_cents)}
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 text-xs tabular-nums">
                    <span>
                      Início:{" "}
                      <span className="text-foreground">
                        {formatDate(c.contract_start_date)}
                      </span>
                    </span>
                    <span>
                      Fim:{" "}
                      <span className="text-foreground">
                        {formatDate(c.contract_end_date)}
                      </span>
                    </span>
                    <span>
                      Alertar:{" "}
                      <span className="text-foreground">
                        {c.alert_days_before}d antes
                      </span>
                    </span>
                  </div>
                  {c.notes && (
                    <p className="text-muted-foreground text-xs">{c.notes}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowCreate(false);
                        setEditingId(c.id);
                      }}
                      aria-label="Editar contrato"
                    >
                      <PencilIcon className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            aria-label="Eliminar contrato"
                          >
                            <TrashIcon className="mr-1 h-3.5 w-3.5" />
                            Eliminar
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar contrato?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O registo de
                            contrato será permanentemente removido.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <form action={deleteContractAction}>
                            <input
                              type="hidden"
                              name="contract_id"
                              value={c.id}
                            />
                            <input
                              type="hidden"
                              name="client_id"
                              value={clientId}
                            />
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </form>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
