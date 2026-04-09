'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import type { ConsentType } from '@/lib/types/consent';
import { CONSENT_TYPE_LABELS, CONSENT_TYPE_DESCRIPTIONS } from '@/lib/types/consent';

interface ConsentModalProps {
  isOpen: boolean;
  patientName?: string;
  consentType: ConsentType;
  isParentalConsent?: boolean;
  isLoading?: boolean;
  onAccept: (parentalConsentName?: string) => Promise<void>;
  onCancel: () => void;
}

export function ConsentModal({
  isOpen,
  patientName,
  consentType,
  isParentalConsent = false,
  isLoading = false,
  onAccept,
  onCancel
}: ConsentModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [parentalName, setParentalName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setError(null);

    if (!isChecked) {
      setError('Deve aceitar os termos de consentimento para continuar');
      return;
    }

    if (isParentalConsent && !parentalName.trim()) {
      setError('Nome do responsável legal é obrigatório');
      return;
    }

    try {
      await onAccept(isParentalConsent ? parentalName : undefined);
      setIsChecked(false);
      setParentalName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registar consentimento');
    }
  };

  const label = CONSENT_TYPE_LABELS[consentType];
  const description = CONSENT_TYPE_DESCRIPTIONS[consentType];

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isParentalConsent ? 'Consentimento de Responsável Legal' : 'Consentimento Digital'}
          </DialogTitle>
          <DialogDescription>
            {isParentalConsent
              ? `Consentimento de responsável legal para ${patientName}`
              : `Consentimento para ${patientName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Aviso LGPD */}
          <div className="flex gap-3 rounded-lg bg-amber-50 p-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden="true" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Consentimento LGPD</p>
              <p className="mt-1">Este é um pedido obrigatório conforme a Lei Geral de Proteção de Dados (LGPD Art. 7).</p>
            </div>
          </div>

          {/* Tipo de consentimento */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">{label}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>

          {/* Texto legal detalhado */}
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-900">TERMO DE CONSENTIMENTO</p>

            <div className="space-y-2 text-xs text-gray-700">
              <p>
                Eu {isParentalConsent ? '(responsável legal) ' : ''}autorizo que meus dados pessoais sejam coletados, utilizados,
                armazenados e tratados conforme descrito acima.
              </p>

              <p>
                Tenho ciência de que:
              </p>

              <ul className="list-inside list-disc space-y-1 text-xs ml-2">
                <li>Posso revogar este consentimento a qualquer momento</li>
                <li>Meus dados serão processados de forma segura e confidencial</li>
                <li>Tenho direito de acessar, corrigir ou solicitar exclusão dos meus dados</li>
                <li>A coleta é legal, legítima e transparente</li>
                {isParentalConsent && (
                  <li>Como responsável legal, tenho autoridade para consentir em nome do menor</li>
                )}
              </ul>

              <p className="mt-3">
                Para mais informações sobre tratamento de dados, consulte nossa Política de Privacidade.
              </p>
            </div>
          </div>

          {/* Campo de nome do responsável (se parental) */}
          {isParentalConsent && (
            <div className="space-y-2">
              <Label htmlFor="parental-name" className="text-sm font-medium">
                Nome do Responsável Legal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="parental-name"
                placeholder="Ex: João da Silva"
                value={parentalName}
                onChange={(e) => setParentalName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          )}

          {/* Checkbox de aceite */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent-accept"
              checked={isChecked}
              onCheckedChange={(checked) => setIsChecked(checked as boolean)}
              disabled={isLoading}
              aria-required="true"
            />
            <Label
              htmlFor="consent-accept"
              className="text-sm font-medium leading-relaxed cursor-pointer"
            >
              Declaro que li e compreendo o termo acima, e autorizo o tratamento dos meus dados conforme descrito
              {isParentalConsent && ' como responsável legal pelo menor'}
            </Label>
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
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleAccept} disabled={isLoading || !isChecked}>
            {isLoading ? 'Processando...' : 'Aceitar e Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
