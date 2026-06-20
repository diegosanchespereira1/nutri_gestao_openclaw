import { UserRound } from "lucide-react";

import {
  formatResponsibleHistoryDate,
  formatResponsibleLabel,
} from "@/lib/patients/responsible-history";
import type { PatientResponsibleHistoryEvent } from "@/lib/types/patient-responsible-history";

export function PatientResponsibleHistorySection({
  currentResponsibleName,
  events,
}: {
  currentResponsibleName: string | null;
  events: PatientResponsibleHistoryEvent[];
}) {
  return (
    <section className="space-y-4" aria-labelledby="responsible-history-heading">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="responsible-history-heading"
            className="text-foreground text-lg font-semibold tracking-tight"
          >
            Profissionais responsáveis
          </h2>
          <p className="text-muted-foreground text-sm">
            Histórico de quem fez acompanhamento ou atendimento deste paciente.
          </p>
        </div>
        <div className="border-border bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <UserRound className="text-primary size-4 shrink-0" aria-hidden />
          <span className="text-muted-foreground">Atual:</span>
          <span className="text-foreground font-medium">
            {formatResponsibleLabel(currentResponsibleName)}
          </span>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Ainda não há alterações registadas de profissional responsável.
        </p>
      ) : (
        <ol
          className="border-border relative space-y-0 border-s-2 ps-6"
          aria-label="Linha do tempo de profissionais responsáveis"
        >
          {events.map((ev) => (
            <li key={ev.id} className="relative pb-6 last:pb-0">
              <span
                className="bg-primary absolute -start-[5px] mt-1.5 size-2 rounded-full"
                aria-hidden
              />
              <div className="border-border rounded-lg border bg-card/30 px-4 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <time
                    className="text-foreground text-sm font-medium"
                    dateTime={ev.occurred_at}
                  >
                    {formatResponsibleHistoryDate(ev.occurred_at)}
                  </time>
                  {ev.actor_full_name ? (
                    <span className="text-muted-foreground text-xs">
                      Registado por{" "}
                      <span className="text-foreground font-medium">
                        {ev.actor_full_name}
                      </span>
                    </span>
                  ) : null}
                </div>
                <p className="text-foreground mt-2 text-sm">{ev.summary}</p>
                {ev.operation === "UPDATE" &&
                ev.from_team_member_name &&
                ev.to_team_member_name ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {ev.from_team_member_name} → {ev.to_team_member_name}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
