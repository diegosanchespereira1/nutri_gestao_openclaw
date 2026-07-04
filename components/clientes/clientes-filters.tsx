"use client";

import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLIENT_LIFECYCLE_STATUSES,
  clientLifecycleBadgeLabel,
} from "@/lib/constants/client-lifecycle";
import type { ClientLifecycleStatus, ClientBusinessSegment } from "@/lib/types/clients";
import { cn } from "@/lib/utils";
import { BusinessSegmentFilterDropdown } from "./business-segment-filter-dropdown";

const SITUACAO_FILTER_LABELS: Record<ClientLifecycleStatus | "all", string> = {
  all: "Todos",
  ...clientLifecycleBadgeLabel,
};

export function ClientesFilters({
  defaultQ,
  defaultSituacao,
  defaultSegmentos = [],
}: {
  defaultQ: string;
  defaultSituacao: ClientLifecycleStatus | "all";
  defaultSegmentos?: ClientBusinessSegment[];
}) {
  return (
    <div className="overflow-visible rounded-xl border border-border bg-card p-4">
      <form action="/clientes" method="get" className="flex flex-col gap-3">
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
            <Button type="submit" size="lg" className="rounded-md">
              Filtrar
            </Button>
            <Link
              href="/clientes"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-md")}
            >
              Limpar
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
