'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

import type { PatientRow } from '@/lib/types/patients';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { exportPatientAuditCsv } from '@/lib/actions/audit';

const selectClass =
  'border-input bg-card ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none';

export function DsarForm({
  patients,
}: {
  patients: Pick<PatientRow, 'id' | 'full_name'>[];
}) {
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleExportCsv = async () => {
    if (!selectedPatientId) return;

    setIsLoading(true);
    try {
      const csvContent = await exportPatientAuditCsv(selectedPatientId);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const selectedPatient = patients.find(
        (p) => p.id === selectedPatientId,
      );
      const fileName = `DSAR_${selectedPatient?.full_name}_${new Date().toISOString().split('T')[0]}.csv`;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      alert('Falha ao gerar relatório. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="patient-select">Paciente</Label>
          <select
            id="patient-select"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className={cn(
              selectClass,
              selectedPatientId === '' && 'text-muted-foreground',
            )}
            aria-label="Selecione um paciente para gerar relatório DSAR"
          >
            <option value="">— Selecione um paciente —</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.full_name}
              </option>
            ))}
          </select>
        </div>

        {selectedPatientId && (
          <div className="border-border rounded-lg border bg-muted/30 p-4">
            <p className="text-muted-foreground text-sm">
              Será gerado um relatório PDF com:
            </p>
            <ul className="text-muted-foreground mt-2 list-inside space-y-1 text-sm">
              <li>✓ Todos os acessos aos dados do paciente</li>
              <li>✓ Data e hora de cada acesso</li>
              <li>✓ Tipo de operação (visualização, edição, eliminação)</li>
              <li>✓ Email do profissional que realizou a ação</li>
              <li>✓ Dados que foram acessados ou modificados</li>
            </ul>
          </div>
        )}
      </div>

      <Button
        onClick={handleExportCsv}
        disabled={!selectedPatientId || isLoading}
        size="lg"
        className="w-full"
      >
        <Download className="mr-2 size-4" />
        {isLoading ? 'Exportando relatório...' : 'Exportar Relatório CSV'}
      </Button>

      <div className="border-border rounded-lg border bg-amber-50 p-4">
        <p className="text-sm text-amber-900">
          <span className="font-semibold">⚠️ Aviso de conformidade:</span> Este
          relatório é confidencial e destina-se apenas ao paciente ou representante legal. Não deve
          ser partilhado sem consentimento. Guarde uma cópia desta geração para fins de auditoria.
        </p>
      </div>
    </div>
  );
}
