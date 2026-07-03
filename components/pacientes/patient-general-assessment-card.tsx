import { ClipboardList } from "lucide-react";

import { GeneralNutritionAssessmentContent } from "@/components/pacientes/general-nutrition-assessment-content";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PatientGeneralAssessmentCard({
  patientId,
}: {
  patientId: string;
}) {
  return (
    <Card id="avaliacao-geral">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-foreground/70">
          <ClipboardList className="size-3.5" aria-hidden />
          Informações complementares
        </CardTitle>
        <CardDescription>
          Antropometria, hábitos alimentares, notas clínicas e objetivos do
          plano. Cada registro fica datado no histórico.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <GeneralNutritionAssessmentContent patientId={patientId} />
      </CardContent>
    </Card>
  );
}
