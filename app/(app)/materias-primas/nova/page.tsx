import { RawMaterialForm } from "@/components/technical-sheets/raw-material-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import { loadClientsForOwner } from "@/lib/actions/clients";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";

const errMessages: Record<string, string> = {
  invalid: "Verifique nome e preço (maior que zero).",
  save: "Não foi possível salvar. Tente novamente.",
};

type Props = {
  searchParams: Promise<{ err?: string }>;
};

export default async function NovaMateriaPrimaPage({ searchParams }: Props) {
  const { err } = await searchParams;
  const errMsg = err && errMessages[err] ? errMessages[err] : null;

  const [{ rows: pjClients }, { rows: establishments }] = await Promise.all([
    loadClientsForOwner({ kind: "pj" }),
    loadEstablishmentsForOwner(),
  ]);

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Nova matéria-prima"
        back={{ href: "/materias-primas", label: "Matérias-primas" }}
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
