import Link from "next/link";
import { UserCog } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { ExternalPortalSection } from "@/components/equipe/external-portal-section";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { Separator } from "@/components/ui/separator";
import {
  loadResponsiblePortfolioByMemberId,
  loadTeamMembersForOwner,
} from "@/lib/actions/team-members";
import { loadExternalPortalUsers } from "@/lib/actions/external-portal";
import { teamJobRoleLabel } from "@/lib/constants/team-roles";
import type { TeamJobRole } from "@/lib/types/team-members";
import { cn } from "@/lib/utils";

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ portalErr?: string; portalOk?: string }>;
}) {
  const { portalErr, portalOk } = await searchParams;
  const [{ rows }, { rows: portalUsers }, portfolioByMember] =
    await Promise.all([
      loadTeamMembersForOwner(),
      loadExternalPortalUsers(),
      loadResponsiblePortfolioByMemberId(),
    ]);

  return (
    <PageLayout>
      <PageHeader
        title="Equipe"
        description="Membros que pode atribuir a visitas agendadas. O CRN é obrigatório apenas para perfis na área da nutrição."
        actions={
          <Link href="/equipe/nova" className={cn(buttonVariants(), "shrink-0")}>
            Novo membro
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Nenhum membro ainda"
          description="Adicione colegas para os associar ao agendar visitas."
          action={
            <Link href="/equipe/nova" className={cn(buttonVariants())}>
              Cadastrar primeiro membro
            </Link>
          }
        />
      ) : (
        <ul
          className="border-border divide-border divide-y overflow-hidden rounded-lg border bg-card shadow-sm"
          aria-label="Membros da equipe"
        >
          {rows.map((m) => (
            <li key={m.id}>
              <Link
                href={`/equipe/${m.id}/editar`}
                className="hover:bg-muted/50 focus-visible:ring-ring flex items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {/* Avatar inicial */}
                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase">
                  {m.full_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-foreground block font-medium leading-snug">
                    {m.full_name}
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    {teamJobRoleLabel[m.job_role as TeamJobRole] ?? m.job_role}
                    {m.professional_area === "nutrition" && m.crn
                      ? ` · CRN ${m.crn}`
                      : null}
                  </span>
                  {m.email ? (
                    <span className="text-muted-foreground block text-xs">
                      {m.email}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 ? (
        <section
          aria-labelledby="carteira-responsavel-heading"
          className="space-y-4"
        >
          <h2
            id="carteira-responsavel-heading"
            className="text-foreground text-lg font-semibold"
          >
            Carteira por profissional responsável
          </h2>
          <p className="text-muted-foreground text-sm">
            Clientes e pacientes em que cada membro está definido como
            profissional responsável pelo atendimento (opcional nas fichas).
          </p>
          <ul className="space-y-3">
            {rows.map((m) => {
              const p = portfolioByMember[m.id] ?? {
                clients: [],
                patients: [],
              };
              const nClientes = p.clients.length;
              const nPacientes = p.patients.length;
              const empty = nClientes === 0 && nPacientes === 0;
              return (
                <li
                  key={`portfolio-${m.id}`}
                  className="border-border rounded-lg border bg-card px-4 py-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{m.full_name}</span>
                    <Link
                      href={`/equipe/${m.id}/editar`}
                      className="text-muted-foreground hover:text-foreground text-xs underline"
                    >
                      Editar membro
                    </Link>
                  </div>
                  {empty ? (
                    <p className="text-muted-foreground mt-2 text-sm">
                      Nenhum cliente ou paciente atribuído como responsável.
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                          Clientes ({nClientes})
                        </p>
                        {nClientes === 0 ? (
                          <p className="text-muted-foreground text-sm">—</p>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {p.clients.map((c) => (
                              <li key={c.id}>
                                <Link
                                  href={`/clientes/${c.id}/editar`}
                                  className="text-primary hover:underline"
                                >
                                  {c.legal_name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                          Pacientes ({nPacientes})
                        </p>
                        {nPacientes === 0 ? (
                          <p className="text-muted-foreground text-sm">—</p>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {p.patients.map((pt) => (
                              <li key={pt.id}>
                                <Link
                                  href={`/pacientes/${pt.id}/editar`}
                                  className="text-primary hover:underline"
                                >
                                  {pt.full_name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

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
    </PageLayout>
  );
}
