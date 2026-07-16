"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { ChecklistValidityAlertCard } from "@/components/dashboard/checklist-validity-alert-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChecklistValidityAlert } from "@/lib/types/checklist-validity-alerts";
import { cn } from "@/lib/utils";

type Props = {
  alerts: ChecklistValidityAlert[];
  timeZone: string;
  /** Oculta o campo "Buscar empresa" — usado quando os alertas já estão
   *  filtrados a um único cliente (ex.: página do cliente), onde a busca por
   *  nome de empresa não faz sentido. Mantém o filtro de status e a paginação. */
  hideCompanySearch?: boolean;
};

type StatusFilter = "todos" | "proximo" | "vencido";

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  todos: "Todos",
  proximo: "A vencer",
  vencido: "Vencidos",
};

const ITEMS_PER_COLUMN = 10;

function useGridColumnCount(): number {
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setColumnCount(mq.matches ? 2 : 1);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return columnCount;
}

export function ChecklistValidityAlertGroups({
  alerts,
  timeZone,
  hideCompanySearch = false,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [page, setPage] = useState(1);
  const columnCount = useGridColumnCount();
  const pageSize = ITEMS_PER_COLUMN * columnCount;

  const filteredAlerts = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase("pt-BR");
    return alerts.filter((alert) => {
      const byStatus = statusFilter === "todos" || alert.status === statusFilter;
      if (!byStatus) return false;
      if (!search) return true;
      return alert.clientName.toLocaleLowerCase("pt-BR").includes(search);
    });
  }, [alerts, searchTerm, statusFilter]);

  const total = filteredAlerts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;
  const pagedAlerts = filteredAlerts.slice(offset, offset + pageSize);
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + pageSize, total);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "grid gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:p-4",
          hideCompanySearch ? "sm:grid-cols-1" : "sm:grid-cols-2",
        )}
      >
        {hideCompanySearch ? null : (
          <div className="space-y-1.5">
            <Label htmlFor="validity-company-search">Buscar empresa</Label>
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="validity-company-search"
                type="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Digite o nome da empresa"
                className="pl-8"
              />
            </div>
          </div>
        )}
        <div className={cn("space-y-1.5", hideCompanySearch && "sm:max-w-xs")}>
          <Label htmlFor="validity-status-filter">Filtrar por status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger id="validity-status-filter">
              <SelectValue placeholder="Selecione o status">
                {(selected) =>
                  selected ? STATUS_FILTER_LABELS[selected as StatusFilter] : null
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="proximo">A vencer</SelectItem>
              <SelectItem value="vencido">Vencidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredAlerts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum item encontrado para os filtros aplicados.
        </p>
      ) : (
        <>
          <ul
            className="grid grid-cols-1 gap-3 md:grid-cols-2"
            aria-label="Validades de itens de checklist"
          >
            {pagedAlerts.map((alert) => (
              <li key={alert.responseId} className="min-h-0">
                <ChecklistValidityAlertCard
                  alert={alert}
                  timeZone={timeZone}
                  stacked
                />
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
              <p className="text-muted-foreground text-sm">
                {`Exibindo ${from}–${to} de ${total} item${total !== 1 ? "s" : ""}`}
              </p>
              <PaginationControls
                page={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
