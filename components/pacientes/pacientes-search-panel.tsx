"use client";

import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PacientesListSkeleton } from "@/components/pacientes/pacientes-list-skeleton";
import { AGE_CATEGORY_LABELS, type AgeCategory } from "@/lib/pacientes/age-category";
import { useFilterNavigation } from "@/lib/navigation/use-filter-navigation";

function buildPacientesHref(form: HTMLFormElement): string {
  const fd = new FormData(form);
  const params = new URLSearchParams();
  const q = String(fd.get("q") ?? "").trim();
  if (q) params.set("q", q);
  const situacao = String(fd.get("situacao") ?? "all");
  if (situacao && situacao !== "all") params.set("situacao", situacao);
  const categoria = String(fd.get("categoria") ?? "all");
  if (categoria && categoria !== "all") params.set("categoria", categoria);
  const qs = params.toString();
  return qs ? `/pacientes?${qs}` : "/pacientes";
}

export function PacientesSearchPanel({
  defaultQ,
  defaultSituacao,
  defaultCategoria,
  children,
}: {
  defaultQ: string;
  defaultSituacao: "independente" | "all";
  defaultCategoria: AgeCategory | "all";
  children: ReactNode;
}) {
  const { isPending, navigate } = useFilterNavigation();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(buildPacientesHref(event.currentTarget));
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-0 flex-1 space-y-2 lg:max-w-xs">
          <Label htmlFor="filtro-q">Pesquisar</Label>
          <Input
            id="filtro-q"
            name="q"
            type="search"
            placeholder="Nome ou CPF…"
            defaultValue={defaultQ}
            autoComplete="off"
            className="bg-white dark:bg-card"
          />
        </div>
        <div className="w-full lg:w-auto lg:min-w-[12rem] lg:max-w-xs">
          <div className="space-y-2">
            <Label htmlFor="filtro-situacao">Associação</Label>
            <select
              id="filtro-situacao"
              name="situacao"
              defaultValue={defaultSituacao}
              className="border-input bg-white ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none dark:bg-card"
            >
              <option value="all">Todos</option>
              <option value="independente">Particulares (sem cliente)</option>
            </select>
          </div>
        </div>
        <div className="w-full lg:w-auto lg:min-w-[12rem] lg:max-w-xs">
          <div className="space-y-2">
            <Label htmlFor="filtro-categoria">Categoria</Label>
            <select
              id="filtro-categoria"
              name="categoria"
              defaultValue={defaultCategoria}
              className="border-input bg-white ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none dark:bg-card"
            >
              <option value="all">Todas</option>
              <option value="crianca">{AGE_CATEGORY_LABELS.crianca} (até 17 anos)</option>
              <option value="adulto">{AGE_CATEGORY_LABELS.adulto} (18 a 59)</option>
              <option value="idoso">{AGE_CATEGORY_LABELS.idoso} (60+)</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isPending}>
            Filtrar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => navigate("/pacientes")}
          >
            Limpar
          </Button>
        </div>
      </form>

      {isPending ? <PacientesListSkeleton /> : children}
    </>
  );
}
