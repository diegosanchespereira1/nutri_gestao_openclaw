"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppTimeZone } from "@/components/app-timezone-provider";
import { createVisitDialogAction } from "@/lib/actions/visits";
import { VISIT_KINDS, visitKindLabel } from "@/lib/constants/visit-kinds";
import { VISIT_PRIORITIES, visitPriorityLabel } from "@/lib/constants/visit-priorities";
import { MAX_DOSSIER_EMAIL_RECIPIENTS } from "@/lib/constants/dossier-email";
import { localDateTimeInTimeZoneToUtcIso } from "@/lib/datetime/local-datetime-tz";
import type { VisitAssigneeFormContext } from "@/lib/visits/assignee-context";
import type { EstablishmentWithClientNames } from "@/lib/types/establishments";
import type { PatientWithContext } from "@/lib/types/patients";
import type { TeamMemberRow } from "@/lib/types/team-members";
import type { ClientLifecycleStatus } from "@/lib/types/clients";
import type { VisitKind, VisitTargetType } from "@/lib/types/visits";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import { cn } from "@/lib/utils";

/** Valor sentinela: Base UI Select não aceita string vazia em SelectItem. */
const SELF_ASSIGNEE_EMPTY = "__self__";

const textareaClass =
  "border-input bg-background placeholder:text-muted-foreground box-border flex min-h-[72px] min-w-0 w-full max-w-full resize-y break-words rounded-md border px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus:border-ring focus:ring-2 focus:ring-inset focus:ring-ring/40";

const fieldClassName = "flex min-w-0 flex-col gap-2";

function schedulingBlockedSuffix(status: ClientLifecycleStatus): string {
  if (status === "ativo") return "";
  if (status === "inativo") return " — inativo";
  return " — finalizado";
}

type Props = {
  open: boolean;
  onClose: () => void;
  defaultScheduledStart?: string;
  establishments: EstablishmentWithClientNames[];
  patients: PatientWithContext[];
  teamMembers: TeamMemberRow[];
  assigneeContext: VisitAssigneeFormContext;
  isLoadingTargets?: boolean;
};

