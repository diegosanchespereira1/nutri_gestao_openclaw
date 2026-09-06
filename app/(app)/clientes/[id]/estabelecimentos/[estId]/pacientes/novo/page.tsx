import { Building2 } from "lucide-react";
import { notFound } from "next/navigation";

import { PatientForm } from "@/components/pacientes/patient-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { loadTeamMembersForSelect } from "@/lib/actions/team-members";
import { loadGradesForClient } from "@/lib/actions/school-grades";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";
import { createClient } from "@/lib/supabase/server";
import type { EstablishmentRow } from "@/lib/types/establishments";

export default async function NovoPacienteEstabelecimentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; estId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id: clientId, estId }, sp] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const teamMembers = await loadTeamMembersForSelect();

  const { data: client } = await supabase
    .from("clients")
    .select("id, kind, legal_name")
    .eq("id", clientId)
    .maybeSingle();

  if (!client || client.kind !== "pj") {
    notFound();
  }

  const { data: est, error } = await supabase
    .from("establishments")
    .select("*")
    .eq("id", estId)
    .maybeSingle();

  if (error || !est || est.client_id !== clientId) {
    notFound();
  }

  const row = est as EstablishmentRow;
  const schoolGrades = await loadGradesForClient(clientId);

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: `/clientes/${clientId}/estabelecimentos/${estId}/pacientes`,
    fallbackLabel: "Pacientes",
    currentPath: `/clientes/${clientId}/estabelecimentos/${estId}/pacientes/novo`,
  });

  return (
    <PageLayout variant="wide" className="px-0.5">
      <PageHeader
        title="Novo paciente"
        description="Cadastre a criança neste estabelecimento. Nome e data de nascimento bastam para começar."
        back={back}
      />

      <div className="border-primary/20 bg-primary/5 flex items-start gap-3 rounded-xl border px-4 py-3">
        <div className="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Building2 className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-primary text-xs font-semibold uppercase tracking-wide">
            A cadastrar em
          </p>
          <p className="text-foreground truncate font-semibold">{row.name}</p>
          <p className="text-muted-foreground truncate text-sm">
            {client.legal_name}
          </p>
        </div>
      </div>

      <PatientForm
        mode="create"
        clientId={clientId}
        establishmentId={estId}
        schoolGrades={schoolGrades}
        teamMembers={teamMembers}
        cancelHref={back.href}
        defaults={{
          full_name: "",
          birth_date: "",
          document_id: "",
          sex: null,
          phone: "",
          email: "",
          notes: "",
          responsible_team_member_id: null,
        }}
      />
    </PageLayout>
  );
}
