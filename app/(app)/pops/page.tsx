import Link from "next/link";

import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { buttonVariants } from "@/components/ui/button-variants";
import { establishmentTypeLabel } from "@/lib/constants/establishment-types";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import { cn } from "@/lib/utils";

export default async function PopsPage() {
  const { rows: establishments } = await loadEstablishmentsForOwner();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          POPs
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Procedimentos operacionais padronizados por estabelecimento. Comece
          por um modelo alinhado ao tipo de unidade ou crie um documento em
          branco.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/pops/modelos" className={buttonVariants({ variant: "outline" })}>
          Ver todos os modelos
        </Link>
      </div>

      {establishments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Precisa de estabelecimentos (clientes PJ) para associar POPs.{" "}
          <Link href="/clientes" className="text-primary underline">
            Clientes
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-muted/50 border-b border-foreground/10">
              <tr>
                <th className="px-4 py-3 font-medium">Estabelecimento</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {establishments.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-foreground/5 last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="text-foreground font-medium">{e.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {establishmentClientLabel(e)}
                    </p>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {establishmentTypeLabel[e.establishment_type]}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/pops/estabelecimento/${e.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        POPs
                      </Link>
                      <Link
                        href={`/pops/estabelecimento/${e.id}/novo`}
                        className={cn(buttonVariants({ size: "sm" }))}
                      >
                        Novo POP
                      </Link>
                    </div>
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
