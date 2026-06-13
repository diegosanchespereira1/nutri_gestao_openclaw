import { CalendarClock } from "lucide-react";

import { ChildAssessmentForm } from "@/components/pacientes/child-assessment-form";
import { ChildAssessmentHistoryItem } from "@/components/pacientes/child-assessment-history-item";
import { loadChildAssessmentsForPatient } from "@/lib/actions/child-assessments";
import type { ChildSex } from "@/lib/nutrition/child/types";

/** Calcula a próxima coleta (6 meses após a última) e se está em atraso. */
function semestralStatus(
  lastRecordedAt: string | null,
): { dueLabel: string; overdue: boolean } | null {
  if (!lastRecordedAt) return null;
  const last = new Date(lastRecordedAt);
  if (Number.isNaN(last.getTime())) return null;

  const due = new Date(last);
  due.setMonth(due.getMonth() + 6);
  return {
    overdue: Date.now() > due.getTime(),
    dueLabel: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(due),
  };
}

/** Lembrete de coleta semestral (a cada 6 meses) conforme o procedimento. */
export function SemestralReminder({ lastRecordedAt }: { lastRecordedAt: string | null }) {
  const status = semestralStatus(lastRecordedAt);
  if (!status) return null;
  const { overdue, dueLabel } = status;

  return (
    <div
      className={
        overdue
          ? "flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
          : "flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
      }
    >
      <CalendarClock className="size-4 shrink-0" aria-hidden />
      <span>
        Coleta recomendada a cada 6 meses (semestral).{" "}
        {overdue
          ? `Nova medição em atraso desde ${dueLabel}.`
          : `Próxima medição sugerida: ${dueLabel}.`}
      </span>
    </div>
  );
}

export async function ChildAssessmentsSection({
  patientId,
  defaultSex,
  defaultBirthDate,
}: {
  patientId: string;
  defaultSex?: ChildSex | null;
  defaultBirthDate?: string | null;
}) {
  const { rows } = await loadChildAssessmentsForPatient(patientId);

  return (
    <div className="space-y-6" aria-label="Avaliações infantis">
      <SemestralReminder lastRecordedAt={rows[0]?.recorded_at ?? null} />

      <ChildAssessmentForm
        patientId={patientId}
        defaultSex={defaultSex}
        defaultBirthDate={defaultBirthDate}
      />

      <div className="border-t border-border pt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Histórico de avaliações infantis
        </h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há avaliações infantis. Utilize o formulário acima para o
            primeiro registo.
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Histórico de avaliações infantis">
            {rows.map((r) => (
              <ChildAssessmentHistoryItem key={r.id} row={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
