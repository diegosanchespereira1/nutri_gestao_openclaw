// Página de atualização de preços em massa — Server Component com guarda de
// autenticação. Carrega as matérias-primas atuais do tenant (com ID) para o
// wizard oferecer o download da planilha já preenchida com os dados reais.
// Este fluxo também é o caminho de migração de itens legados (sem cliente):
// a coluna Cliente vem preenchida para itens já escopados e em branco para
// os que ainda precisam ser atribuídos.

import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerContext } from "@/lib/supabase/get-server-user";
import { RawMaterialPriceImportWizard } from "@/components/importar/raw-material-price-import-wizard";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";

export const metadata = {
  title: "Atualização de preços em massa | NutriGestão",
};

function clientLabel(c: { legal_name: string; trade_name: string | null }): string {
  const t = c.trade_name?.trim();
  return t && t.length > 0 ? t : c.legal_name;
}

export default async function AtualizarPrecosMateriasPrimasPage() {
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

  const clientOptions = pjClients.map((c) => ({ id: c.id, label: clientLabel(c) }));
  const establishmentOptions = establishments.map((e) => ({
    id: e.id,
    label: e.name,
    clientId: e.client_id,
  }));
  const clientLabelById = new Map(clientOptions.map((c) => [c.id, c.label]));
  const establishmentLabelById = new Map(establishmentOptions.map((e) => [e.id, e.label]));

  const existingRawMaterials = (rows ?? []).map((r) => {
    const clientId = r.client_id as string | null;
    const establishmentId = r.establishment_id as string | null;
    return {
      id: r.id as string,
      name: r.name as string,
      price_unit: r.price_unit as "g" | "kg" | "ml" | "l" | "un",
      unit_price_brl: Number(r.unit_price_brl),
      notes: r.notes as string | null,
      client_id: clientId,
      client_label: clientId ? (clientLabelById.get(clientId) ?? null) : null,
      establishment_id: establishmentId,
      establishment_label: establishmentId
        ? (establishmentLabelById.get(establishmentId) ?? null)
        : null,
    };
  });

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
          Atualização de preços em massa
        </h1>
        <p className="text-muted-foreground text-sm">
          Baixe a planilha com todas as suas matérias-primas, ajuste os preços e
          reenvie. O casamento é sempre pelo ID de cada item, então a lista nunca
          duplica — mesmo que você renomeie algum produto na planilha. A coluna
          Cliente é obrigatória: para itens já vinculados, serve de conferência
          (nunca move de cliente); para itens ainda sem cliente, define o dono
          definitivo.
        </p>
      </div>

      <RawMaterialPriceImportWizard
        existingRawMaterials={existingRawMaterials}
        pjClients={clientOptions}
        establishments={establishmentOptions}
      />
    </main>
  );
}
