import { redirect } from "next/navigation";

import { buildCurrentUrl } from "@/lib/navigation/return-to";

/** Rota legada — o dashboard de indicadores passou a ser a página do paciente. */
export default async function PatientHealthIndicatorsRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  redirect(buildCurrentUrl(`/pacientes/${id}`, sp));
}
