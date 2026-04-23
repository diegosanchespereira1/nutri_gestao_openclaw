"use client";

import { useRouter } from "next/navigation";

type Props = {
  establishments: { id: string; name: string }[];
  /** Áreas disponíveis no estabelecimento selecionado (vazio quando nenhum est. selecionado). */
  areas?: { id: string; name: string }[];
  currentEst: string | null;
  currentArea?: string | null;
  currentStatus: "em_andamento" | "aprovado" | null;
  baseHref: string;
};

export function ChecklistHistoryFilters({
  establishments,
  areas = [],
  currentEst,
  currentArea = null,
  currentStatus,
  baseHref,
}: Props) {
  const router = useRouter();

  function navigate(
    est: string | null,
    area: string | null,
    status: string | null,
  ) {
    const [pathname, rawSearch = ""] = baseHref.includes("?")
      ? (baseHref.split("?", 2) as [string, string])
      : [baseHref, ""];
    const params = new URLSearchParams(rawSearch);
    if (est) params.set("est", est);
    else params.delete("est");
    if (area) params.set("area", area);
    else params.delete("area");
    if (status) params.set("status", status);
    else params.delete("status");
    params.delete("page");
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  const hasActiveFilters = Boolean(currentEst || currentArea || currentStatus);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={currentEst ?? ""}
        onChange={(e) => {
          // Limpar área ao trocar estabelecimento
          navigate(e.target.value || null, null, currentStatus);
        }}
        className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Filtrar por estabelecimento"
      >
        <option value="">Todos os estabelecimentos</option>
        {establishments.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>

      {/* Seletor de área — só aparece quando o estabelecimento tem áreas */}
      {areas.length > 0 && (
        <select
          value={currentArea ?? ""}
          onChange={(e) => navigate(currentEst, e.target.value || null, currentStatus)}
          className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Filtrar por área"
        >
          <option value="">Todas as áreas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}

      <select
        value={currentStatus ?? ""}
        onChange={(e) => navigate(currentEst, currentArea, e.target.value || null)}
        className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Filtrar por status"
      >
        <option value="">Todos os status</option>
        <option value="em_andamento">Em andamento</option>
        <option value="aprovado">Aprovados</option>
      </select>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => navigate(null, null, null)}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
