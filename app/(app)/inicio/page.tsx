import Link from "next/link";
import { redirect } from "next/navigation";

import { VisitAgendaBlock } from "@/components/visits/visit-agenda-block";
import { buttonVariants } from "@/components/ui/button-variants";
import { loadScheduledVisitsForOwner } from "@/lib/actions/visits";
import { isSameCalendarDay } from "@/lib/datetime/calendar-tz";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import { cn } from "@/lib/utils";

export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const [{ rows }, tz] = await Promise.all([
    loadScheduledVisitsForOwner(),
    fetchProfileTimeZone(supabase, user.id),
  ]);
  const today = rows.filter(
    (v) =>
      v.status === "scheduled" &&
      isSameCalendarDay(v.scheduled_start, tz),
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Início
        </h1>
        <p className="text-muted-foreground text-sm">
          Área autenticada: navegação lateral (desktop), menu em folha
          (telemóvel), perfil com CRN e segurança/2FA em Definições.
        </p>
      </div>

      <section aria-labelledby="agenda-dia-heading">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="agenda-dia-heading"
            className="text-foreground text-lg font-semibold"
          >
            Agenda do dia
          </h2>
          <Link
            href="/visitas"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-full justify-center sm:w-auto",
            )}
          >
            Ver todas as visitas
          </Link>
        </div>
        {today.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sem visitas agendadas para hoje.
          </p>
        ) : (
          <ul className="space-y-3" aria-label="Visitas de hoje">
            {today.map((v) => (
              <li key={v.id}>
                <VisitAgendaBlock visit={v} timeZone={tz} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
