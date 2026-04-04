import Link from "next/link";

import { TeamMemberForm } from "@/components/team/team-member-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

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
    <div className="space-y-6">
      <div>
        <Link
          href="/equipe"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 mb-2",
          )}
        >
          ← Equipe
        </Link>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Novo membro da equipe
        </h1>
      </div>

      {errMsg ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          {errMsg}
        </div>
      ) : null}

      <TeamMemberForm mode="create" />
    </div>
  );
}
