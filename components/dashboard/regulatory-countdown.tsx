"use client";

import { useEffect, useState } from "react";

import { calendarDaysUntilDueDate } from "@/lib/datetime/calendar-tz";

type Props = {
  dueDateKey: string;
  timeZone: string;
};

/**
 * Atualiza o texto quando o dia civil muda no fuso do utilizador (intervalo de 1 min).
 */
export function RegulatoryCountdown({ dueDateKey, timeZone }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const days = calendarDaysUntilDueDate(dueDateKey, timeZone, now);

  let text: string;
  let urgency: "overdue" | "soon" | "ok";
  if (days < 0) {
    const a = -days;
    text =
      a === 1
        ? "Em atraso há 1 dia face à data limite."
        : `Em atraso há ${a} dias face à data limite.`;
    urgency = "overdue";
  } else if (days === 0) {
    text = "Termina hoje (data limite).";
    urgency = "soon";
  } else if (days === 1) {
    text = "Falta 1 dia até à data limite.";
    urgency = "soon";
  } else {
    text = `Faltam ${days} dias até à data limite.`;
    urgency = days <= 7 ? "soon" : "ok";
  }

  return (
    <p
      className={
        urgency === "overdue"
          ? "text-destructive text-sm font-medium"
          : urgency === "soon"
            ? "text-amber-800 dark:text-amber-200 text-sm font-medium"
            : "text-muted-foreground text-sm"
      }
      aria-live="polite"
    >
      <span className="sr-only">Contagem de prazo: </span>
      {text}
    </p>
  );
}
