"use client";

import Link from "next/link";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button-variants";
import { visitKindLabel } from "@/lib/constants/visit-kinds";
import { teamJobRoleLabel } from "@/lib/constants/team-roles";
import { visitPriorityLabel } from "@/lib/constants/visit-priorities";
import { visitStatusLabel } from "@/lib/constants/visit-status";
import { useAppTimeZone } from "@/components/app-timezone-provider";
import { formatDateTimeShort } from "@/lib/datetime/calendar-tz";
import type { TeamJobRole } from "@/lib/types/team-members";
import type { ScheduledVisitWithTargets, VisitKind } from "@/lib/types/visits";
import { visitDisplayTitle } from "@/lib/visits/display-title";
import { cn } from "@/lib/utils";

type Props = {
  visit: ScheduledVisitWithTargets | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canStartVisit: (v: ScheduledVisitWithTargets) => boolean;
};

function assigneeLabel(visit: ScheduledVisitWithTargets): string | null {
  if (!visit.team_members) return null;
  const role = visit.team_members.job_role as TeamJobRole;
  const roleLabel = teamJobRoleLabel[role] ?? visit.team_members.job_role;
  return `${visit.team_members.full_name} (${roleLabel})`;
}

export function VisitQuickDetailDialog({
  visit,
  open,
  onOpenChange,
  canStartVisit,
}: Props) {
  const tz = useAppTimeZone();

  if (!open) return null;

  if (!visit) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Detalhe da visita</DialogTitle>
            <DialogDescription>Selecione um compromisso na agenda.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const title = visitDisplayTitle(visit);
  const assignee = assigneeLabel(visit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {formatDateTimeShort(visit.scheduled_start, tz)} ·{" "}
            {visitPriorityLabel[visit.priority]} · {visitStatusLabel[visit.status]}
          </DialogDescription>
        </DialogHeader>

        <dl className="text-muted-foreground space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-foreground/80 w-28 shrink-0 font-medium">
              Tipo de visita
            </dt>
            <dd>
              {visitKindLabel[(visit.visit_kind ?? "other") as VisitKind]}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-foreground/80 w-28 shrink-0 font-medium">
              Destino
            </dt>
            <dd>
              {visit.target_type === "establishment"
                ? "Estabelecimento"
                : "Paciente"}
            </dd>
          </div>
          {assignee ? (
            <div className="flex gap-2">
              <dt className="text-foreground/80 w-28 shrink-0 font-medium">
                Profissional
              </dt>
              <dd>{assignee}</dd>
            </div>
          ) : (
            <div className="flex gap-2">
              <dt className="text-foreground/80 w-28 shrink-0 font-medium">
                Profissional
              </dt>
              <dd>Titular da conta (não atribuído à equipe)</dd>
            </div>
          )}
        </dl>

        {visit.notes ? (
          <p className="text-muted-foreground border-t pt-3 text-sm">
            <span className="text-foreground font-medium">Notas: </span>
            {visit.notes}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 border-t pt-2 sm:flex-row">
          <Link
            href={`/visitas/${visit.id}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "min-h-11 flex-1 justify-center",
            )}
            onClick={() => onOpenChange(false)}
          >
            Ficha completa
          </Link>
          {canStartVisit(visit) ? (
            <Link
              href={`/visitas/${visit.id}/iniciar`}
              className={cn(buttonVariants(), "min-h-11 flex-1 justify-center")}
              onClick={() => onOpenChange(false)}
            >
              {visit.status === "in_progress"
                ? "Continuar visita"
                : "Iniciar visita"}
            </Link>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
