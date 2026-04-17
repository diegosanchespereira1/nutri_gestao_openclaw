import { TeamMemberForm } from "@/components/team/team-member-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";

const errMessages: Record<string, string> = {
  missing:
    "Preencha nome, email, senha, confirmação, área profissional e perfil/cargo.",
  password_mismatch: "As senhas não coincidem.",
  password_policy:
    "Senha fraca: use no mínimo 6 caracteres e pelo menos 1 caractere especial.",
  email_invalid: "Informe um email válido para criar a conta do membro.",
  email_exists:
    "Já existe uma conta com este email. Use outro email ou peça ao membro para entrar com a conta existente.",
  auth_create:
    "Não foi possível criar a conta de acesso do membro. Verifique os dados e tente novamente.",
  crn: "Na área da nutrição, o CRN é obrigatório.",
  save: "Não foi possível salvar. Tente novamente.",
};

type Props = {
  searchParams: Promise<{ err?: string; detail?: string }>;
};

export default async function NovaEquipePage({ searchParams }: Props) {
  const { err, detail } = await searchParams;
  const errMsg = err && errMessages[err] ? errMessages[err] : null;
  const detailMsg = detail?.trim() ?? null;

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Novo membro da equipe"
        description="Use os mesmos dados do cadastro normal e o vínculo com a sua equipe será criado automaticamente."
        back={{ href: "/equipe", label: "Equipe" }}
      />

      {errMsg ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          {errMsg}
          {detailMsg ? (
            <p className="mt-1 text-xs opacity-90">
              Detalhe técnico: {detailMsg}
            </p>
          ) : null}
        </div>
      ) : null}

      <TeamMemberForm mode="create" />
    </PageLayout>
  );
}
