"use client";

import { useActionState, useEffect, useState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import {
  type UpdateProfileResult,
  updateProfileAction,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_PROFILE_PHOTO_BYTES } from "@/lib/constants/profile-photos-storage";
import { createClient } from "@/lib/supabase/client";
import { formatBrazilPhoneInput } from "@/lib/validators/br-phone";

const initial: UpdateProfileResult | undefined = undefined;
const TOAST_AUTO_DISMISS_MS = 4000;
const TOAST_ANIMATION_MS = 220;

export function PerfilForm({
  defaultFullName,
  defaultEmail,
  pendingEmail,
  defaultPhone,
  defaultCrn,
  defaultPhotoUrl,
}: {
  defaultFullName: string;
  defaultEmail: string;
  pendingEmail: string | null;
  defaultPhone: string;
  defaultCrn: string;
  defaultPhotoUrl: string | null;
}) {
  const [state, formAction] = useActionState(updateProfileAction, initial);
  const [fullNameValue, setFullNameValue] = useState(defaultFullName);
  const [emailValue, setEmailValue] = useState(defaultEmail);
  const [phoneValue, setPhoneValue] = useState(() =>
    formatBrazilPhoneInput(defaultPhone),
  );
  const [crnValue, setCrnValue] = useState(defaultCrn);
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [confirmPasswordValue, setConfirmPasswordValue] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    visible: boolean;
  } | null>(null);
  const hasPhoto = Boolean(defaultPhotoUrl);

  useEffect(() => {
    if (state?.ok !== true) return;
    const frameId = window.requestAnimationFrame(() => {
      setToast({
        id: Date.now(),
        message: state.message ?? "Perfil atualizado com sucesso.",
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

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPasswordValue !== confirmPasswordValue) {
      setPasswordError("As palavras-passe não coincidem.");
      return;
    }
    if (newPasswordValue.length < 12) {
      setPasswordError("A nova senha deve ter pelo menos 12 caracteres.");
      return;
    }

    setPasswordLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPasswordValue,
    });
    setPasswordLoading(false);

    if (error) {
      const message = error.message.toLowerCase();
      const weakPassword =
        message.includes("password") &&
        (message.includes("short") ||
          message.includes("weak") ||
          message.includes("least") ||
          message.includes("minimum") ||
          message.includes("complex"));
      if (weakPassword) {
        setPasswordError(
          "A nova senha não cumpre os requisitos mínimos de segurança.",
        );
        return;
      }
      setPasswordError("Não foi possível alterar a senha. Tente novamente.");
      return;
    }

    setNewPasswordValue("");
    setConfirmPasswordValue("");
    setPasswordSuccess("Senha alterada com sucesso.");
  }

  return (
    <div className="max-w-xl space-y-8">
      <form action={formAction} className="space-y-4">
        {pendingEmail ? (
          <div className="border-border bg-muted/40 rounded-md border p-3">
            <p className="text-sm font-medium">
              Alteração de email pendente de confirmação
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Confirmar no endereço <span className="font-medium">{pendingEmail}</span>{" "}
              para concluir a troca.
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="perfil-name">Nome completo</Label>
          <Input
            id="perfil-name"
            name="full_name"
            required
            value={fullNameValue}
            onChange={(event) => setFullNameValue(event.target.value)}
            autoComplete="name"
            aria-invalid={state?.ok === false}
            aria-describedby={state?.ok === false ? "perfil-err" : undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="perfil-email">Email</Label>
          <Input
            id="perfil-email"
            name="email"
            type="email"
            required
            value={emailValue}
            onChange={(event) => setEmailValue(event.target.value)}
            autoComplete="email"
            aria-invalid={state?.ok === false}
            aria-describedby={state?.ok === false ? "perfil-err" : undefined}
          />
          <p className="text-muted-foreground text-xs">
            Ao alterar, enviamos um link de confirmação para o novo email.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="perfil-phone">Telefone</Label>
          <Input
            id="perfil-phone"
            name="phone"
            type="tel"
            value={phoneValue}
            onChange={(event) =>
              setPhoneValue(formatBrazilPhoneInput(event.target.value))
            }
            autoComplete="tel"
            inputMode="numeric"
            placeholder="Ex.: (11) 98765-4321"
            aria-invalid={state?.ok === false}
            aria-describedby={state?.ok === false ? "perfil-err" : undefined}
          />
          <p className="text-muted-foreground text-xs">
            Aceita telefone fixo e celular do Brasil (com DDD).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="perfil-crn">CRN</Label>
          <Input
            id="perfil-crn"
            name="crn"
            required
            value={crnValue}
            onChange={(event) => setCrnValue(event.target.value)}
            placeholder="Ex.: 12345"
            aria-invalid={state?.ok === false}
            aria-describedby={state?.ok === false ? "perfil-err" : undefined}
          />
          <p className="text-muted-foreground text-xs">
            Número de registo profissional usado em documentos gerados pelo sistema.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="perfil-photo">
            {hasPhoto ? "Substituir foto" : "Foto do profissional"}
          </Label>
          <p className="text-muted-foreground text-xs">
            PNG, JPEG ou WebP até {MAX_PROFILE_PHOTO_BYTES / 1024 / 1024} MB.
          </p>
          {hasPhoto ? (
            <div className="flex flex-wrap items-end gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={defaultPhotoUrl!}
                alt="Foto atual do profissional"
                className="border-border size-24 rounded-full border object-cover"
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="remove_photo"
                  value="1"
                  className="border-input size-4 accent-primary"
                />
                Remover foto atual
              </label>
            </div>
          ) : null}
          <Input
            id="perfil-photo"
            name="photo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="border-input bg-background text-muted-foreground file:text-foreground h-auto rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5"
            aria-invalid={state?.ok === false}
            aria-describedby={state?.ok === false ? "perfil-err" : undefined}
          />
        </div>

        {state?.ok === false ? (
          <p id="perfil-err" className="text-destructive text-sm" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit">Salvar perfil</Button>
      </form>

      <form
        onSubmit={handlePasswordSubmit}
        className="border-border space-y-4 rounded-lg border p-4"
      >
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Alterar senha</h2>
          <p className="text-muted-foreground text-xs">
            Use pelo menos 12 caracteres para manter a conta protegida.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="perfil-new-password">Nova senha</Label>
          <PasswordField
            id="perfil-new-password"
            name="new-password"
            autoComplete="new-password"
            required
            value={newPasswordValue}
            onChange={(event) => setNewPasswordValue(event.target.value)}
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "perfil-password-err" : undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="perfil-confirm-password">Confirmar nova senha</Label>
          <PasswordField
            id="perfil-confirm-password"
            name="confirm-new-password"
            autoComplete="new-password"
            required
            value={confirmPasswordValue}
            onChange={(event) => setConfirmPasswordValue(event.target.value)}
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "perfil-password-err" : undefined}
          />
        </div>

        {passwordError ? (
          <p
            id="perfil-password-err"
            className="text-destructive text-sm"
            role="alert"
          >
            {passwordError}
          </p>
        ) : null}
        {passwordSuccess ? (
          <p className="text-sm text-emerald-700" role="status">
            {passwordSuccess}
          </p>
        ) : null}

        <Button type="submit" disabled={passwordLoading}>
          {passwordLoading ? "Alterando…" : "Alterar senha"}
        </Button>
      </form>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-3 rounded-md px-4 py-3 text-sm shadow-lg transition-all duration-200 ${
            toast.visible
              ? "bg-foreground text-background translate-y-0 opacity-100"
              : "bg-foreground text-background pointer-events-none translate-y-2 opacity-0"
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
            className="text-background/80 hover:text-background rounded px-1 py-0.5 text-sm leading-none transition"
            aria-label="Fechar notificação"
          >
            X
          </button>
        </div>
      ) : null}
    </div>
  );
}
