import type { ClientLifecycleStatus } from "@/lib/types/clients";

export const CLIENT_LIFECYCLE_STATUSES: ClientLifecycleStatus[] = [
  "ativo",
  "inativo",
  "finalizado",
];

export const clientLifecycleLabel: Record<ClientLifecycleStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo (pausa)",
  finalizado: "Finalizado (contrato encerrado)",
};

export const clientLifecycleShortHint: Record<ClientLifecycleStatus, string> = {
  ativo: "Pode agendar visitas.",
  inativo: "Contrato em pausa — não agenda visitas até reativar.",
  finalizado: "Contrato encerrado — não agenda visitas até reativar.",
};

/** Rótulos curtos para lista / badges (diferente do texto longo do formulário). */
export const clientLifecycleBadgeLabel: Record<ClientLifecycleStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  finalizado: "Finalizado",
};
