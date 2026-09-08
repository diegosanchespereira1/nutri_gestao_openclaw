import { notFound, redirect } from "next/navigation";

import { SchoolNutritionOverviewView } from "@/components/clientes/school-nutrition-overview-view";
import { PageLayout } from "@/components/layout/page-layout";
import { loadSchoolNutritionOverview } from "@/lib/actions/school-nutrition-overview";

export default async function SchoolNutritionOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ serie?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const result = await loadSchoolNutritionOverview(id, sp.serie);

  if (!result.ok && result.reason === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(`/clientes/${id}/visao-nutricional`)}`);
  }
  if (!result.ok && result.reason === "not_school") {
    redirect(`/clientes/${id}/editar`);
  }
  if (!result.ok) notFound();

  return (
    <PageLayout variant="wide">
      <SchoolNutritionOverviewView
        clientId={result.clientId}
        clientName={result.clientName}
        patientsHref={result.patientsHref}
        overview={result.overview}
      />
    </PageLayout>
  );
}
