import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { ExternalPortalSection } from "@/components/equipe/external-portal-section";
import { loadTeamMembersForOwner } from "@/lib/actions/team-members";
import { loadExternalPortalUsers } from "@/lib/actions/external-portal";
import { teamJobRoleLabel } from "@/lib/constants/team-roles";
import type { TeamJobRole } from "@/lib/types/team-members";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ portalErr?: string; portalOk?: string }>;
}) {
  const { portalErr, portalOk } = await searchParams;
  const [{ rows }, { rows: portalUsers }] = await Promise.all([
    loadTeamMembersForOwner(),
    loadExternalPortalUsers(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Equipe
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl text-sm">
            Membros que pode atribuir a visitas agendadas. O titular da conta
            continua responsável pelos dados no sistema; o CRN é obrigatório
            apenas para perfis na área da nutrição.
          </p>
        </div>
        <Link href="/equipe/nova" className={cn(buttonVariants(), "shrink-0")}>
          Novo membro
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Ainda não há membros. Adicione colegas para os associar ao agendar
            visitas.
          </p>
          <Link href="/equipe/nova" className={cn(buttonVariants(), "mt-4 inline-flex")}>
            Cadastrar primeiro membro
          </Link>
        </div>
      ) : (
        <ul
          className="border-border divide-border divide-y overflow-hidden rounded-lg border bg-white"
          aria-label="Membros da equipe"
        >
          {rows.map((m) => (
            <li key={m.id}>
              <Link
                href={`/equipe/${m.id}/editar`}
                className="hover:bg-muted/50 focus-visible:ring-ring block px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <span className="text-foreground font-medium">{m.full_name}</span>
                <span className="text-muted-foreground mt-1 block text-sm">
                  {teamJobRoleLabel[m.job_role as TeamJobRole] ?? m.job_role}
                  {m.professional_area === "nutrition" && m.crn
                    ? ` · CRN ${m.crn}`
                    : null}
                </span>
                {m.email ? (
                  <span className="text-muted-foreground mt-0.5 block text-xs">
                    {m.email}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Story 9.1 + 9.2 — Acesso externo (portal) */}
      <Separator />
      <section aria-labelledby="portal-externo-heading">
        <h2 id="portal-externo-heading" className="sr-only">
          Acesso externo
        </h2>
        <ExternalPortalSection
          users={portalUsers}
          portalErr={portalErr}
          portalOk={portalOk}
        />
      </section>
    </div>
  );
}
