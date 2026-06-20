import type { PatientResponsibleHistoryEvent } from "@/lib/types/patient-responsible-history";

type AuditRow = {
  id: string;
  operation: string;
  created_at: string;
  actor_user_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
};

function readResponsibleId(values: Record<string, unknown> | null): string | null {
  const raw = values?.responsible_team_member_id;
  if (typeof raw !== "string" || raw.trim().length === 0) return null;
  return raw;
}

function formatResponsibleLabel(name: string | null): string {
  return name?.trim() || "Nenhum";
}

function buildSummary(args: {
  operation: string;
  fromName: string | null;
  toName: string | null;
  actorName: string | null;
}): string {
  const actor = args.actorName?.trim()
    ? ` por ${args.actorName.trim()}`
    : "";

  if (args.operation === "INSERT") {
    if (args.toName) {
      return `Acompanhamento iniciado com ${args.toName}${actor}.`;
    }
    return `Paciente cadastrado sem profissional responsável${actor}.`;
  }

  if (args.operation === "DELETE") {
    if (args.fromName) {
      return `Registo eliminado (último responsável: ${args.fromName})${actor}.`;
    }
    return `Registo eliminado${actor}.`;
  }

  if (!args.fromName && args.toName) {
    return `Responsável definido: ${args.toName}${actor}.`;
  }
  if (args.fromName && !args.toName) {
    return `Responsável removido (era ${args.fromName})${actor}.`;
  }
  if (args.fromName && args.toName) {
    return `Responsável alterado de ${args.fromName} para ${args.toName}${actor}.`;
  }
  return `Alteração registada${actor}.`;
}

export function mapAuditRowsToResponsibleHistory(args: {
  rows: AuditRow[];
  teamMemberNames: Map<string, string>;
  actorNames: Map<string, string>;
}): PatientResponsibleHistoryEvent[] {
  const { rows, teamMemberNames, actorNames } = args;

  return rows
    .filter((row) => {
      if (row.operation === "INSERT" || row.operation === "DELETE") {
        return true;
      }
      if (row.operation !== "UPDATE") return false;
      const fromId = readResponsibleId(row.old_values);
      const toId = readResponsibleId(row.new_values);
      return fromId !== toId;
    })
    .map((row) => {
      const fromId = readResponsibleId(row.old_values);
      const toId = readResponsibleId(row.new_values);
      const fromName = fromId ? teamMemberNames.get(fromId) ?? null : null;
      const toName = toId ? teamMemberNames.get(toId) ?? null : null;
      const actorName = row.actor_user_id
        ? actorNames.get(row.actor_user_id) ?? null
        : null;

      return {
        id: row.id,
        occurred_at: row.created_at,
        operation: row.operation as PatientResponsibleHistoryEvent["operation"],
        from_team_member_id: fromId,
        from_team_member_name: fromName,
        to_team_member_id: toId,
        to_team_member_name: toName,
        actor_user_id: row.actor_user_id,
        actor_full_name: actorName,
        summary: buildSummary({
          operation: row.operation,
          fromName,
          toName,
          actorName,
        }),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );
}

export function formatResponsibleHistoryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export { formatResponsibleLabel };
