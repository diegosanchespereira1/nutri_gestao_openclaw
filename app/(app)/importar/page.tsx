// Story 2.6: Página de importação CSV/Excel — Server Component com guarda de autenticação.

import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { getServerContext } from "@/lib/supabase/get-server-user";
import { ImportWizard } from "@/components/importar/import-wizard";

export const metadata = {
  title: "Importar dados | NutriGestão",
};

export default async function ImportarPage() {
  const { user } = await getServerContext();
  if (!user) redirect("/login");

  return (
    <main className="container max-w-4xl space-y-6 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Importar dados</h1>
        <p className="text-muted-foreground text-sm">
          Migre sua base de clientes, estabelecimentos ou pacientes a partir de
          um arquivo CSV ou Excel.
        </p>
      </div>

      <Link
        href="/importar/avaliacoes-infantis"
        className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-muted/30 p-4 text-sm transition-colors hover:border-foreground/20 hover:bg-muted/50"
      >
        <ClipboardList className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span>
          <span className="font-medium">Importar avaliações infantis (peso/altura em massa)</span>
          <span className="text-muted-foreground block text-xs mt-0.5">
            Para pesagens de turma — cria o cadastro do paciente e a avaliação nutricional
            juntos, com percentis recalculados automaticamente.
          </span>
        </span>
      </Link>

      <ImportWizard />
    </main>
  );
}
