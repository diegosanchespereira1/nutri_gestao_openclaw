"use client";

import Link from "next/link";
import { useState } from "react";

import type { EstablishmentWithClientNames } from "@/lib/types/establishments";
import type { PatientWithContext } from "@/lib/types/patients";
import type { ClientLifecycleStatus } from "@/lib/types/clients";
import type { VisitTargetType } from "@/lib/types/visits";
import {
  VISIT_PRIORITIES,
  visitPriorityLabel,
} from "@/lib/constants/visit-priorities";
import { VISIT_KINDS, visitKindLabel } from "@/lib/constants/visit-kinds";
import { MAX_DOSSIER_EMAIL_RECIPIENTS } from "@/lib/constants/dossier-email";
import type { TeamMemberRow } from "@/lib/types/team-members";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createScheduledVisitAction } from "@/lib/actions/visits";

const selectClassName =
  "border-input bg-background text-foreground focus-visible:ring-ring h-9 w-full rounded-lg border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const textareaClass =
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

function schedulingBlockedSuffix(status: ClientLifecycleStatus): string {
  if (status === "ativo") return "";
  if (status === "inativo") {
    return " — inativo (não agenda visitas até reativar)";
  }
  return " — finalizado (não agenda visitas até reativar)";
}

type Props = {
  establishments: EstablishmentWithClientNames[];
  patients: PatientWithContext[];
  teamMembers: TeamMemberRow[];
};

function hasSchedulableEstablishment(
  list: EstablishmentWithClientNames[],
): boolean {
  return list.some((e) => e.clients.lifecycle_status === "ativo");
}

function hasSchedulablePatient(list: PatientWithContext[]): boolean {
  return list.some(
    (p) => (p.clients?.lifecycle_status ?? "ativo") === "ativo",
  );
}

export function VisitScheduleForm({
  establishments,
  patients,
  teamMembers,
}: Props) {
  const [targetType, setTargetType] = useState<VisitTargetType>(() => {
    if (hasSchedulableEstablishment(establishments)) return "establishment";
    return "patient";
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const local = form.elements.namedItem(
      "scheduled_start_local",
    ) as HTMLInputElement;
    const hidden = form.elements.namedItem(
      "scheduled_start_iso",
    ) as HTMLInputElement;
    if (!local?.value) {
      e.preventDefault();
      return;
    }
    hidden.value = new Date(local.value).toISOString();
  }

  const disableSubmit =
    (establishments.length === 0 && patients.length === 0) ||
    (targetType === "establishment" &&
      !hasSchedulableEstablishment(establishments)) ||
    (targetType === "patient" && !hasSchedulablePatient(patients));

  return (
    <form
      action={createScheduledVisitAction}
      onSubmit={onSubmit}
      className="max-w-lg space-y-6"
    >
      <input type="hidden" name="scheduled_start_iso" value="" />

      <fieldset className="space-y-3">
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

      <div className="space-y-2">
        <Label htmlFor="visit-kind">Tipo de visita</Label>
        <select
          id="visit-kind"
          key={targetType}
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
        <p className="text-muted-foreground text-xs">
          Classificação operacional (independente de ir a um paciente ou a um
          estabelecimento).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="visit-assignee">Profissional que atende</Label>
        <select
          id="visit-assignee"
          name="assigned_team_member_id"
          className={selectClassName}
          defaultValue=""
        >
          <option value="">Eu (titular da conta)</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
        {teamMembers.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Sem equipe cadastrada.{" "}
            <Link
              href="/equipe/nova"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Adicionar membro
            </Link>
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            <Link
              href="/equipe"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Gerir equipe
            </Link>
          </p>
        )}
      </div>

      {targetType === "establishment" ? (
        <div className="space-y-2">
          <Label htmlFor="visit-establishment">
            Estabelecimento (cliente PJ)
          </Label>
          <select
            id="visit-establishment"
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
          <Label htmlFor="visit-patient">Paciente</Label>
          <select
            id="visit-patient"
            name="patient_id"
            className={selectClassName}
            defaultValue=""
            required
          >
            <option value="">— Selecionar —</option>
            {patients.map((p) => {
              const life = (p.clients?.lifecycle_status ??
                "ativo") as ClientLifecycleStatus;
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

      <div className="space-y-2">
        <Label htmlFor="scheduled_start_local">Data e hora</Label>
        <Input
          id="scheduled_start_local"
          name="scheduled_start_local"
          type="datetime-local"
          required
          className="w-full max-w-xs"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="visit-priority">Prioridade</Label>
        <select
          id="visit-priority"
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

      <div className="space-y-2">
        <Label htmlFor="visit-notes">Notas (opcional)</Label>
        <textarea
          id="visit-notes"
          name="notes"
          rows={3}
          className={textareaClass}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dossier-recipient-emails">
          Emails para envio do dossiê (opcional)
        </Label>
        <textarea
          id="dossier-recipient-emails"
          name="dossier_recipient_emails"
          rows={2}
          className={textareaClass}
          placeholder="ex.: contacto@cliente.pt"
          aria-describedby="dossier-recipient-emails-hint"
        />
        <p
          id="dossier-recipient-emails-hint"
          className="text-muted-foreground text-xs"
        >
          Após aprovar o dossiê do checklist, o PDF é enviado automaticamente a
          estes endereços (se o envio estiver configurado no servidor). Até{" "}
          {MAX_DOSSIER_EMAIL_RECIPIENTS} emails, separados por vírgula ou linha.
        </p>
      </div>

      <Button type="submit" disabled={disableSubmit}>
        Agendar visita
      </Button>
    </form>
  );
}
