import { notFound } from "next/navigation";

import { TeamMemberForm } from "@/components/team/team-member-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteTeamMemberAction, loadTeamMemberById } from "@/lib/actions/team-members";

const errMessages: Record<string, string> = {
  missing: "Preencha nome, área e cargo.",
  crn: "Na área da nutrição, o CRN é obrigatório.",
  save: "Não foi possível salvar. Tente novamente.",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string }>;
};

export default async function EditarEquipePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { err } = await searchParams;
  const { row } = await loadTeamMemberById(id);
  if (!row) notFound();

  const errMsg = err && errMessages[err] ? errMessages[err] : null;

  return (
    <PageLayout variant="form">
      <PageHeader
        title={row.full_name}
        description="Dados profissionais e área de atuação do membro da equipe."
        back={{ href: "/equipe", label: "Equipe" }}
      />

      {errMsg ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {errMsg}
        </div>
      ) : null}

      {/* ── Seção 1: Dados do membro ────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base">Dados do membro</CardTitle>
          <CardDescription>
            Nome, contacto, área profissional e cargo na equipe.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <TeamMemberForm mode="edit" initial={row} />
        </CardContent>
      </Card>

      {/* ── Seção 2: Zona de perigo ─────────────────────────── */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
        <h2 className="text-sm font-semibold text-destructive">
          Zona de perigo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Remover este membro desvincula-o de visitas futuras (campo de
          responsável fica vazio).
        </p>
        <form action={deleteTeamMemberAction} className="mt-4">
          <input type="hidden" name="id" value={row.id} />
          <Button type="submit" variant="destructive" size="sm">
            Remover membro
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}
