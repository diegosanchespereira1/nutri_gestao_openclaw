"use client";

// Story 2.6: Tabela de pré-visualização de importação com destaque de erros por linha.

import { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ParsedRow, RowError } from "@/lib/types/import";

const PAGE_SIZE = 20;

type Props = {
  rows: ParsedRow[];
  errorsByRow: Map<number, string>;
  fields: string[];
  /** Linhas ignoradas pelo usuário (índices dos dados, sem cabeçalho). */
  ignoredRows: Set<number>;
  onToggleIgnore: (rowIndex: number) => void;
};

export function PreviewTable({
  rows,
  errorsByRow,
  fields,
  ignoredRows,
  onToggleIgnore,
}: Props) {
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const start = currentPage * PAGE_SIZE;
  const visibleRows = rows.slice(start, start + PAGE_SIZE);

  const validCount = rows.filter(
    (_, i) => !errorsByRow.has(i) && !ignoredRows.has(i),
  ).length;

  const errorCount = rows.filter(
    (_, i) => errorsByRow.has(i) && !ignoredRows.has(i),
  ).length;

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
          <CheckCircle2 className="size-4" aria-hidden />
          {validCount} válidos
        </span>
        {errorCount > 0 && (
          <span className="flex items-center gap-1.5 text-destructive">
            <AlertCircle className="size-4" aria-hidden />
            {errorCount} com erro
          </span>
        )}
        {ignoredRows.size > 0 && (
          <span className="text-muted-foreground">{ignoredRows.size} ignorados</span>
        )}
      </div>

      {/* Table */}
      <div className="border-border overflow-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b bg-primary/10 dark:bg-primary/15">
              <th className="text-foreground w-10 px-3 py-2 text-left font-bold">
                #
              </th>
              {fields.map((f) => (
                <th
                  key={f}
                  className="text-foreground whitespace-nowrap px-3 py-2 text-left font-bold"
                >
                  {f}
                </th>
              ))}
              <th className="text-foreground px-3 py-2 text-left font-bold">
                Status
              </th>
              <th className="w-24 px-3 py-2 text-left font-bold">
                <span className="sr-only">Ignorar linha</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, relIdx) => {
              const absIdx = start + relIdx;
              const errMsg = errorsByRow.get(absIdx);
              const ignored = ignoredRows.has(absIdx);
              const hasError = Boolean(errMsg) && !ignored;

              return (
                <tr
                  key={absIdx}
                  className={[
                    "border-b border-foreground/5 last:border-0",
                    ignored
                      ? "bg-muted/20 opacity-40"
                      : hasError
                        ? "bg-destructive/5"
                        : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {absIdx + 1}
                  </td>
                  {fields.map((f) => (
                    <td
                      key={f}
                      className="max-w-[180px] truncate px-3 py-2"
                      title={row[f] ?? ""}
                    >
                      {row[f] ? (
                        row[f]
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    {ignored ? (
                      <span className="text-xs text-muted-foreground">Ignorado</span>
                    ) : hasError ? (
                      <span className="text-xs text-destructive" title={errMsg}>
                        {errMsg}
                      </span>
                    ) : (
                      <span className="text-xs text-green-700 dark:text-green-400">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {errMsg ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleIgnore(absIdx)}
                        aria-label={
                          ignored
                            ? `Incluir linha ${absIdx + 1}`
                            : `Ignorar linha ${absIdx + 1}`
                        }
                        className="h-6 px-2 text-xs"
                      >
                        {ignored ? "Incluir" : "Ignorar"}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            Página {currentPage + 1} de {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={currentPage === totalPages - 1}
              aria-label="Próxima página"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Converte o array de RowError para Map<rowIndex, message> para lookup rápido. */
export function buildErrorMap(errors: RowError[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const e of errors) {
    map.set(e.rowIndex, e.message);
  }
  return map;
}
