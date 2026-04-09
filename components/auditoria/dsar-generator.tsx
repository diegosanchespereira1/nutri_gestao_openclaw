'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Download, Mail } from 'lucide-react';
import type { DsarExportFormat } from '@/lib/types/dsar';
import {
  exportDsarAsJson,
  exportDsarAsCsv,
  sendDsarByEmail,
  generateCompletePatientDsar,
} from '@/lib/actions/dsar';

interface DsarGeneratorProps {
  patientId: string;
  patientName: string;
}

export function DsarGenerator({ patientId, patientName }: DsarGeneratorProps) {
  const [format, setFormat] = useState<DsarExportFormat>('json');
  const [sendEmail, setSendEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGenerateAndDownload = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      let exportResult;

      if (format === 'csv') {
        exportResult = await exportDsarAsCsv(patientId);
      } else {
        exportResult = await exportDsarAsJson(patientId);
      }

      if (!exportResult.success) {
        setError(exportResult.error || 'Erro ao gerar relatório');
        return;
      }

      // Download do arquivo
      const blob = new Blob([exportResult.content || ''], {
        type: exportResult.mimeType,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportResult.filename || `DSAR_${patientId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(`Relatório ${format.toUpperCase()} baixado com sucesso`);

      // Se marcar para enviar email
      if (sendEmail) {
        const emailResult = await sendDsarByEmail(patientId, format);
        if (emailResult.success) {
          setSuccess(prev => `${prev} e enviado por email`);
        } else {
          setError(`Download OK, mas erro ao enviar email: ${emailResult.error}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 p-6">
      {/* Aviso LGPD */}
      <div className="flex gap-3 rounded-lg bg-blue-50 p-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" aria-hidden="true" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Relatório DSAR — Direito de Acesso (LGPD Art. 18)</p>
          <p className="mt-1">
            Este relatório contém todos os dados pessoais do paciente <strong>{patientName}</strong> em formato portável e estruturado.
          </p>
        </div>
      </div>

      {/* Seletor de formato */}
      <fieldset className="space-y-3">
        <legend className="text-base font-semibold">Formato de Exportação</legend>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="format-json"
              name="format"
              value="json"
              checked={format === 'json'}
              onChange={(e) => setFormat(e.target.value as DsarExportFormat)}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <Label htmlFor="format-json" className="font-normal cursor-pointer">
              JSON (estruturado — máquina legível)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="format-csv"
              name="format"
              value="csv"
              checked={format === 'csv'}
              onChange={(e) => setFormat(e.target.value as DsarExportFormat)}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <Label htmlFor="format-csv" className="font-normal cursor-pointer">
              CSV (tabular — importar em Excel)
            </Label>
          </div>
        </div>
      </fieldset>

      {/* Checkbox enviar email */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="send-email"
          checked={sendEmail}
          onCheckedChange={(checked) => setSendEmail(checked as boolean)}
          disabled={isLoading}
        />
        <Label
          htmlFor="send-email"
          className="text-sm font-medium leading-relaxed cursor-pointer"
        >
          Enviar relatório por email após gerar
          <span className="block text-xs text-gray-500 mt-1">
            O arquivo será enviado para o seu email para repassar ao paciente
          </span>
        </Label>
      </div>

      {/* Mensagens de erro */}
      {error && (
        <div className="flex gap-2 rounded-lg bg-red-50 p-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" aria-hidden="true" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Mensagens de sucesso */}
      {success && (
        <div className="flex gap-2 rounded-lg bg-green-50 p-3">
          <Download className="h-5 w-5 flex-shrink-0 text-green-600" aria-hidden="true" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleGenerateAndDownload}
          disabled={isLoading}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          {isLoading ? 'Gerando...' : 'Gerar e Baixar'}
        </Button>

        <Button
          variant="outline"
          onClick={async () => {
            setError(null);
            setSuccess(null);
            setIsLoading(true);
            try {
              const result = await sendDsarByEmail(patientId, format);
              if (result.success) {
                setSuccess('Relatório enviado por email com sucesso');
              } else {
                setError(result.error || 'Erro ao enviar email');
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Erro ao enviar email');
            } finally {
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
        >
          <Mail className="h-4 w-4 mr-2" />
          {isLoading ? 'Enviando...' : 'Enviar por Email'}
        </Button>
      </div>

      {/* Informações adicionais */}
      <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
        <p className="font-medium mb-2">O que está incluído:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Perfil pessoal (dados cadastrados)</li>
          <li>Histórico de avaliações nutricionais</li>
          <li>Histórico completo de ACESSO aos dados (auditoria)</li>
          <li>Consentimentos registados e revogações</li>
          <li>Hash de integridade SHA-256 para verificação</li>
        </ul>
      </div>
    </div>
  );
}
