'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Download } from 'lucide-react';
import type { PortabilityExportFormat } from '@/lib/types/portability';
import { exportPortabilityAsJson, exportPortabilityAsCsv } from '@/lib/actions/portability';

export function DataPortabilityGenerator() {
  const [format, setFormat] = useState<PortabilityExportFormat>('json');
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
        exportResult = await exportPortabilityAsCsv();
      } else {
        exportResult = await exportPortabilityAsJson();
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
      a.download = exportResult.filename || `MEUS_DADOS.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(`Pacote de dados ${format.toUpperCase()} baixado com sucesso`);
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
          <p className="font-medium">Direito de Portabilidade (LGPD Art. 20)</p>
          <p className="mt-1">
            Você tem direito a receber uma cópia de todos os seus dados pessoais em formato aberto e portável.
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
              onChange={(e) => setFormat(e.target.value as PortabilityExportFormat)}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <Label htmlFor="format-json" className="font-normal cursor-pointer">
              JSON (estruturado — máquina legível, portável entre sistemas)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="radio"
              id="format-csv"
              name="format"
              value="csv"
              checked={format === 'csv'}
              onChange={(e) => setFormat(e.target.value as PortabilityExportFormat)}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <Label htmlFor="format-csv" className="font-normal cursor-pointer">
              CSV (tabular — importável em Excel ou planilhas)
            </Label>
          </div>
        </div>
      </fieldset>

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

      {/* Botão de ação */}
      <Button onClick={handleGenerateAndDownload} disabled={isLoading} className="w-full">
        <Download className="h-4 w-4 mr-2" />
        {isLoading ? 'Gerando...' : 'Gerar e Baixar Meus Dados'}
      </Button>

      {/* Informações adicionais */}
      <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
        <p className="font-medium mb-2">Seu pacote inclui:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Perfil pessoal e contato</li>
          <li>Lista de clientes cadastrados</li>
          <li>Estabelecimentos associados</li>
          <li>Pacientes sob sua responsabilidade</li>
          <li>Consentimentos de pacientes que gerencia</li>
          <li>Suas preferências e configurações</li>
        </ul>
      </div>

      {/* Informações sobre direitos */}
      <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-800 border border-amber-200">
        <p className="font-medium mb-2">Sobre seu direito de portabilidade:</p>
        <ul className="list-inside list-disc space-y-1 text-xs">
          <li>Você pode solicitar uma cópia dos seus dados a qualquer momento</li>
          <li>Os dados são fornecidos em formato aberto e portável</li>
          <li>Você pode transferir seus dados para outro sistema</li>
          <li>Esta exportação é registada para compliance legal</li>
        </ul>
      </div>
    </div>
  );
}
