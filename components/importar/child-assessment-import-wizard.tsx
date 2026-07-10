"use client";

// Wizard de importação em massa de avaliações nutricionais infantis (ex.: pesagem de
// turma escolar). Mesmo padrão de 3 etapas do ImportWizard (Story 2.6), adaptado:
// cada linha cria/casa o cadastro do paciente e grava a avaliação na mesma operação;
// sexo é obrigatório na planilha; percentis/diagnóstico são sempre recalculados no
// servidor (não são lidos do arquivo).

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

import { importChildAssessmentsAction } from "@/lib/actions/import-child-assessments";
import { MAX_ROWS, applyMappings, readFileRows } from "@/lib/import/parser";
import {
  CHILD_ASSESSMENT_TEMPLATE_HEADERS,
  downloadChildAssessmentXlsxTemplate,
  matchChildAssessmentColumn,
  validateChildAssessmentRows,
} from "@/lib/import/child-assessment-parser";
import {
  CHILD_ASSESSMENT_FIELDS,
  type ChildAssessmentImportLink,
  type ChildAssessmentImportResult,
} from "@/lib/types/child-assessment-import";
import type { FieldMapping, ParsedRow } from "@/lib/types/import";
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

// ── Tipos internos ─────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3;

type UploadState = {
  file: File;
  headers: string[];
  rawRows: string[][];
};

// ── Helpers de estilo ────────────────────────────────────────────────────────

const selectClass =
  "border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

const inputClass =
  "border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

type ClientOption = { id: string; legal_name: string; trade_name: string | null };
type EstablishmentOption = { id: string; name: string };

/** Rótulos em PT-BR para o cabeçalho da tabela de pré-visualização (etapa 3). */
const CHILD_ASSESSMENT_COLUMN_LABELS: Record<string, string> = Object.fromEntries(
  CHILD_ASSESSMENT_TEMPLATE_HEADERS.map((h) => [h.key, h.header]),
);

