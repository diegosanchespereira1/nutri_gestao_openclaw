import Link from "next/link";
import { notFound } from "next/navigation";

import { TeamMemberForm } from "@/components/team/team-member-form";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { deleteTeamMemberAction, loadTeamMemberById } from "@/lib/actions/team-members";
import { cn } from "@/lib/utils";

const errMessages: Record<string, string> = {
  missing: "Preencha nome, área e cargo.",
  crn: "Na área da nutrição, o CRN é obrigatório.",
  save: "Não foi possível guardar. Tente novamente.",
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
          Editar membro
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{row.full_name}</p>
      </div>

      {errMsg ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          {errMsg}
        </div>
      ) : null}

      <TeamMemberForm mode="edit" initial={row} />

      <div className="border-border max-w-lg border-t pt-6">
        <h2 className="text-foreground text-sm font-medium">Remover membro</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Visitas futuras com este profissional ficam sem atribuição (campo
          limpo).
        </p>
        <form action={deleteTeamMemberAction} className="mt-3">
          <input type="hidden" name="id" value={row.id} />
          <Button type="submit" variant="destructive" size="sm">
            Eliminar
          </Button>
        </form>
      </div>
    </div>
  );
}
