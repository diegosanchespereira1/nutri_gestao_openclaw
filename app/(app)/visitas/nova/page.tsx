import Link from "next/link";

import { VisitScheduleForm } from "@/components/visits/visit-schedule-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadAllPatientsForOwner } from "@/lib/actions/patients";
import { loadTeamMembersForOwner } from "@/lib/actions/team-members";
import { cn } from "@/lib/utils";

const errMessages: Record<string, string> = {
  missing:
    "Preencha o tipo de visita, o destino, a data e a hora.",
  date: "Data ou hora inválida.",
  save: "Não foi possível guardar. Tente novamente.",
  client_inativo:
    "Este cliente está inativo (pausa). Reative o contrato na ficha do cliente para agendar visitas.",
  client_finalizado:
    "Este contrato está finalizado. Reative o contrato na ficha do cliente para agendar novas visitas.",
};

type Props = {
  searchParams: Promise<{ err?: string }>;
};

export default async function NovaVisitaPage({ searchParams }: Props) {
  const { err } = await searchParams;
  const errMsg = err && errMessages[err] ? errMessages[err] : null;

  const [{ rows: establishments }, { rows: patients }, { rows: teamMembers }] =
    await Promise.all([
      loadEstablishmentsForOwner(),
      loadAllPatientsForOwner(),
      loadTeamMembersForOwner(),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/visitas"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 mb-2",
          )}
        >
          ← Visitas
        </Link>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Nova visita
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tipo de visita, destino, profissional da equipe (opcional), data/hora e
          prioridade.
        </p>
      </div>

      {errMsg ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          {errMsg}
        </div>
      ) : null}

      {establishments.length === 0 && patients.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6 text-sm">
          <p className="text-muted-foreground">
            Precisa de pelo menos um estabelecimento (cliente PJ) ou um
            paciente para agendar.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/clientes" className={buttonVariants({ size: "sm" })}>
              Clientes
            </Link>
            <Link href="/pacientes" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Pacientes
            </Link>
          </div>
        </div>
      ) : (
        <VisitScheduleForm
          establishments={establishments}
          patients={patients}
          teamMembers={teamMembers}
        />
      )}
    </div>
  );
}
