// Página de atualização de preços em massa — Server Component com guarda de
// autenticação. Carrega as matérias-primas atuais do tenant (com ID) para o
// wizard oferecer o download da planilha já preenchida com os dados reais.

import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerContext } from "@/lib/supabase/get-server-user";
import { RawMaterialPriceImportWizard } from "@/components/importar/raw-material-price-import-wizard";

export const metadata = {
  title: "Atualização de preços em massa | NutriGestão",
};

export default async function AtualizarPrecosMateriasPrimasPage() {
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
          Atualização de preços em massa
        </h1>
        <p className="text-muted-foreground text-sm">
          Baixe a planilha com todas as suas matérias-primas, ajuste os preços e
          reenvie. O casamento é sempre pelo ID de cada item, então a lista nunca
          duplica — mesmo que você renomeie algum produto na planilha.
        </p>
      </div>

      <RawMaterialPriceImportWizard existingRawMaterials={existingRawMaterials} />
    </main>
  );
}
