"use client";

// Wizard de atualização de preços (e demais campos) em massa de
// matérias-primas: baixa uma planilha com os dados atuais + ID de cada item,
// o usuário edita (o preço, tipicamente) e reenvia. O casamento é sempre por
// ID — se o nome for editado na planilha, o nome muda no banco também,
// porque a linha certa continua sendo achada pelo ID, nunca pelo nome antigo.

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import { importRawMaterialPricesAction } from "@/lib/actions/import-raw-material-prices";
import { MAX_ROWS, applyMappings, readFileRows } from "@/lib/import/parser";
import { parseDecimalPtBr } from "@/lib/import/raw-material-import-parser";
import {
  RAW_MATERIAL_PRICE_TEMPLATE_HEADERS,
  downloadRawMaterialPriceXlsx,
  matchRawMaterialPriceColumn,
  validateRawMaterialPriceRows,
} from "@/lib/import/raw-material-price-import-parser";
import {
  RAW_MATERIAL_PRICE_IMPORT_FIELDS,
  type RawMaterialPriceExistingSnapshot,
  type RawMaterialPriceImportResult,
  type RawMaterialPriceImportRow,
} from "@/lib/types/raw-material-price-import";
import { RECIPE_LINE_UNIT_LABELS } from "@/lib/constants/recipe-line-units";
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
import { buildErrorMap } from "./preview-table";

type WizardStep = 1 | 2 | 3;

type UploadState = {
  file: File;
  headers: string[];
  rawRows: string[][];
};

export type ExistingRawMaterialForPriceUpdate = {
  id: string;
  name: string;
  price_unit: RawMaterialPriceExistingSnapshot["price_unit"];
  unit_price_brl: number;
  notes: string | null;
};

const selectClass =
  "border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

