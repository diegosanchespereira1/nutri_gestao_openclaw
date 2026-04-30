"use client";

import { useActionState, useEffect, useState } from "react";

import {
  type UpdateTenantLogoResult,
  updateTenantLogoAction,
} from "@/lib/actions/tenant-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_TENANT_LOGO_BYTES } from "@/lib/constants/tenant-logos-storage";

const initial: UpdateTenantLogoResult | undefined = undefined;
const TOAST_AUTO_DISMISS_MS = 4000;
const TOAST_ANIMATION_MS = 220;

export function TenantLogoForm({
  defaultLogoUrl,
  canManage,
}: {
  defaultLogoUrl: string | null;
  canManage: boolean;
}) {
  const [state, formAction] = useActionState(updateTenantLogoAction, initial);
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

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-logo-file">
              {hasLogo ? "Substituir logotipo" : "Enviar logotipo"}
            </Label>
            <p className="text-muted-foreground text-xs">
              PNG, JPEG ou WebP até {Math.round(MAX_TENANT_LOGO_BYTES / 1024 / 1024)} MB.
              Recomendamos formato com fundo transparente e proporção
              horizontal.
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
                  />
                  Remover logotipo atual
                </label>
              </div>
            ) : null}

            <Input
              id="tenant-logo-file"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={!canManage}
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

          {state?.ok === false ? (
            <p
              id="tenant-logo-err"
              className="text-destructive text-sm"
              role="alert"
            >
              {state.error}
            </p>
          ) : null}

          <Button type="submit" disabled={!canManage}>
            Salvar logotipo
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
