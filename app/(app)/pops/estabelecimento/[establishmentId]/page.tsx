import Link from "next/link";
import { notFound } from "next/navigation";

import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { loadPopsForEstablishmentAction } from "@/lib/actions/pops";
import { PopRowActions } from "@/components/pops/pop-row-actions";
import { buttonVariants } from "@/components/ui/button-variants";
import { establishmentTypeLabel } from "@/lib/constants/establishment-types";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import { cn } from "@/lib/utils";

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type Props = { params: Promise<{ establishmentId: string }> };

export default async function PopsPorEstabelecimentoPage({ params }: Props) {
  const { establishmentId } = await params;
  const { rows: establishments } = await loadEstablishmentsForOwner();
  const est = establishments.find((e) => e.id === establishmentId);
  if (!est) notFound();

  const { rows: pops } = await loadPopsForEstablishmentAction(establishmentId);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/pops"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 mb-2",
          )}
        >
          ← POPs
        </Link>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          POPs — {est.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {establishmentClientLabel(est)} ·{" "}
          {establishmentTypeLabel[est.establishment_type]}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/pops/estabelecimento/${establishmentId}/novo`}
          className={buttonVariants()}
        >
          Novo POP
        </Link>
        <Link
          href="/pops/modelos"
          className={buttonVariants({ variant: "outline" })}
        >
          Ver modelos
        </Link>
      </div>

      {pops.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Ainda não há POPs neste estabelecimento.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-muted/50 border-b border-foreground/10">
              <tr>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Versão</th>
                <th className="px-4 py-3 font-medium">Atualizado</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pops.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-foreground/5 last:border-0"
                >
                  <td className="text-foreground px-4 py-3 font-medium">
                    {p.title}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 tabular-nums">
                    v{p.latest_version_number}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                    {formatUpdatedAt(p.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PopRowActions popId={p.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
