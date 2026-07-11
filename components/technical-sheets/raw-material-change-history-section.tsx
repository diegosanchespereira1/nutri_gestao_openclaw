import { History } from "lucide-react";

import {
  RAW_MATERIAL_CHANGE_SOURCE_LABELS,
  formatRawMaterialChangeDate,
} from "@/lib/raw-materials/change-history";
import type { RawMaterialChangeEvent } from "@/lib/types/raw-material-history";

export function RawMaterialChangeHistorySection({
  events,
}: {
  events: RawMaterialChangeEvent[];
}) {
  return (
    <section className="max-w-lg space-y-3" aria-labelledby="raw-material-history-heading">
      <div>
        <h2
          id="raw-material-history-heading"
          className="text-foreground flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <History className="text-muted-foreground size-4" aria-hidden />
          Histórico de alterações
        </h2>
        <p className="text-muted-foreground text-sm">
          Alterações de preço, nome, unidade e observações deste item — manuais e
          por upload em massa.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Ainda não há alterações registradas para este item.
        </p>
      ) : (
        <ol
          className="border-border relative space-y-0 border-s-2 ps-6"
          aria-label="Linha do tempo de alterações"
        >
          {events.map((ev) => (
            <li key={ev.id} className="relative pb-6 last:pb-0">
              <span
                className="bg-primary absolute -start-[5px] mt-1.5 size-2 rounded-full"
                aria-hidden
              />
              <div className="border-border rounded-lg border bg-card/30 px-4 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <time
                    className="text-foreground text-sm font-medium"
                    dateTime={ev.occurred_at}
                  >
                    {formatRawMaterialChangeDate(ev.occurred_at)}
                  </time>
                  <span className="text-muted-foreground text-xs">
                    {ev.actor_full_name ? (
                      <>
                        Por <span className="text-foreground font-medium">{ev.actor_full_name}</span>
                      </>
                    ) : (
                      "Autor desconhecido"
                    )}
                  </span>
                </div>
                <p className="text-foreground mt-2 text-sm">{ev.summary}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {RAW_MATERIAL_CHANGE_SOURCE_LABELS[ev.source]}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
