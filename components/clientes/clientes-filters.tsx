import Link from "next/link";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ClientesFilters({
  defaultQ,
  defaultTipo,
}: {
  defaultQ: string;
  defaultTipo: "all" | "pf" | "pj";
}) {
  return (
    <form
      action="/clientes"
      method="get"
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="min-w-0 flex-1 space-y-2 sm:max-w-xs">
        <Label htmlFor="filtro-q">Pesquisar</Label>
        <Input
          id="filtro-q"
          name="q"
          type="search"
          placeholder="Nome, documento, email…"
          defaultValue={defaultQ}
          autoComplete="off"
        />
      </div>
      <div className="w-full space-y-2 sm:w-44">
        <Label htmlFor="filtro-tipo">Tipo</Label>
        <select
          id="filtro-tipo"
          name="tipo"
          defaultValue={defaultTipo}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <option value="all">Todos</option>
          <option value="pf">Pessoa física</option>
          <option value="pj">Pessoa jurídica</option>
        </select>
      </div>
      <div className="flex gap-2">
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
