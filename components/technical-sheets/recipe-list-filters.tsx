"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { buttonVariants } from "@/components/ui/button-variants";
import type { ClientRow } from "@/lib/types/clients";
import type { EstablishmentWithClientNames } from "@/lib/types/establishments";
import {
  TECHNICAL_RECIPE_LIST_TOGGLE_FILTERS,
  parseTechnicalRecipeListFilters,
  serializeTechnicalRecipeListFilters,
  type TechnicalRecipeListToggleFilter,
} from "@/lib/constants/recipe-list";
import { cn } from "@/lib/utils";

const FILTER_LABELS: Record<TechnicalRecipeListToggleFilter, string> = {
  favoritos: "Favoritos",
  templates: "Templates",
};

function pjClientLabel(c: ClientRow): string {
  const t = c.trade_name?.trim();
  return t && t.length > 0 ? t : c.legal_name;
}

const selectClassName = cn(
  "border-input bg-background h-8 rounded-lg border px-2.5 text-sm",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
);

type Props = {
  pjClients?: ClientRow[];
  establishments?: EstablishmentWithClientNames[];
};

export function RecipeListFilters({
  pjClients = [],
  establishments = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = parseTechnicalRecipeListFilters(
    searchParams.get("filtro") ?? undefined,
  );
  const showAll = active.length === 0;
  const clienteId = searchParams.get("cliente") ?? "";
  const estabelecimentoId = searchParams.get("estabelecimento") ?? "";
  const establishmentsForClient = clienteId
    ? establishments.filter((e) => e.client_id === clienteId)
    : [];

  function pushFilters(next: TechnicalRecipeListToggleFilter[]) {
    const params = new URLSearchParams(searchParams.toString());
    const serialized = serializeTechnicalRecipeListFilters(next);
    if (serialized) {
      params.set("filtro", serialized);
    } else {
      params.delete("filtro");
    }
    params.delete("page");
    router.push(`/ficha-tecnica?${params.toString()}`);
  }

  function toggleFilter(filtro: TechnicalRecipeListToggleFilter) {
    const next = active.includes(filtro)
      ? active.filter((item) => item !== filtro)
      : [...active, filtro];
    pushFilters(next);
  }

  function clearFilters() {
    pushFilters([]);
  }

  function setClientFilter(nextClientId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextClientId) {
      params.set("cliente", nextClientId);
    } else {
      params.delete("cliente");
    }
    // Troca de cliente sempre limpa o estabelecimento — nunca deixa filtro
    // de estabelecimento de um cliente vazar para outro.
    params.delete("estabelecimento");
    params.delete("page");
    router.push(`/ficha-tecnica?${params.toString()}`);
  }

  function setEstablishmentFilter(nextEstablishmentId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextEstablishmentId) {
      params.set("estabelecimento", nextEstablishmentId);
    } else {
      params.delete("estabelecimento");
    }
    params.delete("page");
    router.push(`/ficha-tecnica?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filtrar receitas"
      >
        <button
          type="button"
          onClick={clearFilters}
          aria-pressed={showAll}
          className={cn(
            buttonVariants({
              variant: showAll ? "default" : "outline",
              size: "sm",
            }),
          )}
        >
          Todos
        </button>
        {TECHNICAL_RECIPE_LIST_TOGGLE_FILTERS.map((filtro) => (
          <button
            key={filtro}
            type="button"
            onClick={() => toggleFilter(filtro)}
            aria-pressed={active.includes(filtro)}
            className={cn(
              buttonVariants({
                variant: active.includes(filtro) ? "default" : "outline",
                size: "sm",
              }),
            )}
          >
            {FILTER_LABELS[filtro]}
          </button>
        ))}
      </div>

      {pjClients.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrar por cliente"
            className={selectClassName}
            value={clienteId}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="">Todos os clientes</option>
            {pjClients.map((c) => (
              <option key={c.id} value={c.id}>
                {pjClientLabel(c)}
              </option>
            ))}
          </select>
          {clienteId && establishmentsForClient.length > 0 ? (
            <select
              aria-label="Filtrar por estabelecimento"
              className={selectClassName}
              value={estabelecimentoId}
              onChange={(e) => setEstablishmentFilter(e.target.value)}
            >
              <option value="">Todos os estabelecimentos</option>
              {establishmentsForClient.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
