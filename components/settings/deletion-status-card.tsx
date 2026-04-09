'use client';

/**
 * Card mostrando status atual da exclusão de conta
 * Exibe: status, timeline, ações
 */

import { AccountDeletionState, DELETION_STATUS_LABELS, DELETION_STATUS_DESCRIPTIONS } from '@/lib/types/account-deletion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, CheckCircle2, Trash2 } from 'lucide-react';

interface DeletionStatusCardProps {
  state: AccountDeletionState;
  onRequestDeletion?: () => void;
  onCancelDeletion?: () => void;
}

export function DeletionStatusCard({
  state,
  onRequestDeletion,
  onCancelDeletion,
}: DeletionStatusCardProps) {
  const isPending = state.status === 'pending';
  const isConfirmed = state.status === 'confirmed';
  const isDone = state.status === 'deleted';

  const getStatusColor = () => {
    if (isDone) return 'bg-gray-100 border-gray-300';
    if (isConfirmed) return 'bg-yellow-50 border-yellow-200';
    if (isPending) return 'bg-red-50 border-red-200';
    return 'bg-green-50 border-green-200';
  };

  const getStatusIcon = () => {
    if (isDone) return <Trash2 className="w-5 h-5 text-gray-600" />;
    if (isConfirmed) return <Clock className="w-5 h-5 text-yellow-600" />;
    if (isPending) return <AlertCircle className="w-5 h-5 text-red-600" />;
    return <CheckCircle2 className="w-5 h-5 text-green-600" />;
  };

  return (
    <div className={`p-4 border rounded-lg ${getStatusColor()}`}>
      <div className="flex items-start gap-3 mb-4">
        {getStatusIcon()}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {DELETION_STATUS_LABELS[state.status]}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {DELETION_STATUS_DESCRIPTIONS[state.status]}
          </p>
        </div>
        <Badge variant={isPending || isConfirmed ? 'destructive' : 'secondary'}>
          {state.status === 'none' && 'Ativa'}
          {state.status === 'pending' && `${state.hours_until_expiry}h`}
          {state.status === 'confirmed' && '5 anos'}
          {state.status === 'deleted' && 'Deletada'}
        </Badge>
      </div>

      {/* Timeline */}
      {(isPending || isConfirmed) && (
        <div className="mb-4 space-y-2 text-sm">
          <div className="font-medium text-gray-900">⏱️ Timeline:</div>
          <ul className="space-y-1 ml-4 text-gray-700">
            <li>✓ Agora: Solicitação enviada</li>
            {isPending && (
              <>
                <li>
                  ⏳ Próximas {state.hours_until_expiry}h: Confirme por email (link no seu inbox)
                </li>
                <li>→ Após {state.hours_until_expiry}h: Conta desativada (sem reversão)</li>
              </>
            )}
            {isConfirmed && (
              <>
                <li>✓ Confirmado em {new Date(state.deletion_confirmed_at!).toLocaleDateString('pt-BR')}</li>
                <li>→ Próximos 5 anos: Dados retidos (obrigação legal)</li>
                <li>→ Após 5 anos: Limpeza automática</li>
              </>
            )}
            {isDone && (
              <>
                <li>✓ Deletada em {new Date(state.deleted_at!).toLocaleDateString('pt-BR')}</li>
                <li>→ Dados retidos até {new Date(new Date(state.deleted_at!).getTime() + 5 * 365 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</li>
              </>
            )}
          </ul>
        </div>
      )}

      {/* Info Box */}
      <div className="mb-4 p-2 bg-white/50 rounded text-xs text-gray-600">
        <strong>ℹ️ O que será deletado imediatamente:</strong> Conta de login, email, senha
        <br />
        <strong>ℹ️ O que será retido por 5 anos:</strong> Dados de pacientes (lei de saúde), relatórios, auditoria
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {state.status === 'none' && onRequestDeletion && (
          <Button variant="destructive" onClick={onRequestDeletion} size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Solicitar Exclusão
          </Button>
        )}

        {isPending && onCancelDeletion && (
          <Button variant="outline" onClick={onCancelDeletion} size="sm">
            Cancelar (Verifique email)
          </Button>
        )}

        {isConfirmed && (
          <Button variant="outline" disabled size="sm">
            Contate suporte para reverter
          </Button>
        )}

        {isDone && (
          <p className="text-xs text-gray-500">
            Sua conta foi deletada. Dados serão retidos conforme obrigações legais.
          </p>
        )}
      </div>
    </div>
  );
}
