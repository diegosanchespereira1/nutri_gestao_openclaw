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
    <div className="rounded-xl border border-border bg-card p-4">
      <form
        action="/clientes"
        method="get"
        className="flex flex-wrap items-center gap-3"
      >
        <div className="relative min-w-0 flex-1 basis-48">
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

        <div className="w-44 shrink-0">
          <Select name="situacao" defaultValue={defaultSituacao}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Todas as situações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as situações</SelectItem>
              {CLIENT_LIFECYCLE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {clientLifecycleBadgeLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-44 shrink-0">
          <BusinessSegmentFilterDropdown
            defaultSegmentos={defaultSegmentos}
            showLabel={false}
          />
        </div>

        <div className="flex gap-2">
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
      </form>
    </div>
  );
}
