"use client";

import { useState } from "react";
import { requestAccountDeletion } from "@/lib/actions/account-deletion";
import { LGPD_RETENTION_YEARS } from "@/lib/types/account-deletion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

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
  const [password, setPassword] = useState("");
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
      setError(result.error || "Erro ao enviar pedido");
      return;
    }

    setConfirmed(false);
    setPassword("");
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Encerrar acesso à conta
          </DialogTitle>
          <DialogDescription>
            Esta ação bloqueia o seu acesso à plataforma após confirmação no
            email. Não elimina de imediato dados clínicos (retenção legal, mínimo{" "}
            {LGPD_RETENTION_YEARS} anos).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-900 font-medium mb-2">Resumo:</p>
            <ul className="text-xs text-red-800 space-y-1">
              <li>✓ Recebe um email com link para confirmar ou cancelar (24h)</li>
              <li>✓ Após confirmar, o login deixa de ser permitido</li>
              <li>
                ✓ Dados de saúde podem ser retidos pelo período legal (mínimo{" "}
                {LGPD_RETENTION_YEARS} anos)
              </li>
            </ul>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="confirm-deletion"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
              className="mt-1"
            />
            <Label htmlFor="confirm-deletion" className="cursor-pointer text-sm leading-relaxed">
              Entendo que o pedido visa encerrar o meu acesso e que dados de
              saúde podem ser retidos pelo período legal (mínimo{" "}
              {LGPD_RETENTION_YEARS} anos).
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Digite a sua senha para continuar
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!confirmed || loading}
              className="h-9"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded" role="alert">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Será enviado um email com um link seguro. O token não é mostrado na
            aplicação.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Fechar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
          >
            {loading ? "A processar…" : "Enviar pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
