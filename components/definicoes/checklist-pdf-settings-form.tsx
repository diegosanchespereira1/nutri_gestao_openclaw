"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  savePdfSettingsAction,
  type SavePdfSettingsResult,
} from "@/lib/actions/checklist-pdf-settings";
import {
  DEFAULT_PDF_SETTINGS,
  type ChecklistPdfSettings,
} from "@/lib/constants/checklist-pdf-settings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const initial: SavePdfSettingsResult | undefined = undefined;

/* ── Miniatura de pré-visualização ──────────────────────────────────────── */
function PdfHeaderPreview({
  bgColor,
  textColor,
  accentColor,
}: {
  bgColor: string;
  textColor: string;
  accentColor: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-md border border-border shadow-sm"
      aria-label="Pré-visualização do cabeçalho do PDF"
      role="img"
    >
      {/* Banda de cabeçalho */}
      <div
        className="relative px-4 py-3"
        style={{ backgroundColor: bgColor }}
      >
        {/* Linha de acento na base */}
        <div
          className="absolute inset-x-0 bottom-0 h-[3px]"
          style={{ backgroundColor: accentColor }}
        />
        <div className="flex items-center gap-3">
          {/* Placeholder do logotipo */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded border text-[9px] font-bold"
            style={{ borderColor: accentColor, color: accentColor, backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            LOGO
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-[9px] font-semibold uppercase tracking-wider"
              style={{ color: accentColor }}
            >
              DOSSIÊ DE AUDITORIA
            </p>
            <p
              className="mt-0.5 text-sm font-bold leading-tight"
              style={{ color: textColor }}
            >
              Nome do Checklist
            </p>
            <p
              className="mt-0.5 text-[10px]"
              style={{ color: textColor, opacity: 0.7 }}
            >
              Estabelecimento · Profissional · CRN 0000
            </p>
          </div>
          {/* Score box */}
          <div
            className="flex h-10 w-14 shrink-0 flex-col items-center justify-center rounded border"
            style={{ borderColor: accentColor, backgroundColor: "rgba(0,0,0,0.18)" }}
          >
            <span className="text-base font-bold leading-none" style={{ color: textColor }}>
              92%
            </span>
            <span className="mt-0.5 text-[8px] font-semibold uppercase" style={{ color: accentColor }}>
              Excelente
            </span>
          </div>
        </div>
      </div>
      {/* KPI strip */}
      <div
        className="flex divide-x divide-border border-t border-border"
        style={{ backgroundColor: "#F1F2F4" }}
      >
        {["Avaliados 24", "Conformes 20", "N. Conf. 4", "N. Aplic. 0"].map((label) => (
          <div key={label} className="flex-1 py-1.5 text-center text-[8px] text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Seletor de cor com input + preview ─────────────────────────────────── */
function ColorField({
  id,
  name,
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  id: string;
  name: string;
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const textRef = useRef<HTMLInputElement>(null);

  function handleColorPicker(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value.toUpperCase());
  }

  function handleText(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.toUpperCase();
    onChange(v);
  }

  function handleTextBlur() {
    // Normaliza: se não começar com #, adiciona
    let v = value.trim().toUpperCase();
    if (v && !v.startsWith("#")) v = `#${v}`;
    if (/^#[0-9A-F]{6}$/.test(v)) {
      onChange(v);
    } else {
      // Reverte para o valor anterior válido se inválido
      if (textRef.current) textRef.current.value = value;
    }
  }

  const isValid = /^#[0-9A-F]{6}$/i.test(value);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex items-center gap-2">
        {/* Color picker nativo — pequeno e clicável */}
        <div className="relative size-9 shrink-0 overflow-hidden rounded-md border border-border shadow-xs">
          <div
            className="absolute inset-0 rounded-md"
            style={{ backgroundColor: isValid ? value : "#cccccc" }}
          />
          <input
            type="color"
            value={isValid ? value : "#cccccc"}
            onChange={handleColorPicker}
            disabled={disabled}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            aria-label={`Selecionar ${label}`}
          />
        </div>
        {/* Input de texto hex */}
        <input
          ref={textRef}
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={handleText}
          onBlur={handleTextBlur}
          disabled={disabled}
          maxLength={7}
          placeholder="#000000"
          className="h-9 w-28 rounded-md border border-input bg-background px-3 font-mono text-sm uppercase text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-invalid={!isValid}
        />
        {!isValid && (
          <span className="text-xs text-destructive">Formato inválido</span>
        )}
      </div>
    </div>
  );
}

/* ── Componente principal ───────────────────────────────────────────────── */
export function ChecklistPdfSettingsForm({
  initialSettings,
  canManage,
}: {
  initialSettings: ChecklistPdfSettings;
  canManage: boolean;
}) {
  const [state, formAction, isPending] = useActionState(savePdfSettingsAction, initial);

  const [headerBg,   setHeaderBg]   = useState(initialSettings.headerBgColor);
  const [headerText, setHeaderText] = useState(initialSettings.headerTextColor);
  const [accent,     setAccent]     = useState(initialSettings.accentColor);
  const [clientSignatureRequired, setClientSignatureRequired] = useState(
    initialSettings.clientSignatureRequired,
  );

  const [toast, setToast] = useState<{
    id: number;
    message: string;
    tone: "success" | "error";
    visible: boolean;
  } | null>(null);

  useEffect(() => {
    if (!state) return;
    const message = state.ok ? "Configurações salvas com sucesso." : state.error;
    const tone: "success" | "error" = state.ok ? "success" : "error";
    const id = window.setTimeout(() => {
      setToast({ id: Date.now(), message, tone, visible: true });
    }, 0);
    return () => window.clearTimeout(id);
  }, [state]);

  useEffect(() => {
    if (!toast?.visible) return;
    const id = setTimeout(() => setToast((t) => t ? { ...t, visible: false } : t), 4000);
    return () => clearTimeout(id);
  }, [toast?.id, toast?.visible]);

  useEffect(() => {
    if (!toast || toast.visible) return;
    const id = setTimeout(() => setToast(null), 220);
    return () => clearTimeout(id);
  }, [toast]);

  function handleReset() {
    setHeaderBg(DEFAULT_PDF_SETTINGS.headerBgColor);
    setHeaderText(DEFAULT_PDF_SETTINGS.headerTextColor);
    setAccent(DEFAULT_PDF_SETTINGS.accentColor);
    setClientSignatureRequired(DEFAULT_PDF_SETTINGS.clientSignatureRequired);
  }

  const allValid =
    /^#[0-9A-F]{6}$/i.test(headerBg) &&
    /^#[0-9A-F]{6}$/i.test(headerText) &&
    /^#[0-9A-F]{6}$/i.test(accent);

  return (
    <div className="max-w-xl space-y-6">
      <form action={formAction} onReset={(e) => e.preventDefault()} className="space-y-6">
        <input type="hidden" name="header_bg_color" value={headerBg} />
        <input type="hidden" name="header_text_color" value={headerText} />
        <input type="hidden" name="accent_color" value={accent} />
        {clientSignatureRequired ? (
          <input type="hidden" name="client_signature_required" value="on" />
        ) : null}

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              Assinatura do cliente no dossiê
            </h2>
            <p className="text-xs text-muted-foreground">
              Define se a assinatura do responsável pelo estabelecimento é obrigatória ao
              aprovar o dossiê. A assinatura da profissional continua sempre obrigatória.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="client-signature-required"
              checked={clientSignatureRequired}
              disabled={!canManage || isPending}
              onCheckedChange={(v) => setClientSignatureRequired(v === true)}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <Label
                htmlFor="client-signature-required"
                className="text-sm font-normal leading-snug"
              >
                Exigir assinatura do cliente ao aprovar o dossiê
              </Label>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Desmarque para tornar a assinatura do cliente opcional no fechamento do checklist.
                O passo do cliente continua visível; se não assinar, o dossiê fica só com a assinatura da profissional.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 space-y-1">
            <h2 className="text-sm font-semibold text-foreground">
              Cores do cabeçalho do PDF
            </h2>
            <p className="text-xs text-muted-foreground">
              Personalize as cores da banda de cabeçalho que aparece no PDF de dossiê
              gerado ao finalizar cada checklist. O logotipo da empresa é inserido
              automaticamente a partir do upload em{" "}
              <strong>Definições → Empresa e logotipo</strong>.
            </p>
          </div>

          <div className="mb-5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Pré-visualização
            </p>
            <PdfHeaderPreview
              bgColor={allValid ? headerBg : DEFAULT_PDF_SETTINGS.headerBgColor}
              textColor={allValid ? headerText : DEFAULT_PDF_SETTINGS.headerTextColor}
              accentColor={allValid ? accent : DEFAULT_PDF_SETTINGS.accentColor}
            />
          </div>

          <div className="space-y-5">
            <ColorField
              id="header-bg-color"
              name="_header_bg_color_display"
              label="Cor de fundo do cabeçalho"
              description="Fundo da banda superior do cabeçalho. Cores escuras ficam mais elegantes."
              value={headerBg}
              onChange={setHeaderBg}
              disabled={!canManage || isPending}
            />

            <ColorField
              id="header-text-color"
              name="_header_text_color_display"
              label="Cor do texto do cabeçalho"
              description="Cor do título do checklist e dos metadados dentro do cabeçalho."
              value={headerText}
              onChange={setHeaderText}
              disabled={!canManage || isPending}
            />

            <ColorField
              id="accent-color"
              name="_accent_color_display"
              label="Cor de acento"
              description="Linha de rodapé do cabeçalho, etiqueta 'DOSSIÊ', caixa de score e detalhes."
              value={accent}
              onChange={setAccent}
              disabled={!canManage || isPending}
            />
          </div>
        </section>

        {state?.ok === false && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}

        {!canManage && (
          <p className="text-xs text-muted-foreground">
            Apenas o titular da conta pode alterar estas configurações.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            disabled={!canManage || isPending || !allValid}
          >
            {isPending ? "Salvando…" : "Salvar configurações"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!canManage || isPending}
          >
            Restaurar padrão
          </Button>
        </div>
      </form>

      {toast ? (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-3 rounded-md px-4 py-3 text-sm shadow-lg transition-all duration-200 ${
            toast.visible
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          } ${
            toast.tone === "error"
              ? "bg-destructive text-destructive-foreground"
              : "bg-foreground text-background"
          }`}
        >
          <span className="leading-5">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast((t) => t ? { ...t, visible: false } : t)}
            className={`rounded px-1 py-0.5 text-sm leading-none transition ${
              toast.tone === "error"
                ? "text-destructive-foreground/80 hover:text-destructive-foreground"
                : "text-background/80 hover:text-background"
            }`}
            aria-label="Fechar notificação"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
