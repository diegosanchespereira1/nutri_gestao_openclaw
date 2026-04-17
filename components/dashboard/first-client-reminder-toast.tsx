"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const SESSION_KEY = "nutri-nudge-no-client-toast";

type Props = {
  /** Com pelo menos um cliente, não mostra o toast. */
  hasClients: boolean;
};

/**
 * Lembrete único por sessão de browser quando ainda não há clientes cadastrados.
 */
export function FirstClientReminderToast({ hasClients }: Props) {
  const router = useRouter();
  const didRun = useRef(false);

  useEffect(() => {
    if (hasClients || didRun.current) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    didRun.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");

    toast("Ainda não há clientes na conta", {
      description:
        "Adiciona o teu primeiro cliente para agendar visitas e associar checklists a estabelecimentos.",
      duration: 14_000,
      action: {
        label: "Novo cliente",
        onClick: () => router.push("/clientes/novo"),
      },
    });
  }, [hasClients, router]);

  return null;
}
