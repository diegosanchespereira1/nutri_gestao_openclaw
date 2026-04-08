import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Ícone Lucide para ilustrar o estado vazio */
  icon: LucideIcon;
  /** Título principal */
  title: string;
  /** Descrição complementar */
  description?: string;
  /** Ação primária (ex: botão "Adicionar") */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Estado vazio padronizado — usar em listas, tabelas e dashboards sem dados.
 *
 * Nunca usar spinner global — este componente comunica ausência de dados
 * de forma clara e oferece próxima ação contextual.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className,
      )}
    >
      <div className="bg-muted rounded-full p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Estado de erro — usar quando falha ao carregar dados do Supabase.
 * Oferece botão de retry para acção imediata.
 */
export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className,
      )}
    >
      <div className="bg-destructive/10 rounded-full p-3 mb-3">
        <svg
          className="h-8 w-8 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium mb-1">Erro ao carregar dados</p>
      {message && (
        <p className="text-xs text-muted-foreground mb-4 max-w-sm">{message}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
