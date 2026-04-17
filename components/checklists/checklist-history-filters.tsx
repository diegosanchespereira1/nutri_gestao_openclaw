"use client";

import { useRouter } from "next/navigation";

type Props = {
  establishments: { id: string; name: string }[];
  currentEst: string | null;
  currentStatus: "em_andamento" | "aprovado" | null;
  baseHref: string;
};

export function ChecklistHistoryFilters({
  establishments,
  currentEst,
  currentStatus,
  baseHref,
}: Props) {
  const router = useRouter();

  function navigate(est: string | null, status: string | null) {
    const params = new URLSearchParams();
    if (est) params.set("est", est);
    if (status) params.set("status", status);
    const qs = params.toString();
    router.push(`${baseHref}${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={currentEst ?? ""}
        onChange={(e) => navigate(e.target.value || null, currentStatus)}
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

      <select
        value={currentStatus ?? ""}
        onChange={(e) => navigate(currentEst, e.target.value || null)}
        className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Filtrar por status"
      >
        <option value="">Todos os status</option>
        <option value="em_andamento">Em andamento</option>
        <option value="aprovado">Aprovados</option>
      </select>

      {(currentEst || currentStatus) && (
        <button
          type="button"
          onClick={() => navigate(null, null)}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
