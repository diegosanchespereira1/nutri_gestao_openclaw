import { TeamMemberForm } from "@/components/team/team-member-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";

const errMessages: Record<string, string> = {
  missing: "Preencha nome, área e cargo.",
  crn: "Na área da nutrição, o CRN é obrigatório.",
  save: "Não foi possível guardar. Tente novamente.",
};

type Props = {
  searchParams: Promise<{ err?: string }>;
};

export default async function NovaEquipePage({ searchParams }: Props) {
  const { err } = await searchParams;
  const errMsg = err && errMessages[err] ? errMessages[err] : null;

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Novo membro da equipe"
        description="Adicione colegas para os associar a visitas agendadas."
        back={{ href: "/equipe", label: "Equipe" }}
      />

      {errMsg ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          {errMsg}
        </div>
      ) : null}

      <TeamMemberForm mode="create" />
    </PageLayout>
  );
}
