"use client";

// Wizard de upload em massa de matérias-primas. Mesmo padrão de 3 etapas do
// ChildAssessmentImportWizard, com uma etapa 3 enriquecida: quando o nome de
// uma linha já existe cadastrado, o usuário escolhe por linha (ou em lote)
// entre sobrescrever, criar um novo (sufixo "_1") ou ignorar.

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import { importRawMaterialsAction } from "@/lib/actions/import-raw-materials";
import { MAX_ROWS, applyMappings, readFileRows } from "@/lib/import/parser";
import {
  RAW_MATERIAL_TEMPLATE_HEADERS,
  downloadRawMaterialXlsxTemplate,
  matchRawMaterialColumn,
  rawMaterialScopeKey,
  validateRawMaterialRows,
} from "@/lib/import/raw-material-import-parser";
import {
  RAW_MATERIAL_IMPORT_FIELDS,
  type RawMaterialImportClientOption,
  type RawMaterialImportConflict,
  type RawMaterialImportEstablishmentOption,
  type RawMaterialImportResolution,
  type RawMaterialImportResult,
  type RawMaterialImportRow,
  type RawMaterialImportSubmitRow,
} from "@/lib/types/raw-material-import";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buildErrorMap } from "./preview-table";

// ── Tipos internos ─────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3;

type UploadState = {
  file: File;
  headers: string[];
  rawRows: string[][];
};

export type ExistingRawMaterialOption = {
  id: string;
  name: string;
  price_unit: RawMaterialImportConflict["existingPriceUnit"];
  unit_price_brl: number;
  notes: string | null;
  client_id: string | null;
  establishment_id: string | null;
};

// ── Helpers de estilo ────────────────────────────────────────────────────────

const selectClass =
  "border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

