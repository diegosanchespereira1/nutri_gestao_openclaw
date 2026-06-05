"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  type UpdateAgendaHoursResult,
  updateAgendaHoursAction,
} from "@/lib/actions/settings";
import { cn } from "@/lib/utils";

const START_OPTIONS = Array.from({ length: 13 }, (_, h) => ({
  value: h,
  label: `${String(h).padStart(2, "0")}:00`,
}));

const END_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const h = 12 + i;
  return { value: h, label: `${String(h).padStart(2, "0")}:00` };
});

const initial: UpdateAgendaHoursResult | undefined = undefined;

const selectClass = cn(
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground",
  "focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm",
  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export function AgendaSettingsForm({
  defaultStartHour,
  defaultEndHour,
}: {
  defaultStartHour: number;
  defaultEndHour: number;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateAgendaHoursAction, initial);

  // Selects controlados: o valor não é perdido quando o servidor devolve um erro.
  const [startHour, setStartHour] = useState(defaultStartHour);
  const [endHour, setEndHour] = useState(defaultEndHour);

  useEffect(() => {
    if (state?.ok === true) {
      router.refresh();
    }
  }, [state, router]);

  const resolvedStartHour = state?.ok === true ? state.agendaStartHour : startHour;
  const resolvedEndHour = state?.ok === true ? state.agendaEndHour : endHour;

  return (
    <form action={formAction} className="max-w-lg space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Hora de início */}
        <div className="space-y-2">
          <Label htmlFor="agenda-start-hour">Início da agenda</Label>
          <select
            id="agenda-start-hour"
            name="agenda_start_hour"
            required
            value={resolvedStartHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
            className={selectClass}
            aria-describedby="agenda-hours-hint"
          >
            {START_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Hora de fim */}
        <div className="space-y-2">
          <Label htmlFor="agenda-end-hour">Fim da agenda</Label>
          <select
            id="agenda-end-hour"
            name="agenda_end_hour"
            required
            value={resolvedEndHour}
            onChange={(e) => setEndHour(Number(e.target.value))}
            className={selectClass}
            aria-describedby="agenda-hours-hint"
          >
            {END_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value} disabled={value <= resolvedStartHour}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p id="agenda-hours-hint" className="text-muted-foreground text-xs">
        A grelha semanal apresenta apenas o intervalo configurado. Visitas fora
        deste horário continuam acessíveis na vista Lista.
      </p>

      {state?.ok === false ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="text-muted-foreground text-sm" role="status">
          Preferências guardadas.
        </p>
      ) : null}

      <Button type="submit">Salvar</Button>
    </form>
  );
}
