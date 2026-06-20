"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Camera,
  Lock,
  Mail,
  Pencil,
  Trash2,
  UserCircle,
} from "lucide-react";

import { PasswordField } from "@/components/auth/password-field";
import {
  type UpdateProfileResult,
  updateProfileAction,
} from "@/lib/actions/auth";
import { SignatureField } from "@/components/perfil/signature-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatBrazilPhoneInput } from "@/lib/validators/br-phone";

const initial: UpdateProfileResult | undefined = undefined;
const TOAST_AUTO_DISMISS_MS = 4000;
const TOAST_ANIMATION_MS = 220;

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SectionIcon({
  icon: Icon,
  className,
}: {
  icon: typeof UserCircle;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden />
    </div>
  );
}

export function PerfilForm({
  defaultFullName,
  defaultEmail,
  pendingEmail,
  defaultPhone,
  defaultCrn,
  defaultPhotoUrl,
  defaultSignatureUrl,
  roleLabel,
}: {
  defaultFullName: string;
  defaultEmail: string;
  pendingEmail: string | null;
  defaultPhone: string;
  defaultCrn: string;
  defaultPhotoUrl: string | null;
  defaultSignatureUrl: string | null;
  roleLabel: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateProfileAction, initial);
  const [isEditing, setIsEditing] = useState(() => !defaultFullName.trim());
  const [isChangingPassword, setIsChangingPassword] = useState(false);
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
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [removePhotoChecked, setRemovePhotoChecked] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    visible: boolean;
  } | null>(null);

  const displayPhotoUrl =
    !removePhotoChecked && (photoPreviewUrl ?? defaultPhotoUrl);
  const hasStoredPhoto = Boolean(defaultPhotoUrl);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  useEffect(() => {
    if (state?.ok !== true) return;
    setIsEditing(false);
    setRemovePhotoChecked(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
    setPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    router.refresh();
    const frameId = window.requestAnimationFrame(() => {
      setToast({
        id: Date.now(),
        message: state.message ?? "Perfil atualizado com sucesso.",
        visible: true,
      });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [state, router]);

  useEffect(() => {
    if (isEditing) return;
    setFullNameValue(defaultFullName);
    setEmailValue(defaultEmail);
    setPhoneValue(formatBrazilPhoneInput(defaultPhone));
    setCrnValue(defaultCrn);
  }, [defaultFullName, defaultEmail, defaultPhone, defaultCrn, isEditing]);

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

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
    }
    if (!file) return;
    setRemovePhotoChecked(false);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    setIsEditing(true);
  }

  function handleRemovePhoto() {
    setRemovePhotoChecked(true);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setFullNameValue(defaultFullName);
    setEmailValue(defaultEmail);
    setPhoneValue(formatBrazilPhoneInput(defaultPhone));
    setCrnValue(defaultCrn);
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
    }
    setRemovePhotoChecked(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
    setIsEditing(false);
  }

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

  function handleCancelPasswordChange() {
    setIsChangingPassword(false);
    setNewPasswordValue("");
    setConfirmPasswordValue("");
    setPasswordError(null);
    setPasswordSuccess(null);
  }

  return (
    <div className="w-full space-y-6">
      <form
        action={formAction}
        onReset={(e) => e.preventDefault()}
        className="space-y-6"
      >
        <input
          ref={photoInputRef}
          id="perfil-photo"
          name="photo"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
          className="sr-only"
          onChange={handlePhotoChange}
          aria-describedby={state?.ok === false ? "perfil-err" : undefined}
        />
        {hasStoredPhoto && removePhotoChecked && !photoPreviewUrl ? (
          <input type="hidden" name="remove_photo" value="1" />
        ) : null}

        {/* Hero de identidade */}
        <section
          aria-label="Resumo do perfil"
          className="border-border/60 from-primary/10 via-card to-primary/5 relative overflow-hidden rounded-2xl border bg-gradient-to-br shadow-sm ring-1 ring-foreground/5"
        >
          <div
            className="from-primary/15 pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] via-transparent to-transparent"
            aria-hidden
          />
          <div className="relative space-y-6 p-6 sm:p-8">
            {pendingEmail && !isEditing ? (
              <div className="border-primary/25 bg-primary/5 rounded-xl border p-4">
                <p className="text-foreground flex items-center gap-2 text-sm font-medium">
                  <Mail className="text-primary size-4 shrink-0" aria-hidden />
                  Alteração de email pendente
                </p>
                <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                  Confirme no endereço{" "}
                  <span className="text-foreground font-medium">
                    {pendingEmail}
                  </span>{" "}
                  para concluir a troca.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:pr-44">
              <div className="flex shrink-0 flex-col items-start gap-2 self-start">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="group ring-primary/25 ring-offset-background bg-muted relative size-24 overflow-hidden rounded-full text-xl font-semibold text-foreground ring-4 ring-offset-2 transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 sm:size-28 sm:text-2xl"
                aria-label="Alterar foto do perfil"
              >
                {displayPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayPhotoUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center">
                    {initialsFromName(fullNameValue)}
                  </span>
                )}
                <span
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/55 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100 [@media(hover:none)]:bg-black/40"
                  aria-hidden
                >
                  <Camera className="size-6 sm:size-7" />
                  <span className="text-[10px] font-medium tracking-wide uppercase sm:text-xs">
                    Alterar
                  </span>
                </span>
              </button>
              {hasStoredPhoto && !photoPreviewUrl && !removePhotoChecked ? (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1 text-xs transition-colors"
                >
                  <Trash2 className="size-3" aria-hidden />
                  Remover foto
                </button>
              ) : removePhotoChecked && !photoPreviewUrl ? (
                <button
                  type="button"
                  onClick={() => setRemovePhotoChecked(false)}
                  className="text-primary text-xs font-medium hover:underline"
                >
                  Desfazer remoção
                </button>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                  {fullNameValue.trim() || "Profissional"}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {emailValue}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {roleLabel !== "—" ? (
                  <Badge variant="secondary">{roleLabel}</Badge>
                ) : null}
                {crnValue.trim() ? (
                  <Badge variant="outline">CRN {crnValue.trim()}</Badge>
                ) : null}
                {phoneValue.trim() ? (
                  <Badge variant="outline">{phoneValue.trim()}</Badge>
                ) : null}
              </div>
            </div>
            </div>

            {isEditing || !isChangingPassword ? (
              <div className="border-border/60 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 sm:absolute sm:top-6 sm:right-6 sm:justify-end sm:border-0 sm:pt-0">
                {isEditing ? (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPassword(true);
                        setIsEditing(false);
                      }}
                      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                    >
                      <Lock className="size-3.5 shrink-0" aria-hidden />
                      Alterar senha
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setIsChangingPassword(false);
                      }}
                      className="text-primary hover:text-primary/80 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                    >
                      <Pencil className="size-3.5 shrink-0" aria-hidden />
                      Editar dados
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </section>

        <div
          className={cn(
            "grid gap-6",
            isEditing &&
              "md:grid-cols-2 md:items-stretch 2xl:grid-cols-12 2xl:items-start",
          )}
        >
          {isEditing ? (
            <Card className="shadow-sm flex h-full flex-col md:col-span-1 2xl:col-span-7">
              <CardHeader className="border-border/60 border-b pb-4">
                <div className="flex min-w-0 items-start gap-3">
                  <SectionIcon icon={UserCircle} />
                  <div className="min-w-0 space-y-1">
                    <CardTitle>Dados pessoais</CardTitle>
                    <CardDescription>
                      Informações usadas na conta e em documentos gerados pelo
                      sistema.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                {pendingEmail ? (
                  <div className="border-primary/25 bg-primary/5 rounded-xl border p-4">
                    <p className="text-foreground flex items-center gap-2 text-sm font-medium">
                      <Mail className="text-primary size-4 shrink-0" aria-hidden />
                      Alteração de email pendente
                    </p>
                    <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                      Confirme no endereço{" "}
                      <span className="text-foreground font-medium">
                        {pendingEmail}
                      </span>{" "}
                      para concluir a troca.
                    </p>
                  </div>
                ) : null}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="perfil-name">Nome completo</Label>
                    <Input
                      id="perfil-name"
                      name="full_name"
                      required
                      value={fullNameValue}
                      onChange={(event) =>
                        setFullNameValue(event.target.value)
                      }
                      autoComplete="name"
                      aria-describedby={
                        state?.ok === false ? "perfil-err" : undefined
                      }
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
                      aria-describedby={
                        state?.ok === false ? "perfil-err" : undefined
                      }
                    />
                    <p className="text-muted-foreground text-xs">
                      Enviaremos um link de confirmação ao alterar.
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
                      aria-describedby={
                        state?.ok === false ? "perfil-err" : undefined
                      }
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="perfil-crn">CRN</Label>
                    <Input
                      id="perfil-crn"
                      name="crn"
                      value={crnValue}
                      onChange={(event) => setCrnValue(event.target.value)}
                      placeholder="Ex.: 12345"
                      aria-describedby={
                        state?.ok === false ? "perfil-err" : undefined
                      }
                    />
                    <p className="text-muted-foreground text-xs">
                      Registo profissional usado em relatórios e dossiês.
                      Obrigatório para nutricionistas.
                    </p>
                  </div>
                </div>

                {state?.ok === false ? (
                  <p
                    id="perfil-err"
                    className="text-destructive text-sm"
                    role="alert"
                  >
                    {state.error}
                  </p>
                ) : null}

                <div className="border-border/60 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-muted-foreground text-xs">
                    Alterações em foto e assinatura também são guardadas aqui.
                  </p>
                  <Button type="submit" className="w-full sm:w-auto">
                    Salvar perfil
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card
            className={cn(
              "shadow-sm flex h-full flex-col",
              isEditing && "md:col-span-1 2xl:col-span-5",
            )}
          >
            <CardHeader className="border-border/60 border-b pb-4">
              <div className="flex min-w-0 items-start gap-3">
                <SectionIcon icon={BadgeCheck} />
                <div className="min-w-0 space-y-1">
                  <CardTitle>Assinatura</CardTitle>
                  <CardDescription>
                    Usada em relatórios e documentos que exigem sua assinatura.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pt-6">
              {isEditing ? (
                <SignatureField
                  defaultUrl={defaultSignatureUrl}
                  showLabel={false}
                />
              ) : defaultSignatureUrl ? (
                <div className="rounded-xl border border-border bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={defaultSignatureUrl}
                    alt="Assinatura registada"
                    className="mx-auto h-20 w-auto max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="border-border/60 bg-muted/30 rounded-xl border border-dashed px-4 py-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    Nenhuma assinatura registada.
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="mt-2"
                    onClick={() => setIsEditing(true)}
                  >
                    Adicionar assinatura
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </form>

      {isChangingPassword ? (
        <Card className="shadow-sm">
          <CardHeader className="border-border/60 border-b pb-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <SectionIcon icon={Lock} />
                <div className="min-w-0 space-y-1">
                  <CardTitle>Senha</CardTitle>
                  <CardDescription>
                    Defina uma palavra-passe forte com pelo menos 12 caracteres.
                  </CardDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelPasswordChange}
                className="text-muted-foreground hover:text-foreground shrink-0 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form
              onSubmit={handlePasswordSubmit}
              className="grid gap-5 lg:grid-cols-2 xl:grid-cols-12"
            >
              <div className="space-y-2 xl:col-span-4">
                <Label htmlFor="perfil-new-password">Nova senha</Label>
                <PasswordField
                  id="perfil-new-password"
                  name="new-password"
                  autoComplete="new-password"
                  required
                  value={newPasswordValue}
                  onChange={(event) => setNewPasswordValue(event.target.value)}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={
                    passwordError ? "perfil-password-err" : undefined
                  }
                />
              </div>

              <div className="space-y-2 xl:col-span-4">
                <Label htmlFor="perfil-confirm-password">
                  Confirmar nova senha
                </Label>
                <PasswordField
                  id="perfil-confirm-password"
                  name="confirm-new-password"
                  autoComplete="new-password"
                  required
                  value={confirmPasswordValue}
                  onChange={(event) =>
                    setConfirmPasswordValue(event.target.value)
                  }
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={
                    passwordError ? "perfil-password-err" : undefined
                  }
                />
              </div>

              <div className="flex flex-col justify-end gap-3 xl:col-span-4">
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
                <Button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full xl:w-auto xl:self-end"
                >
                  {passwordLoading ? "Salvando…" : "Salvar senha"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-lg transition-all duration-200 ${
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
