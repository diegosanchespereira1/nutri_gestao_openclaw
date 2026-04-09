'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import type { AuditLogRow } from '@/lib/types/audit';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'há poucos segundos';
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `há ${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `há ${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString('pt-BR');
}

function getOperationLabel(operation: string): string {
  const labels: Record<string, string> = {
    INSERT: '🆕 Criado',
    UPDATE: '✏️ Editado',
    DELETE: '🗑️ Eliminado',
  };
  return labels[operation] ?? operation;
}

function getOperationBadgeColor(operation: string): string {
  switch (operation) {
    case 'INSERT':
      return 'bg-green-100 text-green-800';
    case 'UPDATE':
      return 'bg-blue-100 text-blue-800';
    case 'DELETE':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function AuditLogViewer({ logs }: { logs: AuditLogRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm">
          Nenhuma ação registada no histórico de auditoria.
        </p>
      </div>
    );
  }

  return (
    <ul
      className="border-border divide-border divide-y overflow-hidden rounded-lg border bg-card shadow-sm"
      aria-label="Histórico de auditoria"
    >
      {logs.map((log) => {
        const isExpanded = expanded === log.id;
        const timestamp = new Date(log.created_at);
        const relativeTime = formatRelativeTime(timestamp);

        return (
          <li key={log.id} className="p-0">
            <button
              onClick={() =>
                setExpanded(isExpanded ? null : log.id)
              }
              className="hover:bg-muted/50 focus-visible:ring-ring w-full px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              aria-expanded={isExpanded}
              aria-label={`Detalhe: ${getOperationLabel(log.operation)} em ${log.table_name}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                        getOperationBadgeColor(log.operation),
                      )}
                    >
                      {getOperationLabel(log.operation)}
                    </span>
                    <span className="text-foreground text-sm font-medium">
                      {log.table_name}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {relativeTime} · ID: {log.record_id?.slice(0, 8)}...
                  </p>
                </div>
                <div className="shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-border border-t bg-muted/20 px-4 py-3">
                <div className="space-y-3">
                  {log.old_values && (
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                        Valores anteriores
                      </p>
                      <pre className="bg-card overflow-x-auto rounded border border-border p-2 text-xs font-mono">
                        {JSON.stringify(log.old_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  {log.new_values && (
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                        Valores novos
                      </p>
                      <pre className="bg-card overflow-x-auto rounded border border-border p-2 text-xs font-mono">
                        {JSON.stringify(log.new_values, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="border-border border-t pt-3">
                    <dl className="grid gap-2 text-xs">
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground font-medium">
                          Registo ID:
                        </dt>
                        <dd className="font-mono text-foreground">
                          {log.record_id}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted-foreground font-medium">
                          Timestamp:
                        </dt>
                        <dd className="text-foreground">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </dd>
                      </div>
                      {log.ip_address && (
                        <div className="flex gap-2">
                          <dt className="text-muted-foreground font-medium">
                            IP:
                          </dt>
                          <dd className="font-mono text-foreground">
                            {log.ip_address}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
