import { RawMaterialForm } from "@/components/technical-sheets/raw-material-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import {
  getReturnToParam,
  resolveBackNavigation,
} from "@/lib/navigation/return-to";

const errMessages: Record<string, string> = {
  invalid: "Verifique nome e preço (maior que zero).",
  save: "Não foi possível salvar. Tente novamente.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NovaMateriaPrimaPage({ searchParams }: Props) {
  const sp = await searchParams;
  const err = typeof sp.err === "string" ? sp.err : undefined;
  const errMsg = err && errMessages[err] ? errMessages[err] : null;

  const [{ rows: pjClients }, { rows: establishments }] = await Promise.all([
    loadClientsForOwner({ kind: "pj" }),
    loadEstablishmentsForOwner(),
  ]);

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/materias-primas",
    fallbackLabel: "Matérias-primas",
    currentPath: "/materias-primas/nova",
  });

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Nova matéria-prima"
        back={back}
      />

      {errMsg ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          {errMsg}
        </div>
      ) : null}

      <RawMaterialForm pjClients={pjClients} establishments={establishments} />
    </PageLayout>
  );
}
