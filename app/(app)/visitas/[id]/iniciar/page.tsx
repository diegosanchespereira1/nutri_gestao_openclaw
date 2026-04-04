import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button-variants";
import { loadScheduledVisitById } from "@/lib/actions/visits";
import { isSameCalendarDay } from "@/lib/datetime/calendar-tz";
import { createClient } from "@/lib/supabase/server";
import { fetchProfileTimeZone } from "@/lib/supabase/profile";
import { visitDisplayTitle } from "@/lib/visits/display-title";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function IniciarVisitaPage({ params }: Props) {
  const { id } = await params;
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

  if (row.status !== "scheduled") {
    redirect(`/visitas/${id}?aviso=visita_nao_agendada`);
  }
  if (!isSameCalendarDay(row.scheduled_start, tz)) {
    redirect(`/visitas/${id}?aviso=inicio_somente_hoje`);
  }

  const title = visitDisplayTitle(row);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/visitas/${id}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 mb-2",
          )}
        >
          ← Detalhe da visita
        </Link>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Iniciar visita
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{title}</p>
      </div>

      <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6">
        <p className="text-foreground text-sm font-medium">
          Execução da visita (checklist, fotos, dossiê)
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          Esta página será preenchida na story 4.2 — fluxo de preenchimento com
          cabeçalho de contexto e checklist aplicável.
        </p>
        <Link
          href={`/visitas/${id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 inline-flex")}
        >
          Voltar ao detalhe
        </Link>
      </div>
    </div>
  );
}
