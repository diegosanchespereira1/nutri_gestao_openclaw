import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button-variants";
import { loadScheduledVisitById } from "@/lib/actions/visits";
import {
  formatDateTimeShort,
  isSameCalendarDay,
} from "@/lib/datetime/calendar-tz";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import { visitPriorityLabel } from "@/lib/constants/visit-priorities";
import { visitStatusLabel } from "@/lib/constants/visit-status";
import { visitKindLabel } from "@/lib/constants/visit-kinds";
import { teamJobRoleLabel } from "@/lib/constants/team-roles";
import type { TeamJobRole } from "@/lib/types/team-members";
import type { VisitKind } from "@/lib/types/visits";
import { visitDisplayTitle } from "@/lib/visits/display-title";
import { cn } from "@/lib/utils";

const avisoMessages: Record<string, string> = {
  visita_nao_agendada:
    "Só é possível iniciar visitas com estado «Agendada».",
  inicio_somente_hoje:
    "«Iniciar visita» só está disponível no dia da visita (no seu fuso horário).",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
};

export default async function VisitaDetalhePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { aviso } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const [{ row }, tz] = await Promise.all([
    loadScheduledVisitById(id),
    fetchProfileTimeZone(supabase, user.id),
  ]);
  if (!row) notFound();

  const title = visitDisplayTitle(row);
  const avisoMsg =
    aviso && avisoMessages[aviso] ? avisoMessages[aviso] : null;

  const destinoHref =
    row.target_type === "establishment" &&
    row.establishment_id &&
    row.establishments?.client_id
      ? `/clientes/${row.establishments.client_id}/estabelecimentos/${row.establishment_id}/editar`
      : row.target_type === "patient" && row.patient_id
        ? `/pacientes/${row.patient_id}/editar`
        : null;

  const canStartToday =
    row.status === "scheduled" &&
    isSameCalendarDay(row.scheduled_start, tz);

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
          {title}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {formatDateTimeShort(row.scheduled_start, tz)} ·{" "}
          {visitPriorityLabel[row.priority]} · {visitStatusLabel[row.status]}
        </p>
      </div>

      {avisoMsg ? (
        <div
          role="status"
          className="border-border bg-muted/40 rounded-lg border px-4 py-3 text-sm"
        >
          {avisoMsg}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canStartToday ? (
          <Link
            href={`/visitas/${id}/iniciar`}
            className={cn(
              buttonVariants({ size: "sm" }),
              "min-h-11 min-w-[44px] items-center justify-center px-4",
            )}
          >
            Iniciar visita
          </Link>
        ) : null}
      </div>

      {destinoHref ? (
        <p className="text-sm">
          <Link href={destinoHref} className="text-primary underline-offset-4 hover:underline">
            {row.target_type === "establishment"
              ? "Abrir estabelecimento"
              : "Ficha do paciente"}
          </Link>
        </p>
      ) : null}

      <dl className="text-muted-foreground space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="text-foreground/80 w-32 shrink-0 font-medium">
            Tipo de visita
          </dt>
          <dd>
            {visitKindLabel[(row.visit_kind ?? "other") as VisitKind]}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-foreground/80 w-32 shrink-0 font-medium">
            Profissional
          </dt>
          <dd>
            {row.team_members
              ? `${row.team_members.full_name} (${teamJobRoleLabel[row.team_members.job_role as TeamJobRole] ?? row.team_members.job_role})`
              : "Titular da conta"}
            {row.team_members ? null : (
              <>
                {" "}
                ·{" "}
                <Link
                  href="/equipe"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Gerir equipe
                </Link>
              </>
            )}
          </dd>
        </div>
      </dl>

      {row.notes ? (
        <section aria-labelledby="visita-notas">
          <h2
            id="visita-notas"
            className="text-foreground mb-2 text-sm font-medium"
          >
            Notas
          </h2>
          <p className="text-muted-foreground whitespace-pre-wrap text-sm">
            {row.notes}
          </p>
        </section>
      ) : null}
    </div>
  );
}
