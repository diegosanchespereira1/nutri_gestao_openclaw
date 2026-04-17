"use client";

// Story 2.6: Wizard de importação CSV/Excel — 3 etapas.
// Etapa 1: Upload + seleção de entidade
// Etapa 2: Mapeamento de colunas
// Etapa 3: Pré-visualização + confirmação de importação

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import {
  importClientsAction,
  importEstablishmentsAction,
  importPatientsAction,
} from "@/lib/actions/import";
import {
  applyMappings,
  downloadCsvTemplate,
  MAX_ROWS,
  readFileRows,
  validateRows,
} from "@/lib/import/parser";
import {
  type FieldMapping,
  type ImportEntity,
  type ParsedRow,
  getFieldsForEntity,
} from "@/lib/types/import";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PreviewTable, buildErrorMap } from "./preview-table";

// ── Tipos internos ─────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3;

type UploadState = {
  file: File;
  headers: string[];
  rawRows: string[][];
};

type ImportResultState =
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string }
  | null;

// ── Helpers de estilo ──────────────────────────────────────────────────────────

const selectClass =
  "border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

const ENTITY_LABELS: Record<ImportEntity, string> = {
  clientes: "Clientes",
  estabelecimentos: "Estabelecimentos",
  pacientes: "Pacientes",
};

