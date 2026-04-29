"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { ChecklistValidityAlertCard } from "@/components/dashboard/checklist-validity-alert-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChecklistValidityAlert } from "@/lib/types/checklist-validity-alerts";

type Props = {
  alerts: ChecklistValidityAlert[];
  timeZone: string;
};

type StatusFilter = "todos" | "proximo" | "vencido";

type AlertsByClientGroup = {
  clientId: string;
  clientName: string;
  alerts: ChecklistValidityAlert[];
};

export function ChecklistValidityAlertGroups({ alerts, timeZone }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  const filteredAlerts = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase("pt-BR");
    return alerts.filter((alert) => {
      const byStatus = statusFilter === "todos" || alert.status === statusFilter;
      if (!byStatus) return false;
      if (!search) return true;
      return alert.clientName.toLocaleLowerCase("pt-BR").includes(search);
    });
  }, [alerts, searchTerm, statusFilter]);

  const groupedAlerts = useMemo<AlertsByClientGroup[]>(() => {
    return filteredAlerts.reduce<AlertsByClientGroup[]>((groups, alert) => {
      const existing = groups.find((group) => group.clientId === alert.clientId);
      if (existing) {
        existing.alerts.push(alert);
        return groups;
      }
      groups.push({
        clientId: alert.clientId,
        clientName: alert.clientName,
        alerts: [alert],
      });
      return groups;
    }, []);
  }, [filteredAlerts]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2 sm:p-4">
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
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome da empresa"
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="validity-status-filter">Filtrar por status</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger id="validity-status-filter">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="proximo">A vencer</SelectItem>
              <SelectItem value="vencido">Vencidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {groupedAlerts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum item encontrado para os filtros aplicados.
        </p>
      ) : (
        <div className="space-y-4" aria-label="Validades de itens de checklist">
          {groupedAlerts.map((group) => (
            <section
              key={group.clientId}
              className="bg-muted/20 space-y-3 rounded-lg border border-border p-3 sm:p-4"
              aria-label={`Alertas de validade do cliente ${group.clientName}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <p className="text-foreground text-lg font-semibold tracking-tight sm:text-xl">
                  {group.clientName}
                </p>
                <span className="text-muted-foreground text-xs">
                  {group.alerts.length} {group.alerts.length === 1 ? "item" : "itens"}{" "}
                  {group.alerts.length === 1 ? "a vencer/vencido" : "a vencer/vencidos"}
                </span>
              </div>
              <ul className="space-y-3" aria-label={`Itens de validade de ${group.clientName}`}>
                {group.alerts.map((alert) => (
                  <li key={alert.responseId}>
                    <ChecklistValidityAlertCard alert={alert} timeZone={timeZone} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
