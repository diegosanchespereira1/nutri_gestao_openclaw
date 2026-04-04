import type { ConsolidatedNutritionEvent } from "@/lib/types/patient-history";
import {
  formatAssessmentRecordedAt,
} from "@/lib/utils/nutrition-assessment-display";

export function ConsolidatedTimeline({
  events,
}: {
  events: ConsolidatedNutritionEvent[];
}) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Sem avaliações nutricionais para mostrar nesta vista consolidada.
      </p>
    );
  }

  return (
    <ol
      className="border-border relative space-y-0 border-s-2 ps-6"
      aria-label="Linha do tempo de avaliações"
    >
      {events.map((ev) => (
        <li key={ev.id} className="pb-8 last:pb-0">
          <span
            className="bg-primary absolute -start-[5px] mt-1.5 size-2 rounded-full"
            aria-hidden
          />
          <div className="border-border rounded-lg border bg-card/30">
            <details className="group">
              <summary className="hover:bg-muted/40 cursor-pointer list-none px-4 py-3 transition-colors marker:content-none [&::-webkit-details-marker]:hidden">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <span className="text-foreground font-medium">
                      {formatAssessmentRecordedAt(ev.recorded_at)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {ev.summary_line}
                    </span>
                  </div>
                  <p className="text-primary text-xs font-medium">
                    Origem: {ev.origin_label}
                  </p>
                </div>
              </summary>
              <div className="border-border space-y-3 border-t px-4 py-3 text-sm">
                {ev.diet_notes ? (
                  <div>
                    <span className="text-muted-foreground font-medium">
                      Alimentação / hábitos
                    </span>
                    <p className="text-foreground mt-1 whitespace-pre-wrap">
                      {ev.diet_notes}
                    </p>
                  </div>
                ) : null}
                {ev.clinical_notes ? (
                  <div>
                    <span className="text-muted-foreground font-medium">
                      Notas clínicas
                    </span>
                    <p className="text-foreground mt-1 whitespace-pre-wrap">
                      {ev.clinical_notes}
                    </p>
                  </div>
                ) : null}
                {ev.goals ? (
                  <div>
                    <span className="text-muted-foreground font-medium">
                      Objetivos
                    </span>
                    <p className="text-foreground mt-1 whitespace-pre-wrap">
                      {ev.goals}
                    </p>
                  </div>
                ) : null}
                {!ev.diet_notes && !ev.clinical_notes && !ev.goals ? (
                  <p className="text-muted-foreground">
                    Apenas dados antropométricos / atividade neste registo.
                  </p>
                ) : null}
              </div>
            </details>
          </div>
        </li>
      ))}
    </ol>
  );
}
