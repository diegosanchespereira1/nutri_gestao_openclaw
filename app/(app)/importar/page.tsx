// Story 2.6: Página de importação CSV/Excel — Server Component com guarda de autenticação.

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ImportWizard } from "@/components/importar/import-wizard";

export const metadata = {
  title: "Importar dados | NutriGestão",
};

export default async function ImportarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

      <ImportWizard />
    </main>
  );
}
