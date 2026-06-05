"use server";

import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadAllPatientsForOwner } from "@/lib/actions/patients";
import { loadTeamMembersForOwner } from "@/lib/actions/team-members";
import type { EstablishmentWithClientNames } from "@/lib/types/establishments";
import type { PatientWithContext } from "@/lib/types/patients";
import type { TeamMemberRow } from "@/lib/types/team-members";

export type VisitScheduleFormData = {
  establishments: EstablishmentWithClientNames[];
  patients: PatientWithContext[];
  teamMembers: TeamMemberRow[];
};

/** Dados do formulário «Agendar visita» — carregados sob demanda para não bloquear a agenda. */
export async function loadVisitScheduleFormDataAction(): Promise<VisitScheduleFormData> {
  const [{ rows: establishments }, { rows: patients }, { rows: teamMembers }] =
    await Promise.all([
      loadEstablishmentsForOwner(),
      loadAllPatientsForOwner(),
      loadTeamMembersForOwner(),
    ]);

  return { establishments, patients, teamMembers };
}
