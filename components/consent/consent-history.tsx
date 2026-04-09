'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Trash2 } from 'lucide-react';
import type { ConsentRecord } from '@/lib/types/consent';
import { CONSENT_TYPE_LABELS } from '@/lib/types/consent';
import { revokeConsent } from '@/lib/actions/consent';

interface ConsentHistoryProps {
  consents: ConsentRecord[];
  onRevoke?: () => void;
}

export function ConsentHistory({ consents, onRevoke }: ConsentHistoryProps) {
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState<ConsentRecord | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRevokeClick = (consent: ConsentRecord) => {
    setSelectedConsent(consent);
    setRevocationReason('');
    setError(null);
    setRevokeDialogOpen(true);
  };

  const handleRevokeSubmit = async () => {
    if (!selectedConsent || !revocationReason.trim()) {
      setError('Motivo da revogação é obrigatório');
      return;
    }

    setIsRevoking(true);
    setError(null);

    try {
      const result = await revokeConsent({
        consentRecordId: selectedConsent.id,
        revocationReason: revocationReason.trim()
      });

      if (!result.success) {
        setError(result.error || 'Erro ao revogar consentimento');
        return;
      }

      setRevokeDialogOpen(false);
      setSelectedConsent(null);
      setRevocationReason('');
      onRevoke?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao revogar consentimento');
    } finally {
      setIsRevoking(false);
    }
  };

  if (!consents || consents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-600">Nenhum consentimento registado</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const truncateIp = (ip: string | null): string => {
    if (!ip || ip === 'unknown') return 'N/A';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.***`;
    }
    return ip;
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>IP</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {consents.map((consent) => (
              <TableRow key={consent.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{CONSENT_TYPE_LABELS[consent.consent_type]}</p>
                    {consent.is_parental_consent && (
                      <p className="text-xs text-gray-500">Responsável: {consent.parental_consent_name}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={consent.status === 'active' ? 'default' : 'secondary'}>
                    {consent.status === 'active' ? 'Ativo' : 'Revogado'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  <div>
                    <p>{formatDate(consent.created_at)}</p>
                    {consent.status === 'revogado' && consent.revoked_at && (
                      <p className="text-xs text-gray-500">Revogado: {formatDate(consent.revoked_at)}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {truncateIp(consent.ip_address)}
                </TableCell>
                <TableCell className="text-right">
                  {consent.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeClick(consent)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Revogar
                    </Button>
                  )}
                  {consent.status === 'revogado' && consent.revocation_reason && (
                    <div className="text-xs text-gray-500 max-w-xs">
                      <p className="font-medium mb-1">Motivo:</p>
                      <p>{consent.revocation_reason}</p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog para revogação */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Revogar Consentimento</DialogTitle>
            <DialogDescription>
              {selectedConsent && (
                <>
                  Tem a certeza que deseja revogar o consentimento para{' '}
                  <strong>{CONSENT_TYPE_LABELS[selectedConsent.consent_type]}</strong>?
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Aviso */}
            <div className="flex gap-3 rounded-lg bg-amber-50 p-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden="true" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Esta ação é irreversível</p>
                <p className="mt-1">
                  O consentimento será marcado como revogado. Este registo é mantido como prova legal de revogação.
                </p>
              </div>
            </div>

            {/* Campo de motivo */}
            <div className="space-y-2">
              <Label htmlFor="revocation-reason" className="text-sm font-medium">
                Motivo da Revogação <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="revocation-reason"
                placeholder="Ex: Paciente solicitou revogação de dados"
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                disabled={isRevoking}
                rows={3}
              />
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="flex gap-2 rounded-lg bg-red-50 p-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" aria-hidden="true" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRevokeDialogOpen(false)}
              disabled={isRevoking}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeSubmit}
              disabled={isRevoking || !revocationReason.trim()}
            >
              {isRevoking ? 'Revogando...' : 'Revogar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