function ImportStepIndicator({ step }: { step: WizardStep }) {
  return (
    <nav aria-label="Etapas do wizard" className="flex items-center gap-2 text-sm">
      {(
        [
          [1, "Upload"],
          [2, "Mapeamento"],
          [3, "Pré-visualização"],
        ] as [WizardStep, string][]
      ).map(([s, label], idx) => (
        <span key={s} className="flex items-center gap-2">
          {idx > 0 && <span className="text-foreground/20">›</span>}
          <span
            className={
              step === s
                ? "font-medium text-primary"
                : step > s
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
            }
          >
            {s}. {label}
          </span>
        </span>
      ))}
    </nav>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function ImportWizard() {
  const [step, setStep] = useState<WizardStep>(1);
  const [entity, setEntity] = useState<ImportEntity>("clientes");
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errorsByRow, setErrorsByRow] = useState<Map<number, string>>(new Map());
  const [ignoredRows, setIgnoredRows] = useState<Set<number>>(new Set());
  const [clientIdForImport, setClientIdForImport] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResultState>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Etapa 1 — Upload ──────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    setFileError(null);
    try {
      const rows = await readFileRows(file);
      if (rows.length < 2) {
        setFileError("O arquivo está vazio ou não contém dados além do cabeçalho.");
        return;
      }
      const [headerRow, ...dataRows] = rows;
      const headers = headerRow.map((h) => String(h).trim()).filter(Boolean);
      setUpload({ file, headers, rawRows: dataRows });
      // Inicializar mapeamentos com auto-match por nome de campo
      const fields = getFieldsForEntity(entity);
      const initial: FieldMapping[] = headers.map((col) => {
        const match = fields.find(
          (f) =>
            f.key === col.toLowerCase() ||
            f.label.toLowerCase() === col.toLowerCase(),
        );
        return { fileColumn: col, systemField: match?.key ?? null };
      });
      setMappings(initial);
    } catch (err) {
      setFileError(
        err instanceof Error ? err.message : "Erro ao ler o arquivo.",
      );
    }
  }, [entity]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleEntityChange = (newEntity: ImportEntity) => {
    setEntity(newEntity);
    // Resetar mapeamentos quando muda a entidade
    if (upload) {
      const fields = getFieldsForEntity(newEntity);
      const remapped: FieldMapping[] = upload.headers.map((col) => {
        const match = fields.find(
          (f) =>
            f.key === col.toLowerCase() ||
            f.label.toLowerCase() === col.toLowerCase(),
        );
        return { fileColumn: col, systemField: match?.key ?? null };
      });
      setMappings(remapped);
    }
    // Limpar arquivo se mudou entidade após upload
    setUpload(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetWizard = () => {
    setStep(1);
    setUpload(null);
    setMappings([]);
    setParsedRows([]);
    setErrorsByRow(new Map());
    setIgnoredRows(new Set());
    setClientIdForImport("");
    setResult(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Etapa 2 — Mapeamento ──────────────────────────────────────────────────

  const updateMapping = (fileColumn: string, systemField: string | null) => {
    setMappings((prev) =>
      prev.map((m) => (m.fileColumn === fileColumn ? { ...m, systemField } : m)),
    );
  };

  const handlePreview = () => {
    if (!upload) return;
    const rows = applyMappings(upload.rawRows, upload.headers, mappings);
    const { errors } = validateRows(entity, rows);
    const errMap = buildErrorMap(errors);
    setParsedRows(rows);
    setErrorsByRow(errMap);
    setIgnoredRows(new Set());
    setStep(3);
  };

  // ── Etapa 3 — Confirmação ─────────────────────────────────────────────────

  const toggleIgnore = (rowIndex: number) => {
    setIgnoredRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };

  const handleImport = async () => {
    setImporting(true);
    setResult(null);

    // Filtra linhas: remove erros (do preview) e linhas que o usuário ignorou manualmente.
    // Revalida as sobreviventes para obter array com tipo correto para a Server Action.
    const cleanRows = parsedRows.filter(
      (_, i) => !errorsByRow.has(i) && !ignoredRows.has(i),
    );
    const { valid: toImport } = validateRows(entity, cleanRows);

    let res: ImportResultState = null;

    try {
      if (entity === "clientes") {
        res = await importClientsAction(
          toImport as Parameters<typeof importClientsAction>[0],
        );
      } else if (entity === "estabelecimentos") {
        if (!clientIdForImport.trim()) {
          setResult({ ok: false, error: "Informe o ID do cliente para vincular os estabelecimentos." });
          setImporting(false);
          return;
        }
        res = await importEstablishmentsAction(
          toImport as Parameters<typeof importEstablishmentsAction>[0],
          clientIdForImport.trim(),
        );
      } else {
        if (!clientIdForImport.trim()) {
          setResult({ ok: false, error: "Informe o ID do cliente para vincular os pacientes." });
          setImporting(false);
          return;
        }
        res = await importPatientsAction(
          toImport as Parameters<typeof importPatientsAction>[0],
          clientIdForImport.trim(),
        );
      }
    } catch {
      res = { ok: false, error: "Erro inesperado ao importar. Tente novamente." };
    }

    setResult(res);
    setImporting(false);
  };

  const validToImport = parsedRows.filter(
    (_, i) => !errorsByRow.has(i) && !ignoredRows.has(i),
  ).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card className="max-w-4xl">
      <CardHeader className="border-b border-foreground/10 pb-4">
        <CardTitle className="text-base">Importação em massa</CardTitle>
        <CardDescription>
          Importe clientes, estabelecimentos ou pacientes a partir de um arquivo
          CSV ou Excel.
        </CardDescription>
        <div className="mt-2">
          <ImportStepIndicator step={step} />
        </div>
      </CardHeader>

      {/* ── ETAPA 1 — Upload ──────────────────────────────────────────────── */}
      {step === 1 && (
        <>
          <CardContent className="space-y-6 pt-6">
            {/* Seleção de entidade */}
            <div className="space-y-2">
              <Label htmlFor="import-entity">Tipo de dados a importar</Label>
              <select
                id="import-entity"
                value={entity}
                onChange={(e) =>
                  handleEntityChange(e.target.value as ImportEntity)
                }
                className={selectClass}
              >
                {(Object.keys(ENTITY_LABELS) as ImportEntity[]).map((k) => (
                  <option key={k} value={k}>
                    {ENTITY_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            {/* Drag & drop / file input */}
            <div className="space-y-2">
              <Label>Arquivo CSV ou Excel</Label>
              <div
                role="button"
                tabIndex={0}
                aria-label="Área de upload. Clique ou arraste um arquivo CSV ou Excel."
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    fileInputRef.current?.click();
                }}
                className={[
                  "flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : upload
                      ? "border-green-500/50 bg-green-50/40 dark:bg-green-950/20"
                      : "border-foreground/20 hover:border-foreground/40",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {upload ? (
                  <>
                    <FileSpreadsheet
                      className="size-8 text-green-600 dark:text-green-400"
                      aria-hidden
                    />
                    <div className="text-center">
                      <p className="font-medium text-sm">{upload.file.name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {upload.rawRows.length > MAX_ROWS
                          ? `⚠ Apenas as primeiras ${MAX_ROWS} linhas serão importadas (arquivo tem ${upload.rawRows.length})`
                          : `${upload.rawRows.length} linha${upload.rawRows.length !== 1 ? "s" : ""} detectada${upload.rawRows.length !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUpload(null);
                        setFileError(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      aria-label="Remover arquivo"
                      className="gap-1.5"
                    >
                      <X className="size-3.5" aria-hidden />
                      Remover
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="size-8 text-muted-foreground" aria-hidden />
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        Arraste aqui ou clique para selecionar
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Formatos aceitos: .csv, .xlsx — até {MAX_ROWS} linhas
                      </p>
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileInput}
                className="sr-only"
                aria-label="Selecionar arquivo para importação"
              />
              {fileError && (
                <p className="text-destructive text-xs flex items-center gap-1.5" role="alert">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                  {fileError}
                </p>
              )}
            </div>

            {/* Download template */}
            <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-2">
              <p className="font-medium">Não sabe o formato?</p>
              <p className="text-muted-foreground text-xs">
                Baixe o modelo CSV para {ENTITY_LABELS[entity].toLowerCase()} e
                preencha com seus dados.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadCsvTemplate(entity)}
                className="gap-1.5"
              >
                <Download className="size-3.5" aria-hidden />
                Baixar modelo CSV
              </Button>
            </div>
          </CardContent>

          <CardFooter className="justify-end gap-3">
            <Button
              onClick={() => setStep(2)}
              disabled={!upload}
            >
              Próximo: Mapeamento
            </Button>
          </CardFooter>
        </>
      )}

      {/* ── ETAPA 2 — Mapeamento ──────────────────────────────────────────── */}
      {step === 2 && upload && (
        <>
          <CardContent className="space-y-6 pt-6">
            <p className="text-sm text-muted-foreground">
              Para cada coluna do seu arquivo, selecione o campo correspondente
              no sistema. Colunas sem mapeamento serão ignoradas.
            </p>

            {/* ClientId para estabelecimentos/pacientes */}
            {(entity === "estabelecimentos" || entity === "pacientes") && (
              <div className="space-y-2 rounded-lg border border-foreground/10 bg-muted/30 p-4">
                <Label htmlFor="client-id-input">
                  ID do cliente ao qual vincular os {ENTITY_LABELS[entity].toLowerCase()}
                </Label>
                <input
                  id="client-id-input"
                  type="text"
                  value={clientIdForImport}
                  onChange={(e) => setClientIdForImport(e.target.value)}
                  placeholder="UUID do cliente (ex.: 550e8400-e29b-41d4-…)"
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none font-mono"
                />
                <p className="text-muted-foreground text-xs">
                  Encontre o ID na URL da página do cliente: /clientes/[id]
                </p>
              </div>
            )}

            {/* Grade de mapeamento */}
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs font-medium text-muted-foreground px-1">
                <span>Coluna no arquivo</span>
                <span aria-hidden>→</span>
                <span>Campo no sistema</span>
              </div>
              {mappings.map((m) => (
                <div
                  key={m.fileColumn}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"
                >
                  <div className="rounded-md border border-foreground/10 bg-muted/30 px-3 py-2 text-sm font-mono truncate">
                    {m.fileColumn}
                  </div>
                  <span className="text-muted-foreground text-sm" aria-hidden>
                    →
                  </span>
                  <select
                    value={m.systemField ?? ""}
                    onChange={(e) =>
                      updateMapping(
                        m.fileColumn,
                        e.target.value || null,
                      )
                    }
                    aria-label={`Mapeamento para coluna ${m.fileColumn}`}
                    className={selectClass}
                  >
                    <option value="">— ignorar —</option>
                    {getFieldsForEntity(entity).map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                        {f.required ? " *" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <p className="text-muted-foreground text-xs">
              * Campos obrigatórios. Linhas sem esses campos serão marcadas com
              erro na pré-visualização.
            </p>
          </CardContent>

          <CardFooter className="justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button onClick={handlePreview}>Pré-visualizar</Button>
          </CardFooter>
        </>
      )}

      {/* ── ETAPA 3 — Pré-visualização + Confirmação ──────────────────────── */}
      {step === 3 && (
        <>
          <CardContent className="space-y-6 pt-6">
            {result ? (
              /* Resultado da importação */
              <div
                className={[
                  "rounded-lg border p-5 text-sm space-y-2",
                  result.ok
                    ? "border-green-500/40 bg-green-50/40 dark:bg-green-950/20"
                    : "border-destructive/40 bg-destructive/5",
                ].join(" ")}
                role="status"
              >
                {result.ok ? (
                  <>
                    <p className="font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                      Importação concluída
                    </p>
                    <p className="text-muted-foreground">
                      {result.imported} registro{result.imported !== 1 ? "s" : ""} importado{result.imported !== 1 ? "s" : ""}.
                      {result.skipped > 0
                        ? ` ${result.skipped} ignorado${result.skipped !== 1 ? "s" : ""} (erro ou limite).`
                        : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium flex items-center gap-2 text-destructive">
                      <AlertCircle className="size-4 shrink-0" aria-hidden />
                      Erro na importação
                    </p>
                    <p className="text-muted-foreground">{result.error}</p>
                  </>
                )}
              </div>
            ) : (
              /* Tabela de pré-visualização */
              <>
                {errorsByRow.size > 0 && (
                  <div
                    className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/20 p-4 text-sm"
                    role="note"
                  >
                    <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden />
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        {errorsByRow.size} linha{errorsByRow.size !== 1 ? "s" : ""} com erro
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Linhas com erro serão ignoradas na importação. Você pode
                        marcar linhas corretas para ignorar manualmente.
                      </p>
                    </div>
                  </div>
                )}

                <PreviewTable
                  rows={parsedRows}
                  errorsByRow={errorsByRow}
                  fields={getFieldsForEntity(entity).map((f) => f.key)}
                  ignoredRows={ignoredRows}
                  onToggleIgnore={toggleIgnore}
                />
              </>
            )}
          </CardContent>

          <CardFooter
            className={[
              "gap-3",
              result ? "justify-end" : "justify-between",
            ].join(" ")}
          >
            {result ? (
              <Button onClick={resetWizard}>Nova importação</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Voltar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importing || validToImport === 0}
                  aria-busy={importing}
                >
                  {importing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Importando…
                    </>
                  ) : (
                    `Importar ${validToImport} registro${validToImport !== 1 ? "s" : ""} válido${validToImport !== 1 ? "s" : ""}`
                  )}
                </Button>
              </>
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
}
