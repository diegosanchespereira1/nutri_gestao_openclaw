// Página de upload em massa de matérias-primas — Server Component com guarda
// de autenticação. Mesmo padrão de app/(app)/importar/avaliacoes-infantis/page.tsx.
// Carrega as matérias-primas já cadastradas para a pré-checagem de conflito de
// nome no wizard (etapa de pré-visualização).

import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerContext } from "@/lib/supabase/get-server-user";
import { RawMaterialImportWizard } from "@/components/importar/raw-material-import-wizard";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";

export const metadata = {
  title: "Upload em massa de matérias-primas | NutriGestão",
};

function clientLabel(c: { legal_name: string; trade_name: string | null }): string {
  const t = c.trade_name?.trim();
  return t && t.length > 0 ? t : c.legal_name;
}

export default async function ImportarMateriasPrimasPage() {
  const { supabase, user, workspaceOwnerId } = await getServerContext();
  if (!user || !workspaceOwnerId) redirect("/login");

  const [{ data: rows }, { rows: pjClients }, { rows: establishments }] =
    await Promise.all([
      supabase
        .from("professional_raw_materials")
        .select("id, name, price_unit, unit_price_brl, notes, client_id, establishment_id")
        .eq("owner_user_id", workspaceOwnerId)
        .order("name"),
      loadClientsForOwner({ kind: "pj" }),
      loadEstablishmentsForOwner(),
    ]);

  const existingRawMaterials = (rows ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    price_unit: r.price_unit as "g" | "kg" | "ml" | "l" | "un",
    unit_price_brl: Number(r.unit_price_brl),
    notes: r.notes as string | null,
    client_id: r.client_id as string | null,
    establishment_id: r.establishment_id as string | null,
  }));

  const clientOptions = pjClients.map((c) => ({ id: c.id, label: clientLabel(c) }));
  const establishmentOptions = establishments.map((e) => ({
    id: e.id,
    label: e.name,
    clientId: e.client_id,
  }));

  return (
    <main className="container max-w-4xl space-y-6 py-8">
      <div className="space-y-1">
        <Link
          href="/materias-primas"
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

      <RawMaterialImportWizard
        existingRawMaterials={existingRawMaterials}
        pjClients={clientOptions}
        establishments={establishmentOptions}
      />
    </main>
  );
}
