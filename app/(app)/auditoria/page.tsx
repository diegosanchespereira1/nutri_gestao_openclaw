import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Eye, LogOut, Trash2 } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { PageLayout } from '@/components/layout/page-layout';
import { buttonVariants } from '@/components/ui/button-variants';
import { AuditLogViewer } from '@/components/auditoria/audit-log-viewer';
import { createClient } from '@/lib/supabase/server';
import { loadAuditLogs } from '@/lib/actions/audit';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Auditoria | NutriGestão',
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const sp = await searchParams;
  const tableName = typeof sp.table === 'string' ? sp.table : undefined;

  const { rows: logs } = await loadAuditLogs({
    tableName,
    limit: 100,
  });

  const tableNames = [
    { id: 'patients', label: 'Pacientes' },
    { id: 'patient_nutrition_assessments', label: 'Avaliações Nutricionais' },
  ];

  const activeTable = tableName ?? 'all';

  return (
    <PageLayout>
      <PageHeader
        title="Auditoria"
        description="Histórico completo de ações em dados sensíveis — Compliance LGPD Art. 5(e)."
      />

      {/* Filtro por tabela */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/auditoria"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            activeTable === 'all' && 'border-teal-500 text-teal-600',
          )}
        >
          Todos
        </Link>
        {tableNames.map((table) => (
          <Link
            key={table.id}
            href={`/auditoria?table=${table.id}`}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              activeTable === table.id && 'border-teal-500 text-teal-600',
            )}
          >
            {table.label}
          </Link>
        ))}
      </div>

      {/* Lendas */}
      <div className="border-border bg-muted/20 rounded-lg border p-4">
        <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
          Legenda de operações
        </p>
        <ul className="space-y-1 text-sm">
          <li className="flex items-center gap-2">
            <span className="inline-block size-3 rounded-full bg-green-500" />
            <span>
              <span className="font-medium">Criado (INSERT):</span> Novo registo
              foi inserido
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block size-3 rounded-full bg-blue-500" />
            <span>
              <span className="font-medium">Editado (UPDATE):</span> Registo foi
              modificado
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block size-3 rounded-full bg-red-500" />
            <span>
              <span className="font-medium">Eliminado (DELETE):</span> Registo foi
              removido
            </span>
          </li>
        </ul>
      </div>

      {/* Info de proteção */}
      <div className="border-border rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">🔒 Dados protegidos:</span> CPF e datas
          de nascimento são mascaradas neste histórico. Campos sensíveis só são
          vistos em contexto de edição. Todos os logs são imutáveis e retenidos
          por 12 meses conforme LGPD Art. 5(e).
        </p>
      </div>

      {/* Logs */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          {logs.length} operação{logs.length !== 1 ? 's' : ''} registada
          {logs.length !== 1 ? 's' : ''}
        </h2>
        <AuditLogViewer logs={logs} />
      </div>

      {/* DSAR Links */}
      <div className="border-border space-y-2 rounded-lg border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold">Direitos do Titular (DSAR)</h3>
        <p className="text-muted-foreground text-sm">
          Profissionais podem gerar relatórios de acesso a dados de pacientes
          específicos para atender solicitações de direitos LGPD:
        </p>
        <Link
          href="/auditoria/dsar"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          <Eye className="mr-2 size-4" />
          Gerar Relatório DSAR
        </Link>
      </div>
    </PageLayout>
  );
}
