"use client";

import type { FormEvent, ReactNode } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientesTableSkeleton } from "@/components/clientes/clientes-table-skeleton";
import {
  CLIENT_LIFECYCLE_STATUSES,
  clientLifecycleBadgeLabel,
} from "@/lib/constants/client-lifecycle";
import { useFilterNavigation } from "@/lib/navigation/use-filter-navigation";
import type { ClientLifecycleStatus, ClientBusinessSegment } from "@/lib/types/clients";
import { BusinessSegmentFilterDropdown } from "./business-segment-filter-dropdown";

const SITUACAO_FILTER_LABELS: Record<ClientLifecycleStatus | "all", string> = {
  all: "Todos",
  ...clientLifecycleBadgeLabel,
};

function buildClientesHref(form: HTMLFormElement): string {
  const fd = new FormData(form);
  const params = new URLSearchParams();
  const q = String(fd.get("q") ?? "").trim();
  if (q) params.set("q", q);
  const situacao = String(fd.get("situacao") ?? "all");
  if (situacao && situacao !== "all") params.set("situacao", situacao);
  for (const segmento of fd.getAll("segmentos")) {
    const value = String(segmento).trim();
    if (value) params.append("segmentos", value);
  }
  const qs = params.toString();
  return qs ? `/clientes?${qs}` : "/clientes";
}

export function ClientesSearchPanel({
  defaultQ,
  defaultSituacao,
  defaultSegmentos = [],
  children,
}: {
  defaultQ: string;
  defaultSituacao: ClientLifecycleStatus | "all";
  defaultSegmentos?: ClientBusinessSegment[];
  children: ReactNode;
}) {
  const { isPending, navigate } = useFilterNavigation();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(buildClientesHref(event.currentTarget));
  }

  return (
    <>
      <div className="overflow-visible rounded-xl border border-border bg-card p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              type="search"
              placeholder="Pesquisar por nome, CNPJ…"
              defaultValue={defaultQ}
              autoComplete="off"
              className="h-9 rounded-md pl-8"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="min-w-0 flex-1 sm:max-w-[11rem]">
                <Select name="situacao" defaultValue={defaultSituacao}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Todos">
                      {(selected) =>
                        selected
                          ? SITUACAO_FILTER_LABELS[selected as ClientLifecycleStatus | "all"]
                          : null
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {CLIENT_LIFECYCLE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {clientLifecycleBadgeLabel[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 flex-1 sm:max-w-[11rem]">
                <BusinessSegmentFilterDropdown
                  defaultSegmentos={defaultSegmentos}
                  showLabel={false}
                />
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button type="submit" size="lg" className="rounded-md" disabled={isPending}>
                Filtrar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="rounded-md"
                disabled={isPending}
                onClick={() => navigate("/clientes")}
              >
                Limpar
              </Button>
            </div>
          </div>
        </form>
      </div>

      {isPending ? <ClientesTableSkeleton /> : children}
    </>
  );
}
