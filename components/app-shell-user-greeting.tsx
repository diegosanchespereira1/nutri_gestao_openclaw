"use client";

import { useSyncExternalStore } from "react";

type DayPeriod = "bom dia" | "boa tarde" | "boa noite";

/** Bom dia 05–11 · Boa tarde 12–17 · Boa noite 18–04 (horário local do device). */
export function dayPeriodGreeting(date: Date = new Date()): DayPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "bom dia";
  if (hour >= 12 && hour < 18) return "boa tarde";
  return "boa noite";
}

function subscribeToHourChange(onStoreChange: () => void) {
  const now = new Date();
  const msToNextHour =
    (60 - now.getMinutes()) * 60_000 -
    now.getSeconds() * 1000 -
    now.getMilliseconds() +
    50;
  const timeoutId = window.setTimeout(() => {
    onStoreChange();
  }, Math.max(msToNextHour, 1_000));
  const intervalId = window.setInterval(onStoreChange, 60 * 60_000);

  return () => {
    window.clearTimeout(timeoutId);
    window.clearInterval(intervalId);
  };
}

function getClientPeriodSnapshot() {
  return dayPeriodGreeting(new Date());
}

/** SSR / hydration: período neutro até o client aplicar o horário do device. */
function getServerPeriodSnapshot(): DayPeriod {
  return "bom dia";
}

/**
 * Saudação do utilizador na página inicial.
 * Ex.: «Olá Diego, boa noite!» — baseado no horário local do device.
 */
export function AppShellUserGreeting({
  firstName,
}: {
  firstName: string | null;
}) {
  const period = useSyncExternalStore(
    subscribeToHourChange,
    getClientPeriodSnapshot,
    getServerPeriodSnapshot,
  );
  const text = firstName
    ? `Olá ${firstName}, ${period}!`
    : `Olá, ${period}!`;

  return (
    <h1 className="text-foreground min-w-0 text-2xl font-bold tracking-tight sm:text-3xl">
      {text}
    </h1>
  );
}
