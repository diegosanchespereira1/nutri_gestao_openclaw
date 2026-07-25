import { redirect } from "next/navigation";

import { buildCurrentUrl } from "@/lib/navigation/return-to";

/** Rota legada — o prontuário foi unificado na página do paciente. */
export default async function ProntuarioPacienteRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const nextSp = { ...sp };
  // Sem tab explícita, abre dados (comportamento anterior da tela de prontuário).
  if (nextSp.tab == null) nextSp.tab = "dados";
  redirect(buildCurrentUrl(`/pacientes/${id}`, nextSp));
}
