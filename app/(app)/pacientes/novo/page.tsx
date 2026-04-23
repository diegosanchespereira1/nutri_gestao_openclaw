import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { PatientForm } from "@/components/pacientes/patient-form";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { loadTeamMembersForSelect } from "@/lib/actions/team-members";
import type { ClientRow } from "@/lib/types/clients";

export default async function NovoPacientePage() {
  const [{ rows: clientRows }, teamMembers] = await Promise.all([
    loadClientsForOwner({ kind: "pj" }),
    loadTeamMembersForSelect(),
  ]);

  const clients: Pick<ClientRow, "id" | "legal_name" | "trade_name">[] =
    clientRows.map((c) => ({
      id: c.id,
      legal_name: c.legal_name,
      trade_name: c.trade_name,
    }));

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Novo paciente"
        description="Pessoa física. A associação a cliente ou estabelecimento é opcional — pode ser feita depois."
        back={{ href: "/pacientes", label: "Pacientes" }}
      />
      <PatientForm
        mode="create"
        clients={clients}
        teamMembers={teamMembers}
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
