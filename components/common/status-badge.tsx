import { cn } from "@/lib/utils";

// ── Configuração completa de estados semânticos ───────────────────────────────
const STATUS_CONFIG = {
  // Estados de visita
  agendada: {
    label: "Agendada",
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-400",
    pulse: false,
  },
  em_visita: {
    label: "Em Visita",
    bg: "bg-teal-50",
    text: "text-teal-700",
    dot: "bg-teal-500",
    pulse: true,
  },
  concluida: {
    label: "Concluída",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
    pulse: false,
  },
  pausada: {
    label: "Pausada",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    pulse: false,
  },

  // Estados de conformidade regulatória
  conforme: {
    label: "Conforme",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
    pulse: false,
  },
  alerta: {
    label: "Alerta",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    pulse: true,
  },
  critico: {
    label: "Crítico",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
    pulse: true,
  },

  // Estados de contrato / financeiro
  pendente: {
    label: "Pendente",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
    pulse: false,
  },
  vencido: {
    label: "Vencido",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
    pulse: false,
  },
  pago: {
    label: "Pago",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
    pulse: false,
  },

  // Estados de portaria regulatória
  vigente: {
    label: "Vigente",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
    pulse: false,
  },
  a_vencer: {
    label: "A Vencer",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
    pulse: true,
  },
  expirada: {
    label: "Expirada",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
    pulse: false,
  },

  // Acesso externo / portal
  ativo: {
    label: "Activo",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
    pulse: false,
  },
  revogado: {
    label: "Revogado",
    bg: "bg-slate-100",
    text: "text-slate-500",
    dot: "bg-slate-400",
    pulse: false,
  },
} as const;

export type StatusKey = keyof typeof STATUS_CONFIG;

interface StatusBadgeProps {
  /** Estado semântico — ver STATUS_CONFIG para lista completa */
  status: StatusKey;
  /** Label customizado (sobrepõe o padrão) */
  label?: string;
  /** Tamanho do badge */
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({
  status,
  label,
  size = "md",
  className,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const displayLabel = label ?? config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        config.bg,
        config.text,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full shrink-0",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
          config.dot,
          config.pulse && "animate-pulse",
        )}
        aria-hidden
      />
      {displayLabel}
    </span>
  );
}

// Exportar config para uso em tabelas e filtros
export { STATUS_CONFIG };
