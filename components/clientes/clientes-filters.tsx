import Link from "next/link";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CLIENT_LIFECYCLE_STATUSES,
  clientLifecycleBadgeLabel,
} from "@/lib/constants/client-lifecycle";
import type { ClientLifecycleStatus } from "@/lib/types/clients";
import { cn } from "@/lib/utils";

export function ClientesFilters({
  defaultQ,
  defaultTipo,
  defaultSituacao,
}: {
  defaultQ: string;
  defaultTipo: "all" | "pf" | "pj";
  defaultSituacao: ClientLifecycleStatus | "all";
}) {
  return (
    <form
      action="/clientes"
      method="get"
      className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end"
    >
      <div className="min-w-0 flex-1 space-y-2 lg:max-w-xs">
        <Label htmlFor="filtro-q">Pesquisar</Label>
        <Input
          id="filtro-q"
          name="q"
          type="search"
          placeholder="Nome, documento, email…"
          defaultValue={defaultQ}
          autoComplete="off"
          className="bg-white dark:bg-card"
        />
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-0 lg:max-w-md lg:grid-cols-2">
        <div className="space-y-2 sm:min-w-[10rem]">
          <Label htmlFor="filtro-tipo">Tipo (PF / PJ)</Label>
          <select
            id="filtro-tipo"
            name="tipo"
            defaultValue={defaultTipo}
            className="border-input bg-white ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none dark:bg-card"
          >
            <option value="all">Todas (PF e PJ)</option>
            <option value="pf">Pessoa física</option>
            <option value="pj">Pessoa jurídica</option>
          </select>
        </div>
        <div className="space-y-2 sm:min-w-[10rem]">
          <Label htmlFor="filtro-situacao">Situação</Label>
          <select
            id="filtro-situacao"
            name="situacao"
            defaultValue={defaultSituacao}
            className="border-input bg-white ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none dark:bg-card"
          >
            <option value="all">Todas</option>
            {CLIENT_LIFECYCLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {clientLifecycleBadgeLabel[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Filtrar</Button>
        <Link
          href="/clientes"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Limpar
        </Link>
      </div>
    </form>
  );
}
