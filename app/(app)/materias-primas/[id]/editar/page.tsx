import { notFound } from "next/navigation";

import { RawMaterialForm } from "@/components/technical-sheets/raw-material-form";
import { RawMaterialChangeHistorySection } from "@/components/technical-sheets/raw-material-change-history-section";
import { loadRawMaterialById } from "@/lib/actions/raw-materials";
import { loadRawMaterialChangeHistory } from "@/lib/actions/raw-material-history";
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
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditarMateriaPrimaPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const err = typeof sp.err === "string" ? sp.err : undefined;
  const { row } = await loadRawMaterialById(id);
  if (!row) notFound();

  const errMsg = err && errMessages[err] ? errMessages[err] : null;
  const [changeHistory, { rows: pjClients }, { rows: establishments }] =
    await Promise.all([
      loadRawMaterialChangeHistory(id),
      loadClientsForOwner({ kind: "pj" }),
      loadEstablishmentsForOwner(),
    ]);

  const back = resolveBackNavigation({
    returnTo: getReturnToParam(sp),
    fallbackHref: "/materias-primas",
    fallbackLabel: "Matérias-primas",
    currentPath: `/materias-primas/${id}/editar`,
  });

  return (
    <PageLayout variant="form">
      <PageHeader
        title="Editar matéria-prima"
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

      <RawMaterialForm
        material={row}
        pjClients={pjClients}
        establishments={establishments}
      />

      <RawMaterialChangeHistorySection events={changeHistory} />
    </PageLayout>
  );
}
