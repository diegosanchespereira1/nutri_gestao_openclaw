import dynamic from "next/dynamic";

const RecipeForm = dynamic(
  () =>
    import("@/components/technical-sheets/recipe-form").then(
      (mod) => mod.RecipeForm,
    ),
  { loading: () => null },
);
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadRawMaterialsForOwner } from "@/lib/actions/raw-materials";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";

export default async function NovaReceitaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [sp, { rows: establishments }, { rows: rawMaterials }, { rows: pjClients }] =
    await Promise.all([
      searchParams,
      loadEstablishmentsForOwner(),
      loadRawMaterialsForOwner(),
      loadClientsForOwner({ kind: "pj" }),
    ]);

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/ficha-tecnica",
    fallbackLabel: "Ficha técnica",
    currentPath: "/ficha-tecnica/nova",
  });

  return (
    <PageLayout>
      <PageHeader
        title="Nova receita"
        description="Ingredientes com quantidade e unidade. Salve o rascunho e valide os totais no painel ao lado. Pode utilizar um template antes de editar."
        back={back}
      />
      <RecipeForm
        establishments={establishments}
        pjClients={pjClients}
        rawMaterials={rawMaterials}
      />
    </PageLayout>
  );
}
