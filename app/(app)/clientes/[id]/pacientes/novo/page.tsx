import Link from "next/link";
import { notFound } from "next/navigation";

import { PatientForm } from "@/components/pacientes/patient-form";
import { loadTeamMembersForSelect } from "@/lib/actions/team-members";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

export default async function NovoPacienteClientePfPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id: clientId }, sp] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const teamMembers = await loadTeamMembersForSelect();
  const { data: client } = await supabase
    .from("clients")
    .select("id, kind, legal_name")
    .eq("id", clientId)
    .maybeSingle();

  if (!client || client.kind !== "pf") {
    notFound();
  }

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: `/clientes/${clientId}/editar`,
    fallbackLabel: client.legal_name,
    currentPath: `/clientes/${clientId}/pacientes/novo`,
  });

  return (
    <div className="space-y-6">
      <Link
        href={back.href}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "text-muted-foreground hover:text-foreground -ml-2 h-auto px-2 py-1",
        )}
      >
        ← {back.label}
      </Link>
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Novo paciente
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cliente particular:{" "}
          <span className="text-foreground">{client.legal_name}</span>
        </p>
      </div>
      <PatientForm
        mode="create"
        clientId={clientId}
        establishmentId={null}
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
    </div>
  );
}
