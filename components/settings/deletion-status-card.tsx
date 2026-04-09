"use client";

import {
  AccountClosureState,
  CLOSURE_STATUS_DESCRIPTIONS,
  CLOSURE_STATUS_LABELS,
  LGPD_RETENTION_YEARS,
} from "@/lib/types/account-deletion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, Trash2 } from "lucide-react";

interface DeletionStatusCardProps {
  state: AccountClosureState;
  onRequestDeletion?: () => void;
  onCancelDeletion?: () => void;
}

export function DeletionStatusCard({
  state,
  onRequestDeletion,
  onCancelDeletion,
}: DeletionStatusCardProps) {
  const isPending = state.status === "pending";
  const isBlocked = state.status === "blocked";

  const getStatusColor = () => {
    if (isBlocked) return "bg-amber-50 border-amber-200";
    if (isPending) return "bg-red-50 border-red-200";
    return "bg-green-50 border-green-200";
  };

  const getStatusIcon = () => {
    if (isBlocked) return <Clock className="w-5 h-5 text-amber-600" />;
    if (isPending) return <AlertCircle className="w-5 h-5 text-red-600" />;
    return <CheckCircle2 className="w-5 h-5 text-green-600" />;
  };

  return (
    <div className={`p-4 border rounded-lg ${getStatusColor()}`}>
      <div className="flex items-start gap-3 mb-4">
        {getStatusIcon()}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {CLOSURE_STATUS_LABELS[state.status]}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {CLOSURE_STATUS_DESCRIPTIONS[state.status]}
          </p>
        </div>
        <Badge variant={isPending || isBlocked ? "destructive" : "secondary"}>
          {state.status === "none" && "Ativa"}
          {state.status === "pending" &&
            `${state.hours_until_expiry ?? 0}h restantes`}
          {state.status === "blocked" && `${LGPD_RETENTION_YEARS} anos`}
        </Badge>
      </div>

      {(isPending || isBlocked) && (
        <div className="mb-4 space-y-2 text-sm">
          <div className="font-medium text-gray-900">⏱️ Resumo</div>
          <ul className="space-y-1 ml-4 text-gray-700">
            <li>✓ Agora: pedido de encerramento do acesso (não elimina dados clínicos)</li>
            {isPending && (
              <>
                <li>
                  ⏳ Próximas {state.hours_until_expiry ?? 0}h: confirme ou cancele
                  pelo email
                </li>
                <li>
                  → Após confirmar: o login deixa de ser permitido; a retenção
                  mínima de dados de saúde é de {LGPD_RETENTION_YEARS} anos
                </li>
              </>
            )}
            {isBlocked && state.lgpd_blocked_at && (
              <>
                <li>
                  ✓ Encerramento em{" "}
                  {new Date(state.lgpd_blocked_at).toLocaleDateString("pt-BR")}
                </li>
                <li>
                  → Retenção documental até{" "}
                  {state.lgpd_blocked_until
                    ? new Date(state.lgpd_blocked_until).toLocaleDateString(
                        "pt-BR",
                      )
                    : `— (${LGPD_RETENTION_YEARS} anos)`}
                </li>
              </>
            )}
          </ul>
        </div>
      )}

      <div className="mb-4 p-2 bg-white/50 rounded text-xs text-gray-600">
        <strong>O que muda:</strong> o seu acesso à plataforma é bloqueado após
        confirmar o pedido. Não prometemos eliminação imediata de dados clínicos.
      </div>

      <div className="flex gap-2">
        {state.status === "none" && onRequestDeletion && (
          <Button variant="destructive" onClick={onRequestDeletion} size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Pedir encerramento do acesso
          </Button>
        )}

        {isPending && onCancelDeletion && (
          <Button variant="outline" onClick={onCancelDeletion} size="sm">
            Cancelar pedido (sessão iniciada)
          </Button>
        )}

        {isBlocked && (
          <p className="text-xs text-gray-500">
            Para rever o bloqueio, um administrador deve desbloquear a conta.
          </p>
        )}
      </div>
    </div>
  );
}