export function VisitScheduleDialog({
  open,
  onClose,
  defaultScheduledStart,
  establishments,
  patients,
  teamMembers,
  assigneeContext,
  isLoadingTargets = false,
}: Props) {
  const tz = useAppTimeZone();
  const router = useRouter();

  const [targetType, setTargetType] = useState<VisitTargetType>(() =>
    establishments.some((e) => e.clients.lifecycle_status === "ativo")
      ? "establishment"
      : "patient",
  );
  const [state, formAction, isPending] = useActionState(createVisitDialogAction, null);

  const selfAssigneeValue =
    assigneeContext.currentTeamMemberId ?? SELF_ASSIGNEE_EMPTY;
  const [assigneeId, setAssigneeId] = useState(
    () => assigneeContext.defaultAssigneeId || SELF_ASSIGNEE_EMPTY,
  );
  const [visitKind, setVisitKind] = useState<VisitKind>(() =>
    establishments.some((e) => e.clients.lifecycle_status === "ativo")
      ? "technical_compliance"
      : "patient_care",
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setAssigneeId(assigneeContext.defaultAssigneeId || SELF_ASSIGNEE_EMPTY);
    setVisitKind(
      targetType === "patient" ? "patient_care" : "technical_compliance",
    );
    // Só ao abrir o diálogo — targetType intencional no momento da abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assigneeContext.defaultAssigneeId]);

  function handleTargetTypeChange(next: VisitTargetType) {
    setTargetType(next);
    setVisitKind(
      next === "patient" ? "patient_care" : "technical_compliance",
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const local = form.elements.namedItem("scheduled_start_local") as HTMLInputElement | null;
    const hidden = form.elements.namedItem("scheduled_start_iso") as HTMLInputElement | null;
    if (local?.value && hidden) {
      const iso = localDateTimeInTimeZoneToUtcIso(local.value, tz);
      if (iso) hidden.value = iso;
    }
  }

  const canScheduleEstablishment = establishments.some(
    (e) => e.clients.lifecycle_status === "ativo",
  );
  const canSchedulePatient = patients.some(
    (p) => (p.clients?.lifecycle_status ?? "ativo") === "ativo",
  );
  const noTargets = !canScheduleEstablishment && !canSchedulePatient;
  const disableSubmit =
    noTargets ||
    (targetType === "establishment" && !canScheduleEstablishment) ||
    (targetType === "patient" && !canSchedulePatient);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          if (!isPending) {
            setFormKey((k) => k + 1);
            onClose();
          }
        }
      }}
    >
      <DialogContent className="flex max-h-[min(92dvh,820px)] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0" showCloseButton>
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Agendar visita</DialogTitle>
          <DialogDescription>
            Tipo, destino, data/hora e prioridade. Profissional e notas são opcionais.
          </DialogDescription>
        </DialogHeader>

        {isLoadingTargets ? (
          <div
            className="flex-1 space-y-3 px-6 py-4"
            role="status"
            aria-live="polite"
            aria-label="Carregando destinos"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : noTargets ? (
          <div className="border-border bg-muted/30 mx-6 mb-6 flex-1 rounded-lg border border-dashed p-6 text-sm">
            <p className="text-muted-foreground">
              Precisa de pelo menos um estabelecimento ou paciente ativo para agendar.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/clientes"
                className={buttonVariants({ size: "sm" })}
                onClick={onClose}
              >
                Clientes
              </Link>
              <Link
                href="/pacientes"
                className={buttonVariants({ variant: "outline", size: "sm" })}
                onClick={onClose}
              >
                Pacientes
              </Link>
            </div>
          </div>
        ) : (
          <form
            key={formKey}
            action={formAction}
            onSubmit={handleSubmit}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-6 pb-6"
          >
            <input type="hidden" name="scheduled_start_iso" defaultValue="" />

            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
              <div className="flex flex-col gap-6 pb-6">
              {/* Destino */}
              <fieldset className="flex min-w-0 flex-col gap-2">
                <legend className="text-foreground text-sm font-medium">
                  Destino da visita
                </legend>
                <div className="flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="target_type"
                      value="establishment"
                      checked={targetType === "establishment"}
                      onChange={() => handleTargetTypeChange("establishment")}
                      required
                      className="h-4 w-4"
                    />
                    Estabelecimento
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="target_type"
                      value="patient"
                      checked={targetType === "patient"}
                      onChange={() => handleTargetTypeChange("patient")}
                      required
                      className="h-4 w-4"
                    />
                    Paciente
                  </label>
                </div>
              </fieldset>

              {/* Estabelecimento / Paciente */}
              {targetType === "establishment" ? (
                <div className={fieldClassName}>
                  <Label htmlFor="dlg-establishment">Estabelecimento (cliente PJ)</Label>
                  <Select name="establishment_id" required modal={false}>
                    <SelectTrigger id="dlg-establishment" className="w-full">
                      <SelectValue placeholder="— Selecionar —" />
                    </SelectTrigger>
                    <SelectContent>
                      {establishments.map((est) => {
                        const blocked = est.clients.lifecycle_status !== "ativo";
                        return (
                          <SelectItem
                            key={est.id}
                            value={est.id}
                            disabled={blocked}
                          >
                            {est.name} — {establishmentClientLabel(est)}
                            {schedulingBlockedSuffix(est.clients.lifecycle_status)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <input type="hidden" name="establishment_id" value="" />
              )}

              {targetType === "patient" ? (
                <div className={fieldClassName}>
                  <Label htmlFor="dlg-patient">Paciente</Label>
                  <Select name="patient_id" required modal={false}>
                    <SelectTrigger id="dlg-patient" className="w-full">
                      <SelectValue placeholder="— Selecionar —" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => {
                        const life = (p.clients?.lifecycle_status ??
                          "ativo") as ClientLifecycleStatus;
                        const blocked = life !== "ativo";
                        return (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            disabled={blocked}
                          >
                            {p.full_name}
                            {p.clients?.legal_name
                              ? ` (${p.clients.legal_name})`
                              : ""}
                            {schedulingBlockedSuffix(life)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <input type="hidden" name="patient_id" value="" />
              )}

              {/* Tipo de visita */}
              <div className={fieldClassName}>
                <Label htmlFor="dlg-visit-kind">Tipo de visita</Label>
                <Select
                  name="visit_kind"
                  required
                  modal={false}
                  value={visitKind}
                  onValueChange={(next) => {
                    if (next) setVisitKind(next as VisitKind);
                  }}
                >
                  <SelectTrigger id="dlg-visit-kind" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIT_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {visitKindLabel[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Profissional */}
              <div className={fieldClassName}>
                <Label htmlFor="dlg-assignee">Profissional que atende</Label>
                <input
                  type="hidden"
                  name="assigned_team_member_id"
                  value={
                    assigneeId === SELF_ASSIGNEE_EMPTY ? "" : assigneeId
                  }
                />
                <Select
                  modal={false}
                  value={assigneeId}
                  onValueChange={(next) => {
                    if (next) setAssigneeId(next);
                  }}
                >
                  <SelectTrigger id="dlg-assignee" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={selfAssigneeValue}>
                      {assigneeContext.selfAssigneeLabel}
                    </SelectItem>
                    {teamMembers
                      .filter((m) => m.id !== assigneeContext.currentTeamMemberId)
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.full_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data e hora + Prioridade */}
              <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] sm:gap-4">
                <div className={fieldClassName}>
                  <Label htmlFor="dlg-scheduled-start">Data e hora</Label>
                  <Input
                    id="dlg-scheduled-start"
                    name="scheduled_start_local"
                    type="datetime-local"
                    required
                    defaultValue={defaultScheduledStart}
                    className="w-full focus-visible:ring-inset focus-visible:ring-ring/40"
                  />
                  <p className="text-muted-foreground break-words text-xs">
                    Horário no fuso configurado em Definições → Região.
                  </p>
                </div>

                <div className={fieldClassName}>
                  <Label htmlFor="dlg-priority">Prioridade</Label>
                  <Select
                    name="priority"
                    modal={false}
                    defaultValue="normal"
                  >
                    <SelectTrigger id="dlg-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIT_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {visitPriorityLabel[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notas */}
              <div className={fieldClassName}>
                <Label htmlFor="dlg-notes">Notas (opcional)</Label>
                <textarea
                  id="dlg-notes"
                  name="notes"
                  rows={3}
                  className={textareaClass}
                />
              </div>

              {/* Emails dossiê */}
              <div className={fieldClassName}>
                <Label htmlFor="dlg-dossier-emails">
                  Emails para dossiê (opcional)
                </Label>
                <textarea
                  id="dlg-dossier-emails"
                  name="dossier_recipient_emails"
                  rows={2}
                  className={textareaClass}
                  placeholder="ex.: contato@cliente.com.br"
                />
                <p className="text-muted-foreground break-words text-xs">
                  Até {MAX_DOSSIER_EMAIL_RECIPIENTS} emails, separados por vírgula ou linha.
                </p>
              </div>
              </div>
            </div>

            {state?.ok === false ? (
              <p className="text-destructive mt-3 min-w-0 shrink-0 break-words text-sm">{state.error}</p>
            ) : null}

            <div className="bg-popover mt-4 flex min-w-0 shrink-0 gap-2 border-t pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "min-h-11 flex-1 justify-center",
                )}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || disableSubmit}
                className={cn(buttonVariants(), "min-h-11 flex-1 justify-center")}
              >
                {isPending ? "Salvando…" : "Agendar visita"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
