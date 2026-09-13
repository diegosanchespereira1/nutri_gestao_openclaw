"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { CHECKLISTS_IN_PROGRESS_REFRESH_MS } from "@/lib/dashboard/checklists-in-progress";

type Props = {
  intervalMs?: number;
};

/**
 * Revalida o RSC enquanto o ecrã está visível.
 * Pausa em background para poupar bateria no telemóvel.
 */
export function ChecklistInProgressLiveRefresh({
  intervalMs = CHECKLISTS_IN_PROGRESS_REFRESH_MS,
}: Props) {
  const router = useRouter();
  const ms = Math.min(120_000, Math.max(10_000, intervalMs));

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const tick = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    const start = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(tick, ms);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        tick();
        start();
      } else if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, ms]);

  return null;
}
