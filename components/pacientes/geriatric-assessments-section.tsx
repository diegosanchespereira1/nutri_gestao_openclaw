import { GeriatricAssessmentForm } from "@/components/pacientes/geriatric-assessment-form";
import { GeriatricAssessmentHistoryItem } from "@/components/pacientes/geriatric-assessment-history-item";
import { loadGeriatricAssessmentsForPatient } from "@/lib/actions/geriatric-assessments";

export async function GeriatricAssessmentsSection({
  patientId,
  defaultAge,
}: {
  patientId: string;
  defaultAge?: number;
}) {
  const { rows } = await loadGeriatricAssessmentsForPatient(patientId);

  return (
    <div className="space-y-6" aria-label="Avaliações geriátricas">
      <GeriatricAssessmentForm patientId={patientId} defaultAge={defaultAge} />

      <div className="border-t border-border pt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Histórico de avaliações para idosos
        </h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há avaliações geriátricas. Utilize o formulário acima para
            o primeiro registo.
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Histórico de avaliações geriátricas">
            {rows.map((r) => (
              <GeriatricAssessmentHistoryItem key={r.id} row={r} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
