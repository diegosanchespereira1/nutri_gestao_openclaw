import Link from "next/link";

import { ClientAvatar } from "@/components/clientes/client-avatar";
import { badgeBase } from "@/components/clientes/clientes-list-badges";
import { loadEstablishmentsForOwner } from "@/lib/actions/establishments";
import { getClientLogoSignedUrls } from "@/lib/clientes/logo-sync";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  badgeClassForEstablishmentType,
  labelForEstablishmentType,
} from "@/lib/constants/establishment-types";
import { loadEstablishmentCustomTypesAction } from "@/lib/actions/establishment-custom-types";
import { createClient } from "@/lib/supabase/server";
import { establishmentClientLabel } from "@/lib/utils/establishment-client-label";
import { cn } from "@/lib/utils";

export default async function PopsPage() {
  const [{ rows: establishments }, customTypes] = await Promise.all([
    loadEstablishmentsForOwner(),
    loadEstablishmentCustomTypesAction(),
  ]);

  const supabase = await createClient();
  const clientIds = [...new Set(establishments.map((e) => e.client_id))];
  const logoPathByClientId = new Map<string, string | null>();

  if (clientIds.length > 0) {
    const { data: clientRows } = await supabase
      .from("clients")
      .select("id, logo_storage_path")
      .in("id", clientIds);

    for (const row of clientRows ?? []) {
      logoPathByClientId.set(
        row.id as string,
        (row.logo_storage_path as string | null) ?? null,
      );
    }
  }

  const logoPaths = [...logoPathByClientId.values()].filter(
    (path): path is string => !!path,
  );
  const logoUrlMap = await getClientLogoSignedUrls(supabase, logoPaths);

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
        <div className="border-border overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-border border-b bg-primary/10 dark:bg-primary/15">
              <tr>
                <th className="text-foreground px-4 py-3 text-left font-bold">
                  Estabelecimento
                </th>
                <th className="text-foreground px-4 py-3 text-left font-bold">
                  Tipo
                </th>
                <th className="text-foreground px-4 py-3 text-right font-bold">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {establishments.map((e) => {
                const clientLabel = establishmentClientLabel(e);
                const logoPath = logoPathByClientId.get(e.client_id) ?? null;
                const logoUrl = logoPath
                  ? (logoUrlMap.get(logoPath) ?? null)
                  : null;

                return (
                  <tr
                    key={e.id}
                    className="border-b border-foreground/5 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ClientAvatar
                          name={e.clients.legal_name}
                          imageUrl={logoUrl}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {e.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {clientLabel}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          badgeBase(),
                          "px-1.5 py-0 text-[11px]",
                          badgeClassForEstablishmentType(e.establishment_type),
                        )}
                      >
                        {labelForEstablishmentType(
                          e.establishment_type,
                          customTypes,
                        )}
                      </span>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
