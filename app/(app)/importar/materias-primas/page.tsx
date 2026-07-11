// Página de upload em massa de matérias-primas — Server Component com guarda
// de autenticação. Mesmo padrão de app/(app)/importar/avaliacoes-infantis/page.tsx.
// Carrega as matérias-primas já cadastradas para a pré-checagem de conflito de
// nome no wizard (etapa de pré-visualização).

import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerContext } from "@/lib/supabase/get-server-user";
import { RawMaterialImportWizard } from "@/components/importar/raw-material-import-wizard";

export const metadata = {
  title: "Upload em massa de matérias-primas | NutriGestão",
};

export default async function ImportarMateriasPrimasPage() {
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) redirect("/login");

  const { data: rows } = await supabase
    .from("professional_raw_materials")
    .select("id, name, price_unit, unit_price_brl, notes")
    .eq("owner_user_id", workspaceOwnerId)
    .order("name");

  const existingRawMaterials = (rows ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    price_unit: r.price_unit as "g" | "kg" | "ml" | "l" | "un",
    unit_price_brl: Number(r.unit_price_brl),
    notes: r.notes as string | null,
  }));

  return (
    <main className="container max-w-4xl space-y-6 py-8">
      <div className="space-y-1">
        <Link
          href="/ficha-tecnica/materias-primas"
          className="text-muted-foreground text-xs hover:underline"
        >
          ← Matérias-primas
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Upload em massa de matérias-primas
        </h1>
        <p className="text-muted-foreground text-sm">
          Cadastre várias matérias-primas de uma vez a partir de um arquivo CSV ou
          Excel — se o nome já existir, você decide se sobrescreve, cria um novo ou
          ignora a linha.
        </p>
      </div>

      <RawMaterialImportWizard existingRawMaterials={existingRawMaterials} />
    </main>
  );
}
