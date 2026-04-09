'use client';

/**
 * Modal de Solicitação de Exclusão de Conta
 * Dupla confirmação: checkbox + password
 */

import { useState } from 'react';
import { requestAccountDeletion } from '@/lib/actions/account-deletion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

interface DeletionRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeletionRequestModal({
  open,
  onOpenChange,
  onSuccess,
}: DeletionRequestModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = confirmed && password.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    const result = await requestAccountDeletion(password);

    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Erro ao solicitar exclusão');
      return;
    }

    // Reset form
    setConfirmed(false);
    setPassword('');
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Solicitar Exclusão de Conta
          </DialogTitle>
          <DialogDescription>
            Esta ação é irreversível. Seus dados serão deletados conforme LGPD Art. 18
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Box */}
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-900 font-medium mb-2">O que acontecerá:</p>
            <ul className="text-xs text-red-800 space-y-1">
              <li>✓ Sua conta de login será desativada</li>
              <li>✓ Seu email e senha serão deletados</li>
              <li>⏳ Você terá 24h para cancelar</li>
              <li>⏳ Após 24h, sua conta não poderá mais acessar a plataforma</li>
              <li>⏳ Dados de pacientes serão retidos por 5 anos (obrigação legal)</li>
            </ul>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-2">
            <Checkbox
              id="confirm-deletion"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
              className="mt-1"
            />
            <Label htmlFor="confirm-deletion" className="cursor-pointer text-sm leading-relaxed">
              Entendo que meus dados serão deletados conforme LGPD Art. 18 e que dados de saúde
              serão retidos por 5 anos
            </Label>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Digite sua senha para confirmar
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!confirmed || loading}
              className="h-9"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded" role="alert">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Info */}
          <p className="text-xs text-gray-500">
            Um email de confirmação será enviado. Você terá 24 horas para confirmar ou cancelar.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
          >
            {loading ? 'Processando...' : 'Solicitar Exclusão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
