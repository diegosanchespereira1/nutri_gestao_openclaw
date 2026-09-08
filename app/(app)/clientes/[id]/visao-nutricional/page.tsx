import { notFound, redirect } from "next/navigation";

import { SchoolNutritionOverviewView } from "@/components/clientes/school-nutrition-overview-view";
import { PageLayout } from "@/components/layout/page-layout";
import { loadSchoolNutritionOverview } from "@/lib/actions/school-nutrition-overview";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";

export default async function SchoolNutritionOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const serie = typeof sp.serie === "string" ? sp.serie : undefined;
  const result = await loadSchoolNutritionOverview(id, serie);

  if (!result.ok && result.reason === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(`/clientes/${id}/visao-nutricional`)}`);
  }
  if (!result.ok && result.reason === "not_school") {
    redirect(`/clientes/${id}/editar`);
  }
  if (!result.ok) notFound();

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: `/clientes/${result.clientId}/editar`,
    fallbackLabel: result.clientName,
    currentPath: `/clientes/${result.clientId}/visao-nutricional`,
  });

  return (
    <PageLayout variant="wide">
      <SchoolNutritionOverviewView
        clientId={result.clientId}
        clientName={result.clientName}
        patientsHref={result.patientsHref}
        overview={result.overview}
        back={back}
      />
    </PageLayout>
  );
}