function ImportStepIndicator({ step }: { step: WizardStep }) {
  return (
    <nav aria-label="Etapas do wizard" className="flex items-center gap-2 text-sm">
      {(
        [
          [1, "Vínculo e upload"],
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

// ── Componente principal ─────────────────────────────────────────────────────

export function ChildAssessmentImportWizard({
  clients = [],
  establishmentsByClient = {},
  existingAssessmentDates = {},
}: {
  /** Clientes do tenant, para o seletor de vínculo (não pede UUID ao usuário). */
  clients?: ClientOption[];
  /** Mapa clientId → estabelecimentos desse cliente (só clientes PJ têm entradas). */
  establishmentsByClient?: Record<string, EstablishmentOption[]>;
  /** Datas (AAAA-MM-DD) já registradas por paciente existente — chave via matchChildKey.
   *  Usado na pré-visualização para bloquear reenvio da mesma pesagem. */
  existingAssessmentDates?: Record<string, string[]>;
}) {
  const [step, setStep] = useState<WizardStep>(1);

  // Vínculo do lote (etapa 1) — "" = paciente independente
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");
  const [batchNote, setBatchNote] = useState(""); // ex.: "2026/1 Maternal"

  const clientEstablishments = selectedClientId
    ? (establishmentsByClient[selectedClientId] ?? [])
    : [];
  const requiresEstablishment = selectedClientId !== "" && clientEstablishments.length > 0;

  const [upload, setUpload] = useState<UploadState | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errorsByRow, setErrorsByRow] = useState<Map<number, string>>(new Map());
  const [ignoredRows, setIgnoredRows] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ChildAssessmentImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Etapa 1 — Upload ────────────────────────────────────────────────────

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
      const initial: FieldMapping[] = headers.map((col) => ({
        fileColumn: col,
        systemField: matchChildAssessmentColumn(col),
      }));
      setMappings(initial);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Erro ao ler o arquivo.");
    }
  }, []);

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

  const resetWizard = () => {
    setStep(1);
    setUpload(null);
    setMappings([]);
    setParsedRows([]);
    setErrorsByRow(new Map());
    setIgnoredRows(new Set());
    setResult(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Etapa 2 — Mapeamento ────────────────────────────────────────────────

  const updateMapping = (fileColumn: string, systemField: string | null) => {
    setMappings((prev) =>
      prev.map((m) => (m.fileColumn === fileColumn ? { ...m, systemField } : m)),
    );
  };

  const handlePreview = () => {
    if (!upload) return;
    const rows = applyMappings(upload.rawRows, upload.headers, mappings);
    const { errors } = validateChildAssessmentRows(rows, existingAssessmentDates);
    const errMap = buildErrorMap(errors);
    setParsedRows(rows);
    setErrorsByRow(errMap);
    setIgnoredRows(new Set());
    setStep(3);
  };

  // ── Etapa 3 — Confirmação ───────────────────────────────────────────────

  const toggleIgnore = (rowIndex: number) => {
    setIgnoredRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };

  const handleImport = async () => {
    if (requiresEstablishment && !selectedEstablishmentId) {
      setResult({ ok: false, error: "Selecione o estabelecimento para este cliente." });
      return;
    }

    setImporting(true);
    setResult(null);

    const cleanRows = parsedRows.filter((_, i) => !errorsByRow.has(i) && !ignoredRows.has(i));
    const { valid } = validateChildAssessmentRows(cleanRows, existingAssessmentDates);

    const note = batchNote.trim();
    const toImport = valid.map((row) => ({
      ...row,
      clinical_notes: note
        ? [`Turma/período: ${note}`, row.clinical_notes].filter(Boolean).join(" — ")
        : row.clinical_notes,
    }));

    const link: ChildAssessmentImportLink = selectedClientId
      ? {
          kind: "linked",
          clientId: selectedClientId,
          establishmentId: requiresEstablishment ? selectedEstablishmentId : null,
        }
      : { kind: "independent" };

    let res: ChildAssessmentImportResult;
    try {
      res = await importChildAssessmentsAction(toImport, link);
    } catch {
      res = { ok: false, error: "Erro inesperado ao importar. Tente novamente." };
    }

    setResult(res);
    setImporting(false);
  };

  const validToImport = parsedRows.filter(
    (_, i) => !errorsByRow.has(i) && !ignoredRows.has(i),
  ).length;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Card className="max-w-4xl">
      <CardHeader className="border-b border-foreground/10 pb-4">
        <CardTitle className="text-base">Importação de avaliações infantis</CardTitle>
        <CardDescription>
          Importe pesagens de uma turma (peso, estatura e nascimento) a partir de um
          arquivo CSV ou Excel. O paciente é criado automaticamente se ainda não existir
          (casado por nome + data de nascimento), e a avaliação é calculada pelo sistema
          a partir das curvas de referência — os percentis do arquivo não são usados.
        </CardDescription>
        <div className="mt-2">
          <ImportStepIndicator step={step} />
        </div>
      </CardHeader>

      {/* ── ETAPA 1 — Vínculo + Upload ─────────────────────────────────── */}
      {step === 1 && (
        <>
          <CardContent className="space-y-6 pt-6">
            {/* Vínculo dos pacientes */}
            <div className="space-y-3 rounded-lg border border-foreground/10 bg-muted/30 p-4">
              <Label htmlFor="link-client-select">Vínculo dos pacientes desta importação</Label>

              {clients.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Nenhum cliente cadastrado ainda — os pacientes serão importados como
                  particulares. Cadastre um cliente/estabelecimento primeiro se quiser
                  vincular esta turma a uma escola ou instituição.
                </p>
              ) : (
                <>
                  <select
                    id="link-client-select"
                    value={selectedClientId}
                    onChange={(e) => {
                      setSelectedClientId(e.target.value);
                      setSelectedEstablishmentId("");
                    }}
                    className={selectClass}
                  >
                    <option value="">— Paciente particular (sem cliente) —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legal_name}
                        {c.trade_name ? ` · ${c.trade_name}` : ""}
                      </option>
                    ))}
                  </select>

                  {requiresEstablishment && (
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="link-establishment-select">
                        Estabelecimento{" "}
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                      </Label>
                      <select
                        id="link-establishment-select"
                        value={selectedEstablishmentId}
                        onChange={(e) => setSelectedEstablishmentId(e.target.value)}
                        className={selectClass}
                        required
                      >
                        <option value="">— Selecione o estabelecimento —</option>
                        {clientEstablishments.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedClientId && clientEstablishments.length === 0 && (
                    <p className="text-amber-700 dark:text-amber-400 text-xs flex items-center gap-1.5">
                      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                      Este cliente ainda não tem estabelecimento cadastrado.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Turma / período (opcional) */}
            <div className="space-y-1.5">
              <Label htmlFor="batch-note-input">Turma / período (opcional)</Label>
              <input
                id="batch-note-input"
                type="text"
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
                placeholder="Ex.: 2026/1 Maternal"
                className={inputClass}
              />
              <p className="text-muted-foreground text-xs">
                Gravado como observação em cada avaliação importada.
              </p>
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
                  if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
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
                Baixe o modelo em Excel (.xlsx) com as colunas esperadas (nome,
                nascimento, data da pesagem, sexo, peso e estatura) e preencha com seus
                dados.
              </p>
              <Button
                variant="ghost"
                size="sm"
                disabled={downloadingTemplate}
                onClick={async () => {
                  setDownloadingTemplate(true);
                  try {
                    await downloadChildAssessmentXlsxTemplate();
                  } finally {
                    setDownloadingTemplate(false);
                  }
                }}
                className="gap-1.5"
              >
                <Download className="size-3.5" aria-hidden />
                Baixar modelo Excel
              </Button>
            </div>
          </CardContent>

          <CardFooter className="justify-end gap-3">
            <Button onClick={() => setStep(2)} disabled={!upload}>
              Próximo: Mapeamento
            </Button>
          </CardFooter>
        </>
      )}

      {/* ── ETAPA 2 — Mapeamento ────────────────────────────────────────── */}
      {step === 2 && upload && (
        <>
          <CardContent className="space-y-6 pt-6">
            <p className="text-sm text-muted-foreground">
              Para cada coluna do seu arquivo, selecione o campo correspondente no
              sistema. Colunas sem mapeamento serão ignoradas — inclusive percentis e
              diagnóstico já calculados, que o sistema recalcula automaticamente.
            </p>

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
                    onChange={(e) => updateMapping(m.fileColumn, e.target.value || null)}
                    aria-label={`Mapeamento para coluna ${m.fileColumn}`}
                    className={selectClass}
                  >
                    <option value="">— ignorar —</option>
                    {CHILD_ASSESSMENT_FIELDS.map((f) => (
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
              * Campos obrigatórios. Linhas sem esses campos serão marcadas com erro na
              pré-visualização.
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

      {/* ── ETAPA 3 — Pré-visualização + Confirmação ────────────────────── */}
      {step === 3 && (
        <>
          <CardContent className="space-y-6 pt-6">
            {result ? (
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
                      {result.assessmentsImported} avaliaç
                      {result.assessmentsImported !== 1 ? "ões importadas" : "ão importada"}.{" "}
                      {result.patientsCreated} paciente
                      {result.patientsCreated !== 1 ? "s criados" : " criado"}, {result.patientsMatched}{" "}
                      já existente{result.patientsMatched !== 1 ? "s" : ""}.
                      {result.skipped > 0
                        ? ` ${result.skipped} linha${result.skipped !== 1 ? "s" : ""} ignorada${result.skipped !== 1 ? "s" : ""} (erro ou limite).`
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
              <>
                {errorsByRow.size > 0 && (
                  <div
                    className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/20 p-4 text-sm"
                    role="note"
                  >
                    <AlertCircle
                      className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5"
                      aria-hidden
                    />
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-400">
                        {errorsByRow.size} linha{errorsByRow.size !== 1 ? "s" : ""} com erro
                      </p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Linhas com erro serão ignoradas na importação. Você pode marcar
                        linhas corretas para ignorar manualmente.
                      </p>
                    </div>
                  </div>
                )}

                <PreviewTable
                  rows={parsedRows}
                  errorsByRow={errorsByRow}
                  fields={CHILD_ASSESSMENT_FIELDS.map((f) => f.key)}
                  fieldLabels={CHILD_ASSESSMENT_COLUMN_LABELS}
                  ignoredRows={ignoredRows}
                  onToggleIgnore={toggleIgnore}
                />
              </>
            )}
          </CardContent>

          <CardFooter className={["gap-3", result ? "justify-end" : "justify-between"].join(" ")}>
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
                    `Importar ${validToImport} avaliaç${validToImport !== 1 ? "ões válidas" : "ão válida"}`
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
