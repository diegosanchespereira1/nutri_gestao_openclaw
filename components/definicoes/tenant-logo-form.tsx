"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  type UpdateTenantLogoResult,
  updateTenantLogoAction,
} from "@/lib/actions/tenant-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_TENANT_LOGO_BYTES } from "@/lib/constants/tenant-logos-storage";
import { prepareImageInputInPlace } from "@/lib/images/prepare-image-upload";

const initial: UpdateTenantLogoResult | undefined = undefined;
const TOAST_AUTO_DISMISS_MS = 4000;
const TOAST_ANIMATION_MS = 220;

export function TenantLogoForm({
  defaultLogoUrl,
  defaultTenantName,
  canManage,
}: {
  defaultLogoUrl: string | null;
  defaultTenantName: string;
  canManage: boolean;
}) {
  const [state, formAction] = useActionState(updateTenantLogoAction, initial);
  const [tenantName, setTenantName] = useState(defaultTenantName);
  const [logoFileName, setLogoFileName] = useState("");
  const [removeChecked, setRemoveChecked] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = async (input: HTMLInputElement) => {
    setPrepareError(null);
    setPreparing(true);
    try {
      // Converte HEIC/AVIF, redimensiona e comprime no cliente; PNG é
      // preservado para manter transparência do logotipo.
      const res = await prepareImageInputInPlace(input, {
        maxDimension: 1024,
        maxBytes: MAX_TENANT_LOGO_BYTES,
        preservePng: true,
      });
      if (!res.ok) {
        setPrepareError(res.error);
        setLogoFileName("");
        return;
      }
      setLogoFileName(res.empty ? "" : input.value);
    } finally {
      setPreparing(false);
    }
  };

  const dirty =
    tenantName.trim() !== defaultTenantName.trim() ||
    logoFileName !== "" ||
    removeChecked;

  // Após salvar com sucesso, limpa os controles de logo (o botão volta a
  // desabilitar, pois não há mais alterações pendentes).
  useEffect(() => {
    if (!state?.ok) return;
    const frameId = window.requestAnimationFrame(() => {
      setLogoFileName("");
      setRemoveChecked(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [state]);
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    tone: "success" | "error";
    visible: boolean;
  } | null>(null);
  const hasLogo = Boolean(defaultLogoUrl);

  useEffect(() => {
    if (!state) return;
    const message = state.ok
      ? state.message ?? "Logotipo atualizado com sucesso."
      : state.error;
    const tone: "success" | "error" = state.ok ? "success" : "error";
    const frameId = window.requestAnimationFrame(() => {
      setToast({
        id: Date.now(),
        message,
        tone,
        visible: true,
      });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [state]);

  useEffect(() => {
    if (!toast?.visible) return;
    const hideId = window.setTimeout(() => {
      setToast((current) =>
        current ? { ...current, visible: false } : current,
      );
    }, TOAST_AUTO_DISMISS_MS);
    return () => window.clearTimeout(hideId);
  }, [toast?.id, toast?.visible]);

  useEffect(() => {
    if (!toast || toast.visible) return;
    const cleanupId = window.setTimeout(() => {
      setToast(null);
    }, TOAST_ANIMATION_MS);
    return () => window.clearTimeout(cleanupId);
  }, [toast]);

  return (
    <div className="max-w-xl space-y-6">
      <section className="border-border bg-card rounded-lg border p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-foreground text-sm font-semibold">
            Logotipo da empresa
          </h2>
          <p className="text-muted-foreground text-xs">
            Usado nos PDFs de checklist, e-mails e demais documentos gerados
            pelo sistema. Se nenhum logotipo for enviado, os documentos são
            gerados sem marca.
          </p>
        </div>

        <form action={formAction} onReset={(e) => e.preventDefault()} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">Nome da empresa / clínica</Label>
            <p className="text-muted-foreground text-xs">
              Aparece no topo dos relatórios e documentos. Se ficar em branco, é
              usado o nome do profissional.
            </p>
            <Input
              id="tenant-name"
              name="tenant_name"
              type="text"
              maxLength={120}
              placeholder="Ex.: Clínica Bem Nutrir"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              disabled={!canManage}
              autoComplete="organization"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant-logo-file">
              {hasLogo ? "Substituir logotipo" : "Enviar logotipo"}
            </Label>
            <p className="text-muted-foreground text-xs">
              PNG, JPEG, WebP, HEIC ou AVIF — a imagem é otimizada
              automaticamente. Recomendamos formato com fundo transparente e
              proporção horizontal.
            </p>

            {hasLogo ? (
              <div className="border-border bg-muted/30 flex flex-wrap items-center gap-4 rounded-md border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={defaultLogoUrl!}
                  alt="Logotipo atual da empresa"
                  className="border-border bg-background h-20 w-20 rounded-md border object-contain p-2"
                />
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="remove_logo"
                    value="1"
                    className="border-input size-4 accent-primary"
                    disabled={!canManage}
                    checked={removeChecked}
                    onChange={(e) => setRemoveChecked(e.target.checked)}
                  />
                  Remover logotipo atual
                </label>
              </div>
            ) : null}

            <Input
              ref={fileInputRef}
              id="tenant-logo-file"
              name="logo"
              type="file"
              accept="image/*"
              disabled={!canManage || preparing}
              onChange={(e) => void handleLogoChange(e.currentTarget)}
              className="border-input bg-background text-muted-foreground file:text-foreground h-auto rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5"
              aria-invalid={state?.ok === false}
              aria-describedby={
                state?.ok === false ? "tenant-logo-err" : "tenant-logo-hint"
              }
            />
            <p id="tenant-logo-hint" className="text-muted-foreground text-xs">
              {canManage
                ? "O arquivo fica armazenado em ambiente privado e apenas a sua equipe pode acessar."
                : "Você não tem permissão para alterar o logotipo neste momento."}
            </p>
          </div>

          {prepareError ? (
            <p className="text-destructive text-sm" role="alert">
              {prepareError}
            </p>
          ) : null}

          {state?.ok === false ? (
            <p
              id="tenant-logo-err"
              className="text-destructive text-sm"
              role="alert"
            >
              {state.error}
            </p>
          ) : null}

          <Button type="submit" disabled={!canManage || !dirty}>
            Salvar
          </Button>
        </form>
      </section>

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
            onClick={() =>
              setToast((current) =>
                current ? { ...current, visible: false } : current,
              )
            }
            className={`rounded px-1 py-0.5 text-sm leading-none transition ${
              toast.tone === "error"
                ? "text-destructive-foreground/80 hover:text-destructive-foreground"
                : "text-background/80 hover:text-background"
            }`}
            aria-label="Fechar notificação"
          >
            X
          </button>
        </div>
      ) : null}
    </div>
  );
}
