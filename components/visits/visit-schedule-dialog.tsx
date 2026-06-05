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
import type { VisitTargetType } from "@/lib/types/visits";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import { cn } from "@/lib/utils";

const selectClassName =
  "border-input bg-background text-foreground focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const textareaClass =
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

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

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  const [formKey, setFormKey] = useState(0);

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
      <DialogContent className="flex max-h-[92dvh] max-w-lg flex-col" showCloseButton>
        <DialogHeader className="shrink-0">
          <DialogTitle>Agendar visita</DialogTitle>
          <DialogDescription>
            Tipo, destino, data/hora e prioridade. Profissional e notas são opcionais.
          </DialogDescription>
        </DialogHeader>

        {isLoadingTargets ? (
          <div
            className="flex-1 space-y-3 py-4"
            role="status"
            aria-live="polite"
            aria-label="Carregando destinos"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : noTargets ? (
          <div className="border-border bg-muted/30 flex-1 rounded-lg border border-dashed p-6 text-sm">
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
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <input type="hidden" name="scheduled_start_iso" defaultValue="" />

            <div className="flex-1 space-y-5 overflow-y-auto pr-1 pb-1">
              {/* Destino */}
              <fieldset className="space-y-2">
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
                      onChange={() => setTargetType("establishment")}
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
                      onChange={() => setTargetType("patient")}
                      required
                      className="h-4 w-4"
                    />
                    Paciente
                  </label>
                </div>
              </fieldset>

              {/* Estabelecimento / Paciente */}
              {targetType === "establishment" ? (
                <div className="space-y-2">
                  <Label htmlFor="dlg-establishment">Estabelecimento (cliente PJ)</Label>
                  <select
                    id="dlg-establishment"
                    name="establishment_id"
                    className={selectClassName}
                    defaultValue=""
                    required
                  >
                    <option value="">— Selecionar —</option>
                    {establishments.map((est) => {
                      const blocked = est.clients.lifecycle_status !== "ativo";
                      return (
                        <option key={est.id} value={est.id} disabled={blocked}>
                          {est.name} — {establishmentClientLabel(est)}
                          {schedulingBlockedSuffix(est.clients.lifecycle_status)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <input type="hidden" name="establishment_id" value="" />
              )}

              {targetType === "patient" ? (
                <div className="space-y-2">
                  <Label htmlFor="dlg-patient">Paciente</Label>
                  <select
                    id="dlg-patient"
                    name="patient_id"
                    className={selectClassName}
                    defaultValue=""
                    required
                  >
                    <option value="">— Selecionar —</option>
                    {patients.map((p) => {
                      const life = (p.clients?.lifecycle_status ?? "ativo") as ClientLifecycleStatus;
                      const blocked = life !== "ativo";
                      return (
                        <option key={p.id} value={p.id} disabled={blocked}>
                          {p.full_name}
                          {p.clients?.legal_name ? ` (${p.clients.legal_name})` : ""}
                          {schedulingBlockedSuffix(life)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <input type="hidden" name="patient_id" value="" />
              )}

              {/* Tipo de visita */}
              <div className="space-y-2">
                <Label htmlFor="dlg-visit-kind">Tipo de visita</Label>
                <select
                  id="dlg-visit-kind"
                  key={`kind-${targetType}`}
                  name="visit_kind"
                  className={selectClassName}
                  required
                  defaultValue={
                    targetType === "patient" ? "patient_care" : "technical_compliance"
                  }
                >
                  {VISIT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {visitKindLabel[k]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Profissional */}
              <div className="space-y-2">
                <Label htmlFor="dlg-assignee">Profissional que atende</Label>
                <select
                  id="dlg-assignee"
                  name="assigned_team_member_id"
                  className={selectClassName}
                  defaultValue={assigneeContext.defaultAssigneeId}
                >
                  <option value={assigneeContext.currentTeamMemberId ?? ""}>
                    {assigneeContext.selfAssigneeLabel}
                  </option>
                  {teamMembers
                    .filter((m) => m.id !== assigneeContext.currentTeamMemberId)
                    .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data e hora */}
              <div className="space-y-2">
                <Label htmlFor="dlg-scheduled-start">Data e hora</Label>
                <Input
                  id="dlg-scheduled-start"
                  name="scheduled_start_local"
                  type="datetime-local"
                  required
                  defaultValue={defaultScheduledStart}
                  className="w-full max-w-xs"
                />
                <p className="text-muted-foreground text-xs">
                  Horário no fuso configurado em Definições → Região.
                </p>
              </div>

              {/* Prioridade */}
              <div className="space-y-2">
                <Label htmlFor="dlg-priority">Prioridade</Label>
                <select
                  id="dlg-priority"
                  name="priority"
                  className={selectClassName}
                  defaultValue="normal"
                >
                  {VISIT_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {visitPriorityLabel[p]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="dlg-notes">Notas (opcional)</Label>
                <textarea
                  id="dlg-notes"
                  name="notes"
                  rows={3}
                  className={textareaClass}
                />
              </div>

              {/* Emails dossiê */}
              <div className="space-y-2">
                <Label htmlFor="dlg-dossier-emails">
                  Emails para dossiê (opcional)
                </Label>
                <textarea
                  id="dlg-dossier-emails"
                  name="dossier_recipient_emails"
                  rows={2}
                  className={textareaClass}
                  placeholder="ex.: contacto@cliente.pt"
                />
                <p className="text-muted-foreground text-xs">
                  Até {MAX_DOSSIER_EMAIL_RECIPIENTS} emails, separados por vírgula ou linha.
                </p>
              </div>
            </div>

            {state?.ok === false ? (
              <p className="text-destructive mt-3 shrink-0 text-sm">{state.error}</p>
            ) : null}

            <div className="mt-4 flex shrink-0 gap-2 border-t pt-4">
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
                {isPending ? "A guardar…" : "Agendar visita"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