function formatBrl(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

const RESOLUTION_LABELS: Record<RawMaterialImportResolution, string> = {
  create: "Criar",
  overwrite: "Sobrescrever existente",
  create_new: "Criar novo (sufixo _1)",
  ignore: "Ignorar esta linha",
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

// ── Componente principal ─────────────────────────────────────────────────────

export function RawMaterialImportWizard({
  existingRawMaterials = [],
  pjClients = [],
  establishments = [],
}: {
  existingRawMaterials?: ExistingRawMaterialOption[];
  pjClients?: RawMaterialImportClientOption[];
  establishments?: RawMaterialImportEstablishmentOption[];
}) {
  const [step, setStep] = useState<WizardStep>(1);

  const existingByScopedKey = useMemo(() => {
    const map = new Map<string, RawMaterialImportConflict>();
    for (const m of existingRawMaterials) {
      // Itens sem cliente (legado, ainda não migrado) não entram aqui — não
      // há chave escopada para comparar, então nunca colidem com uma linha
      // nova (que sempre traz cliente resolvido pela planilha).
      if (!m.client_id) continue;
      map.set(rawMaterialScopeKey(m.client_id, m.establishment_id, m.name), {
        existingId: m.id,
        existingPriceUnit: m.price_unit,
        existingUnitPriceBrl: m.unit_price_brl,
        existingNotes: m.notes,
      });
    }
    return map;
  }, [existingRawMaterials]);

  const [upload, setUpload] = useState<UploadState | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errorsByRow, setErrorsByRow] = useState<Map<number, string>>(new Map());
  const [conflictsByRow, setConflictsByRow] = useState<Map<number, RawMaterialImportConflict>>(
    new Map(),
  );
  const [resolvedByRow, setResolvedByRow] = useState<Map<number, RawMaterialImportRow>>(
    new Map(),
  );
  const [resolutions, setResolutions] = useState<Map<number, RawMaterialImportResolution>>(
    new Map(),
  );
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<RawMaterialImportResult | null>(null);
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
        systemField: matchRawMaterialColumn(col),
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
    setConflictsByRow(new Map());
    setResolvedByRow(new Map());
    setResolutions(new Map());
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
    const {
      errors,
      conflictsByRow: conflicts,
      valid,
      validRowIndex,
    } = validateRawMaterialRows(rows, existingByScopedKey, pjClients, establishments);
    setParsedRows(rows);
    setErrorsByRow(buildErrorMap(errors));
    setConflictsByRow(conflicts);
    const resolved = new Map<number, RawMaterialImportRow>();
    valid.forEach((r, vi) => resolved.set(validRowIndex[vi], r));
    setResolvedByRow(resolved);
    // Default seguro: linhas em conflito começam como "ignorar" — o usuário
    // precisa escolher explicitamente sobrescrever ou criar novo.
    const initialResolutions = new Map<number, RawMaterialImportResolution>();
    for (const rowIndex of conflicts.keys()) {
      initialResolutions.set(rowIndex, "ignore");
    }
    setResolutions(initialResolutions);
    setStep(3);
  };

  // ── Etapa 3 — Confirmação ───────────────────────────────────────────────

  const setResolutionFor = (rowIndex: number, resolution: RawMaterialImportResolution) => {
    setResolutions((prev) => {
      const next = new Map(prev);
      next.set(rowIndex, resolution);
      return next;
    });
  };

  const applyResolutionToAllConflicts = (resolution: RawMaterialImportResolution) => {
    setResolutions((prev) => {
      const next = new Map(prev);
      for (const rowIndex of conflictsByRow.keys()) {
        next.set(rowIndex, resolution);
      }
      return next;
    });
  };

  const buildSubmitRows = useCallback((): RawMaterialImportSubmitRow[] => {
    const out: RawMaterialImportSubmitRow[] = [];
    parsedRows.forEach((row, i) => {
      if (errorsByRow.has(i)) return;
      const resolved = resolvedByRow.get(i);
      if (!resolved) return; // já coberto por errorsByRow, defensivo

      const isConflict = conflictsByRow.has(i);
      const resolution: RawMaterialImportResolution = isConflict
        ? (resolutions.get(i) ?? "ignore")
        : "create";

      out.push({
        ...resolved,
        resolution,
      });
    });
    return out;
  }, [parsedRows, errorsByRow, resolvedByRow, conflictsByRow, resolutions]);

  const handleImport = async () => {
    setImporting(true);
    setResult(null);

    const toImport = buildSubmitRows();

    let res: RawMaterialImportResult;
    try {
      res = await importRawMaterialsAction(toImport);
    } catch {
      res = { ok: false, error: "Erro inesperado ao importar. Tente novamente." };
    }

    setResult(res);
    setImporting(false);
  };

  const submitPreview = buildSubmitRows();
  const willCreate = submitPreview.filter((r) => r.resolution === "create").length;
  const willOverwrite = submitPreview.filter((r) => r.resolution === "overwrite").length;
  const willCreateNew = submitPreview.filter((r) => r.resolution === "create_new").length;
  const willIgnore = submitPreview.filter((r) => r.resolution === "ignore").length;
  const totalToApply = willCreate + willOverwrite + willCreateNew;
  const pendingConflicts = [...conflictsByRow.keys()].filter(
    (i) => !errorsByRow.has(i) && (resolutions.get(i) ?? "ignore") === "ignore",
  ).length;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Card className="max-w-4xl">
      <CardHeader className="border-b border-foreground/10 pb-4">
        <CardTitle className="text-base">Upload em massa de matérias-primas</CardTitle>
        <CardDescription>
          Cadastre várias matérias-primas de uma vez a partir de um arquivo CSV ou
          Excel. Se o nome de uma linha já existir cadastrado (nome exato, sem
          diferenciar maiúsculas/minúsculas), você escolhe o que fazer com ela.
        </CardDescription>
        <div className="mt-2">
          <ImportStepIndicator step={step} />
        </div>
      </CardHeader>

      {/* ── ETAPA 1 — Upload ───────────────────────────────────────────── */}
      {step === 1 && (
        <>
          <CardContent className="space-y-6 pt-6">
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

            <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-2">
              <div className="flex items-center gap-1.5">
                <p className="font-medium">Não sabe o formato?</p>
                <Tooltip>
                  <TooltipTrigger
                    className="text-muted-foreground hover:text-foreground inline-flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Como preencher a planilha"
                  >
                    <HelpCircle className="size-4" aria-hidden />
                  </TooltipTrigger>
                  <TooltipContent side="right" align="start">
                    <p className="font-medium mb-1">Como preencher cada coluna</p>
                    <ul className="space-y-1">
                      <li>
                        <strong>Nome do produto:</strong> obrigatório. É usado para
                        detectar se o item já existe (não diferencia maiúsculas de
                        minúsculas).
                      </li>
                      <li>
                        <strong>Unidade:</strong> g, kg, ml, l ou un (também aceita por
                        extenso: grama, quilo, litro, unidade…).
                      </li>
                      <li>
                        <strong>Preço unitário:</strong> só números, com vírgula ou
                        ponto — ex.: 6,90.
                      </li>
                      <li>
                        <strong>Cliente:</strong> obrigatório — nome exato do cliente já
                        cadastrado (veja a aba "Clientes e estabelecimentos" do modelo).
                        A matéria-prima nunca aparece para outro cliente.
                      </li>
                      <li>
                        <strong>Estabelecimento:</strong> opcional. Vazio = disponível em
                        todos os estabelecimentos deste cliente.
                      </li>
                      <li>
                        <strong>Observações:</strong> opcional.
                      </li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-muted-foreground text-xs">
                Baixe o modelo em Excel (.xlsx) com as colunas esperadas (nome, unidade,
                preço unitário, cliente e observações) e preencha com seus dados — o
                arquivo vem só com o cabeçalho, sem linhas de exemplo, e traz uma segunda
                aba com os nomes exatos de clientes e estabelecimentos aceitos.
              </p>
              <Button
                variant="ghost"
                size="sm"
                disabled={downloadingTemplate}
                onClick={async () => {
                  setDownloadingTemplate(true);
                  try {
                    await downloadRawMaterialXlsxTemplate({
                      clientOptions: pjClients,
                      establishmentOptions: establishments,
                    });
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
              sistema. Colunas sem mapeamento serão ignoradas.
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
                    {RAW_MATERIAL_IMPORT_FIELDS.map((f) => (
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
                      {result.created} criada{result.created !== 1 ? "s" : ""},{" "}
                      {result.updated} atualizada{result.updated !== 1 ? "s" : ""}
                      {result.ignored > 0
                        ? `, ${result.ignored} ignorada${result.ignored !== 1 ? "s" : ""}`
                        : ""}
                      .
                      {result.skipped > 0
                        ? ` ${result.skipped} linha${result.skipped !== 1 ? "s" : ""} não importada${result.skipped !== 1 ? "s" : ""} (erro).`
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
                        Linhas com erro serão ignoradas na importação.
                      </p>
                    </div>
                  </div>
                )}

                {conflictsByRow.size > 0 && (
                  <div
                    className="flex flex-col gap-3 rounded-lg border border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/20 p-4 text-sm"
                    role="note"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5"
                        aria-hidden
                      />
                      <div>
                        <p className="font-medium text-amber-700 dark:text-amber-400">
                          {conflictsByRow.size} nome{conflictsByRow.size !== 1 ? "s" : ""} já
                          cadastrado{conflictsByRow.size !== 1 ? "s" : ""}
                        </p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          Escolha o que fazer com cada linha na tabela abaixo (coluna Ação).
                          Por padrão elas são ignoradas — nada é sobrescrito sem sua confirmação.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-amber-400/30 pt-3">
                      <span className="text-xs text-muted-foreground">
                        Aplicar a todos os conflitos:
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => applyResolutionToAllConflicts("overwrite")}
                      >
                        Sobrescrever
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => applyResolutionToAllConflicts("create_new")}
                      >
                        Criar novo (_1)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => applyResolutionToAllConflicts("ignore")}
                      >
                        Ignorar
                      </Button>
                    </div>
                  </div>
                )}

                <RawMaterialPreviewTable
                  rows={parsedRows}
                  errorsByRow={errorsByRow}
                  conflictsByRow={conflictsByRow}
                  resolutions={resolutions}
                  onChangeResolution={setResolutionFor}
                />
              </>
            )}
          </CardContent>

          <CardFooter
            className={[
              "flex-wrap gap-3",
              result ? "justify-end" : "justify-between",
            ].join(" ")}
          >
            {result ? (
              <Button onClick={resetWizard}>Novo upload</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Voltar
                </Button>
                <div className="flex flex-col items-end gap-1.5">
                  {pendingConflicts > 0 && (
                    <p className="text-muted-foreground text-xs">
                      {pendingConflicts} conflito{pendingConflicts !== 1 ? "s" : ""} ainda
                      será{pendingConflicts !== 1 ? "ão" : ""} ignorado
                      {pendingConflicts !== 1 ? "s" : ""} — escolha uma ação acima se quiser
                      incluí-los.
                    </p>
                  )}
                  <Button
                    onClick={handleImport}
                    disabled={importing || totalToApply === 0}
                    aria-busy={importing}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Importando…
                      </>
                    ) : (
                      `Aplicar ${totalToApply} linha${totalToApply !== 1 ? "s" : ""}` +
                      (willIgnore > 0 ? ` (${willIgnore} ignorada${willIgnore !== 1 ? "s" : ""})` : "")
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
}

// ── Tabela de pré-visualização com resolução de conflito por linha ─────────

function RawMaterialPreviewTable({
  rows,
  errorsByRow,
  conflictsByRow,
  resolutions,
  onChangeResolution,
}: {
  rows: ParsedRow[];
  errorsByRow: Map<number, string>;
  conflictsByRow: Map<number, RawMaterialImportConflict>;
  resolutions: Map<number, RawMaterialImportResolution>;
  onChangeResolution: (rowIndex: number, resolution: RawMaterialImportResolution) => void;
}) {
  return (
    <div className="border-border overflow-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border border-b bg-primary/10 dark:bg-primary/15">
            <th className="text-foreground w-10 px-3 py-2 text-left font-bold">#</th>
            {RAW_MATERIAL_TEMPLATE_HEADERS.map((h) => (
              <th
                key={h.key}
                className="text-foreground whitespace-nowrap px-3 py-2 text-left font-bold"
              >
                {h.header}
              </th>
            ))}
            <th className="text-foreground px-3 py-2 text-left font-bold">Situação</th>
            <th className="text-foreground w-48 px-3 py-2 text-left font-bold">Ação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const errMsg = errorsByRow.get(i);
            const conflict = conflictsByRow.get(i);
            const resolution = resolutions.get(i) ?? "ignore";

            return (
              <tr
                key={i}
                className={[
                  "border-b border-foreground/5 last:border-0",
                  errMsg
                    ? "bg-destructive/5"
                    : conflict
                      ? "bg-amber-50/40 dark:bg-amber-950/10"
                      : "",
                ].join(" ")}
              >
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                <td className="max-w-[220px] truncate px-3 py-2" title={row.name ?? ""}>
                  {row.name || <span className="text-muted-foreground/50">—</span>}
                </td>
                <td className="px-3 py-2">
                  {row.price_unit ? (
                    (RECIPE_LINE_UNIT_LABELS as Record<string, string>)[
                      row.price_unit.trim().toLowerCase()
                    ] ?? row.price_unit
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.unit_price_brl || <span className="text-muted-foreground/50">—</span>}
                </td>
                <td className="max-w-[160px] truncate px-3 py-2" title={row.client_name ?? ""}>
                  {row.client_name || <span className="text-muted-foreground/50">—</span>}
                </td>
                <td
                  className="max-w-[160px] truncate px-3 py-2"
                  title={row.establishment_name ?? ""}
                >
                  {row.establishment_name || (
                    <span className="text-muted-foreground/50">Todos</span>
                  )}
                </td>
                <td
                  className="max-w-[180px] truncate px-3 py-2"
                  title={row.notes ?? ""}
                >
                  {row.notes || <span className="text-muted-foreground/50">—</span>}
                </td>
                <td className="px-3 py-2">
                  {errMsg ? (
                    <span className="text-xs text-destructive" title={errMsg}>
                      {errMsg}
                    </span>
                  ) : conflict ? (
                    <span className="text-xs text-amber-700 dark:text-amber-400">
                      Já existe ({formatBrl(conflict.existingUnitPriceBrl)})
                    </span>
                  ) : (
                    <span className="text-xs text-green-700 dark:text-green-400">Novo</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {!errMsg && conflict ? (
                    <select
                      value={resolution}
                      onChange={(e) =>
                        onChangeResolution(i, e.target.value as RawMaterialImportResolution)
                      }
                      aria-label={`Ação para a linha ${i + 1}`}
                      className={selectClass + " h-8 text-xs"}
                    >
                      <option value="ignore">{RESOLUTION_LABELS.ignore}</option>
                      <option value="overwrite">{RESOLUTION_LABELS.overwrite}</option>
                      <option value="create_new">{RESOLUTION_LABELS.create_new}</option>
                    </select>
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