function formatBrl(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function unitLabel(unit: string): string {
  return (RECIPE_LINE_UNIT_LABELS as Record<string, string>)[unit] ?? unit;
}

function ImportStepIndicator({ step }: { step: WizardStep }) {
  return (
    <nav aria-label="Etapas do wizard" className="flex items-center gap-2 text-sm">
      {(
        [
          [1, "Baixar e reenviar"],
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

export function RawMaterialPriceImportWizard({
  existingRawMaterials = [],
}: {
  existingRawMaterials?: ExistingRawMaterialForPriceUpdate[];
}) {
  const [step, setStep] = useState<WizardStep>(1);

  const existingById = useMemo(() => {
    const map = new Map<string, RawMaterialPriceExistingSnapshot>();
    for (const m of existingRawMaterials) {
      map.set(m.id, {
        name: m.name,
        price_unit: m.price_unit,
        unit_price_brl: m.unit_price_brl,
        notes: m.notes,
      });
    }
    return map;
  }, [existingRawMaterials]);

  const [upload, setUpload] = useState<UploadState | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errorsByRow, setErrorsByRow] = useState<Map<number, string>>(new Map());
  const [existingByRow, setExistingByRow] = useState<
    Map<number, RawMaterialPriceExistingSnapshot>
  >(new Map());
  const [ignoredRows, setIgnoredRows] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<RawMaterialPriceImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadingSheet, setDownloadingSheet] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        systemField: matchRawMaterialPriceColumn(col),
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
    setExistingByRow(new Map());
    setIgnoredRows(new Set());
    setResult(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateMapping = (fileColumn: string, systemField: string | null) => {
    setMappings((prev) =>
      prev.map((m) => (m.fileColumn === fileColumn ? { ...m, systemField } : m)),
    );
  };

  const handlePreview = () => {
    if (!upload) return;
    const rows = applyMappings(upload.rawRows, upload.headers, mappings);
    const { errors, existingByRow: existingMap } = validateRawMaterialPriceRows(
      rows,
      existingById,
    );
    setParsedRows(rows);
    setErrorsByRow(buildErrorMap(errors));
    setExistingByRow(existingMap);
    setIgnoredRows(new Set());
    setStep(3);
  };

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

    const cleanRows = parsedRows.filter((_, i) => !errorsByRow.has(i) && !ignoredRows.has(i));
    const { valid } = validateRawMaterialPriceRows(cleanRows, existingById);

    let res: RawMaterialPriceImportResult;
    try {
      res = await importRawMaterialPricesAction(valid);
    } catch {
      res = { ok: false, error: "Erro inesperado ao importar. Tente novamente." };
    }

    setResult(res);
    setImporting(false);
  };

  const validToImport = parsedRows.filter(
    (_, i) => !errorsByRow.has(i) && !ignoredRows.has(i),
  ).length;

  // Quantas linhas válidas realmente mudam preço e/ou nome (para o resumo da
  // pré-visualização) — comparando o valor da planilha com o snapshot atual.
  let priceChangesCount = 0;
  let nameChangesCount = 0;
  parsedRows.forEach((row, i) => {
    if (errorsByRow.has(i) || ignoredRows.has(i)) return;
    const existing = existingByRow.get(i);
    if (!existing) return;
    const newPrice = parseDecimalPtBr(row.unit_price_brl);
    if (newPrice != null && newPrice !== existing.unit_price_brl) priceChangesCount += 1;
    const newName = (row.name ?? "").trim();
    if (newName && newName !== existing.name) nameChangesCount += 1;
  });

  return (
    <Card className="max-w-4xl">
      <CardHeader className="border-b border-foreground/10 pb-4">
        <CardTitle className="text-base">Atualização de preços em massa</CardTitle>
        <CardDescription>
          Baixe a planilha com todas as suas matérias-primas (inclui um ID interno em
          cada linha), ajuste os preços — ou o que quiser — e reenvie. O casamento é
          sempre pelo ID, então a lista nunca duplica, mesmo que você mude o nome de
          algum item na planilha.
        </CardDescription>
        <div className="mt-2">
          <ImportStepIndicator step={step} />
        </div>
      </CardHeader>

      {/* ── ETAPA 1 — Baixar + reenviar ───────────────────────────────── */}
      {step === 1 && (
        <>
          <CardContent className="space-y-6 pt-6">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm space-y-2">
              <p className="font-medium">1. Baixe a planilha atual</p>
              <p className="text-muted-foreground text-xs">
                {existingRawMaterials.length === 0
                  ? "Você ainda não tem matérias-primas cadastradas."
                  : `Contém ${existingRawMaterials.length} matéria${existingRawMaterials.length !== 1 ? "s" : ""}-prima${existingRawMaterials.length !== 1 ? "s" : ""} — não apague nem edite a coluna ID, ela é o que garante que a atualização acerte o item certo.`}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={downloadingSheet || existingRawMaterials.length === 0}
                onClick={async () => {
                  setDownloadingSheet(true);
                  try {
                    await downloadRawMaterialPriceXlsx(existingRawMaterials);
                  } finally {
                    setDownloadingSheet(false);
                  }
                }}
                className="gap-1.5"
              >
                <Download className="size-3.5" aria-hidden />
                Baixar planilha atual (.xlsx)
              </Button>
            </div>

            <div className="space-y-2">
              <Label>2. Reenvie a planilha editada</Label>
              <div
                role="button"
                tabIndex={0}
                aria-label="Área de upload. Clique ou arraste a planilha editada."
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
                aria-label="Selecionar planilha editada"
              />
              {fileError && (
                <p className="text-destructive text-xs flex items-center gap-1.5" role="alert">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                  {fileError}
                </p>
              )}
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
              Confirme o mapeamento de colunas — normalmente já vem correto, porque a
              planilha foi gerada pelo próprio sistema. A coluna ID precisa
              obrigatoriamente estar mapeada.
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
                    {RAW_MATERIAL_PRICE_IMPORT_FIELDS.map((f) => (
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
              * Campos obrigatórios. Linhas sem ID válido (ou com ID que não é seu)
              serão rejeitadas — esse fluxo só atualiza itens que já existem.
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
                      Preços atualizados
                    </p>
                    <p className="text-muted-foreground">
                      {result.updated} item{result.updated !== 1 ? "s" : ""} atualizado
                      {result.updated !== 1 ? "s" : ""}.{" "}
                      {result.affectedRecipes > 0
                        ? `Afeta ${result.affectedRecipes} receita${result.affectedRecipes !== 1 ? "s" : ""} — reabra cada ficha técnica para ver custos atualizados.`
                        : "Nenhuma linha de receita usa os itens atualizados."}
                      {result.skipped > 0
                        ? ` ${result.skipped} linha${result.skipped !== 1 ? "s" : ""} não aplicada${result.skipped !== 1 ? "s" : ""} (erro ou ID inválido).`
                        : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium flex items-center gap-2 text-destructive">
                      <AlertCircle className="size-4 shrink-0" aria-hidden />
                      Erro na atualização
                    </p>
                    <p className="text-muted-foreground">{result.error}</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="size-4" aria-hidden />
                    {validToImport} item{validToImport !== 1 ? "s" : ""} válido
                    {validToImport !== 1 ? "s" : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {priceChangesCount} preço{priceChangesCount !== 1 ? "s" : ""} sendo
                    atualizado{priceChangesCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {nameChangesCount} nome{nameChangesCount !== 1 ? "s" : ""} sendo
                    atualizado{nameChangesCount !== 1 ? "s" : ""}
                  </span>
                </div>

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
                        Linhas com erro (ID ausente/inválido, nome duplicado etc.) serão
                        ignoradas na atualização.
                      </p>
                    </div>
                  </div>
                )}

                <RawMaterialPriceDiffTable
                  rows={parsedRows}
                  errorsByRow={errorsByRow}
                  existingByRow={existingByRow}
                  ignoredRows={ignoredRows}
                  onToggleIgnore={toggleIgnore}
                />
              </>
            )}
          </CardContent>

          <CardFooter className={["gap-3", result ? "justify-end" : "justify-between"].join(" ")}>
            {result ? (
              <Button onClick={resetWizard}>Nova atualização</Button>
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
                      Atualizando…
                    </>
                  ) : (
                    `Atualizar ${validToImport} item${validToImport !== 1 ? "s" : ""}`
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

// ── Tabela de pré-visualização com diff "antes → depois" ───────────────────

function DiffCell({ oldValue, newValue }: { oldValue: string; newValue: string }) {
  if (oldValue === newValue) {
    return <span>{newValue || <span className="text-muted-foreground/50">—</span>}</span>;
  }
  return (
    <span className="flex flex-col leading-tight">
      <span className="text-muted-foreground text-xs line-through">{oldValue || "—"}</span>
      <span className="font-medium text-primary">{newValue || "—"}</span>
    </span>
  );
}

function RawMaterialPriceDiffTable({
  rows,
  errorsByRow,
  existingByRow,
  ignoredRows,
  onToggleIgnore,
}: {
  rows: ParsedRow[];
  errorsByRow: Map<number, string>;
  existingByRow: Map<number, RawMaterialPriceExistingSnapshot>;
  ignoredRows: Set<number>;
  onToggleIgnore: (rowIndex: number) => void;
}) {
  return (
    <div className="border-border overflow-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border border-b bg-primary/10 dark:bg-primary/15">
            <th className="text-foreground w-10 px-3 py-2 text-left font-bold">#</th>
            {RAW_MATERIAL_PRICE_TEMPLATE_HEADERS.filter((h) => h.key !== "id").map((h) => (
              <th
                key={h.key}
                className="text-foreground whitespace-nowrap px-3 py-2 text-left font-bold"
              >
                {h.header}
              </th>
            ))}
            <th className="text-foreground px-3 py-2 text-left font-bold">Status</th>
            <th className="w-24 px-3 py-2 text-left font-bold">
              <span className="sr-only">Ignorar linha</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const errMsg = errorsByRow.get(i);
            const existing = existingByRow.get(i);
            const ignored = ignoredRows.has(i);
            const hasError = Boolean(errMsg) && !ignored;

            return (
              <tr
                key={i}
                className={[
                  "border-b border-foreground/5 last:border-0",
                  ignored ? "bg-muted/20 opacity-40" : hasError ? "bg-destructive/5" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                <td className="max-w-[200px] px-3 py-2">
                  {existing ? (
                    <DiffCell oldValue={existing.name} newValue={(row.name ?? "").trim()} />
                  ) : (
                    (row.name ?? "").trim() || <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {existing ? (
                    <DiffCell
                      oldValue={unitLabel(existing.price_unit)}
                      newValue={unitLabel((row.price_unit ?? "").trim().toLowerCase())}
                    />
                  ) : (
                    row.price_unit || <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {existing ? (
                    <DiffCell
                      oldValue={formatBrl(existing.unit_price_brl)}
                      newValue={row.unit_price_brl ?? ""}
                    />
                  ) : (
                    row.unit_price_brl || <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="max-w-[180px] px-3 py-2">
                  {existing ? (
                    <DiffCell
                      oldValue={existing.notes ?? ""}
                      newValue={(row.notes ?? "").trim()}
                    />
                  ) : (
                    row.notes || <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {ignored ? (
                    <span className="text-xs text-muted-foreground">Ignorado</span>
                  ) : hasError ? (
                    <span className="text-xs text-destructive" title={errMsg}>
                      {errMsg}
                    </span>
                  ) : (
                    <span className="text-xs text-green-700 dark:text-green-400">OK</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {errMsg ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleIgnore(i)}
                      aria-label={ignored ? `Incluir linha ${i + 1}` : `Ignorar linha ${i + 1}`}
                      className="text-xs"
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
  );
}
