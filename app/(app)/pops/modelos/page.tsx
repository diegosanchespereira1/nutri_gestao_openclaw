import Link from "next/link";

import { loadPopTemplatesAction } from "@/lib/actions/pop-templates";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  ESTABLISHMENT_TYPES,
  establishmentTypeLabel,
} from "@/lib/constants/establishment-types";
import type { EstablishmentType } from "@/lib/types/establishments";
import { cn } from "@/lib/utils";

export default async function PopsModelosPage() {
  const { rows } = await loadPopTemplatesAction();

  const byType = new Map<EstablishmentType, typeof rows>();
  for (const t of ESTABLISHMENT_TYPES) {
    byType.set(
      t,
      rows.filter((r) => r.establishment_type === t),
    );
  }

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
          Modelos de POP
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Modelos iniciais por tipo de estabelecimento. Para criar um POP a
          partir de um modelo, escolha o estabelecimento em «Novo POP» (o tipo
          tem de coincidir).
        </p>
      </div>

      <div className="space-y-10">
        {ESTABLISHMENT_TYPES.map((type) => {
          const list = byType.get(type) ?? [];
          return (
            <section key={type} className="space-y-3">
              <h2 className="text-foreground border-border border-b pb-2 text-lg font-semibold">
                {establishmentTypeLabel[type]}
              </h2>
              {list.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Sem modelos nesta categoria.
                </p>
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {list.map((t) => (
                    <li
                      key={t.id}
                      className="bg-card ring-foreground/10 rounded-xl p-4 ring-1"
                    >
                      <p className="text-foreground font-medium">{t.name}</p>
                      {t.description ? (
                        <p className="text-muted-foreground mt-1 text-sm">
                          {t.description}
                        </p>
                      ) : null}
                      <p className="text-muted-foreground mt-3 max-h-32 overflow-y-auto whitespace-pre-wrap text-xs">
                        {t.body.slice(0, 400)}
                        {t.body.length > 400 ? "…" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
