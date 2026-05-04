"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { mapSupabaseLoginError } from "@/lib/map-supabase-auth-error";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const AUTH_STEP_TIMEOUT_MS = 10_000;

function createTimeoutError(step: string): Error {
  const error = new Error(`AUTH_TIMEOUT:${step}`);
  error.name = "AuthTimeoutError";
  return error;
}

async function withAuthTimeout<T>(promise: Promise<T>, step: string): Promise<T> {
  return await Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(createTimeoutError(step)), AUTH_STEP_TIMEOUT_MS);
    }),
  ]);
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [requestId] = useState(() => crypto.randomUUID());

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [step, setStep] = useState<"password" | "mfa">("password");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

  function isInvalidRefreshTokenError(message?: string): boolean {
    if (!message) return false;
    const normalized = message.toLowerCase();
    return (
      normalized.includes("invalid refresh token") ||
      normalized.includes("refresh token not found")
    );
  }

  function logAuthTroubleshootingEvent(input: {
    event: string;
    step?: "password" | "mfa";
    outcome?: "attempt" | "success" | "error";
    errorCode?: string;
    errorMessage?: string;
    userId?: string | null;
    hasSession?: boolean;
    metadata?: Record<string, string | number | boolean | null>;
  }) {
    void fetch("/api/auth/troubleshooting", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestId,
        event: input.event,
        step: input.step,
        outcome: input.outcome,
        email: email.trim().toLowerCase(),
        userId: input.userId ?? null,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null,
        nextPath: next,
        hasSession:
          typeof input.hasSession === "boolean" ? input.hasSession : null,
        metadata: {
          ua: navigator.userAgent,
          ...input.metadata,
        },
      }),
      keepalive: true,
    }).catch(() => {
      // Falha de log não deve bloquear login.
    });
  }

  async function beginMfaChallenge(supabase: ReturnType<typeof createClient>) {
    await logAuthTroubleshootingEvent({
      event: "mfa_challenge_start",
      step: "mfa",
      outcome: "attempt",
    });
    const { data: factors, error: listErr } =
      await supabase.auth.mfa.listFactors();
    if (listErr) {
      await logAuthTroubleshootingEvent({
        event: "mfa_factor_list_failed",
        step: "mfa",
        outcome: "error",
        errorCode: listErr.code,
        errorMessage: listErr.message,
      });
      setError(listErr.message);
      return false;
    }
    const totp = factors?.all?.find(
      (f: { factor_type?: string; status?: string }) =>
        f.factor_type === "totp" && f.status === "verified",
    );
    if (!totp?.id) {
      await logAuthTroubleshootingEvent({
        event: "mfa_factor_missing",
        step: "mfa",
        outcome: "error",
      });
      setError("2FA ativo mas fator TOTP não encontrado. Contacte suporte.");
      return false;
    }
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: totp.id,
    });
    if (chErr || !ch?.id) {
      await logAuthTroubleshootingEvent({
        event: "mfa_challenge_failed",
        step: "mfa",
        outcome: "error",
        errorCode: chErr?.code,
        errorMessage: chErr?.message,
      });
      setError(chErr?.message ?? "Não foi possível iniciar o desafio 2FA.");
      return false;
    }
    await logAuthTroubleshootingEvent({
      event: "mfa_challenge_started",
      step: "mfa",
      outcome: "success",
    });
    setFactorId(totp.id);
    setChallengeId(ch.id);
    setStep("mfa");
    return true;
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const startedAt = performance.now();

    try {
      await logAuthTroubleshootingEvent({
        event: "password_signin",
        step: "password",
        outcome: "attempt",
      });

      let signInData:
        | Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["data"]
        | null = null;
      let signErr:
        | Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["error"]
        | null = null;

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const result = await withAuthTimeout(
          supabase.auth.signInWithPassword({
            email,
            password,
          }),
          "sign_in_with_password",
        );
        signInData = result.data;
        signErr = result.error;

        if (!signErr) break;

        const staleRefreshToken = isInvalidRefreshTokenError(signErr.message);
        if (attempt === 1 && staleRefreshToken) {
          await logAuthTroubleshootingEvent({
            event: "password_signin_stale_refresh_recovery",
            step: "password",
            outcome: "error",
            errorCode: signErr.code,
            errorMessage: signErr.message,
          });
          // Limpa sessão local potencialmente corrompida e tenta novamente.
          await withAuthTimeout(supabase.auth.signOut(), "signout_stale_refresh");
          continue;
        }

        break;
      }

      if (signErr) {
        await logAuthTroubleshootingEvent({
          event: "password_signin_failed",
          step: "password",
          outcome: "error",
          errorCode: signErr.code,
          errorMessage: signErr.message,
        });
        setError(mapSupabaseLoginError(signErr));
        return;
      }
      await logAuthTroubleshootingEvent({
        event: "password_signin_success",
        step: "password",
        outcome: "success",
        userId: signInData.user?.id ?? null,
      });

      const { data: aal, error: aalErr } = await withAuthTimeout(
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        "mfa_aal_check",
      );
      if (aalErr) {
        await logAuthTroubleshootingEvent({
          event: "mfa_aal_check_failed",
          step: "password",
          outcome: "error",
          errorCode: aalErr.code,
          errorMessage: aalErr.message,
          userId: signInData.user?.id ?? null,
        });
        setError(aalErr.message);
        return;
      }

      if (aal?.nextLevel === "aal2" && aal?.currentLevel === "aal1") {
        await logAuthTroubleshootingEvent({
          event: "mfa_required",
          step: "password",
          outcome: "success",
          userId: signInData.user?.id ?? null,
        });
        const ok = await beginMfaChallenge(supabase);
        if (!ok) await withAuthTimeout(supabase.auth.signOut(), "mfa_begin_signout");
        return;
      }

      let sessionData: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"] | null =
        null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const result = await withAuthTimeout(
          supabase.auth.getSession(),
          "post_signin_get_session",
        );
        sessionData = result.data;
        if (sessionData.session) break;
        await new Promise((resolve) => window.setTimeout(resolve, 120));
      }
      await logAuthTroubleshootingEvent({
        event: "post_signin_session_check",
        step: "password",
        outcome: sessionData?.session ? "success" : "error",
        hasSession: Boolean(sessionData?.session),
        userId: signInData.user?.id ?? null,
        metadata: {
          elapsed_ms: Math.round(performance.now() - startedAt),
        },
      });

      if (!sessionData?.session) {
        setError(
          "Não foi possível concluir a sessão neste dispositivo. Tente novamente.",
        );
        return;
      }

      window.location.assign(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado";
      const isTimeout = message.startsWith("AUTH_TIMEOUT:");
      await logAuthTroubleshootingEvent({
        event: isTimeout ? "password_signin_timeout" : "password_signin_exception",
        step: "password",
        outcome: "error",
        errorMessage: message,
        metadata: {
          elapsed_ms: Math.round(performance.now() - startedAt),
        },
      });
      setError(
        isTimeout
          ? "A autenticação demorou mais do que o esperado. Verifique sua conexão e tente novamente."
          : "Não foi possível concluir o login agora. Tente novamente.",
      );
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || !challengeId) return;
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const startedAt = performance.now();

    try {
      const { error: vErr } = await withAuthTimeout(
        supabase.auth.mfa.verify({
          factorId,
          challengeId,
          code: mfaCode.replace(/\s/g, ""),
        }),
        "mfa_verify",
      );

      if (vErr) {
        await logAuthTroubleshootingEvent({
          event: "mfa_verify_failed",
          step: "mfa",
          outcome: "error",
          errorCode: vErr.code,
          errorMessage: vErr.message,
        });
        setError(vErr.message);
        setMfaCode("");
        await beginMfaChallenge(supabase);
        return;
      }

      const { data: sessionData } = await withAuthTimeout(
        supabase.auth.getSession(),
        "mfa_post_verify_get_session",
      );
      await logAuthTroubleshootingEvent({
        event: "mfa_verify_success",
        step: "mfa",
        outcome: sessionData.session ? "success" : "error",
        hasSession: Boolean(sessionData.session),
        metadata: {
          elapsed_ms: Math.round(performance.now() - startedAt),
        },
      });

      if (!sessionData.session) {
        setError(
          "Não foi possível concluir o segundo fator neste dispositivo. Tente novamente.",
        );
        return;
      }

      window.location.assign(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado";
      const isTimeout = message.startsWith("AUTH_TIMEOUT:");
      await logAuthTroubleshootingEvent({
        event: isTimeout ? "mfa_verify_timeout" : "mfa_verify_exception",
        step: "mfa",
        outcome: "error",
        errorMessage: message,
        metadata: {
          elapsed_ms: Math.round(performance.now() - startedAt),
        },
      });
      setError(
        isTimeout
          ? "A validação do 2FA demorou demais. Tente novamente."
          : "Não foi possível validar o 2FA agora. Tente novamente.",
      );
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Entrar
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Acesse com o email e a senha da sua conta.
        </p>
      </div>

      {searchParams.get("error") === "auth" ? (
        <div className="space-y-1" role="alert">
          <p className="text-destructive text-sm">
            {searchParams.get("error_code") === "otp_expired" ? (
              <>
                O link do email expirou ou já foi usado.{" "}
                <Link
                  href="/forgot-password"
                  className="font-medium underline-offset-4 hover:underline"
                >
                  Pedir novo email de recuperação
                </Link>
                .
              </>
            ) : (
              "Link de autenticação inválido ou expirado. Tente novamente."
            )}
          </p>
          {searchParams.get("error_description") ? (
            <p className="text-muted-foreground text-xs break-words">
              {searchParams.get("error_description")}
            </p>
          ) : null}
        </div>
      ) : null}

      {searchParams.get("reason") === "session_expired" ? (
        <p
          className="text-amber-900 dark:text-amber-100 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 text-sm"
          role="status"
        >
          A sua sessão terminou por tempo limite ou inatividade. Volte a iniciar sessão para continuar.
        </p>
      ) : null}

      {step === "password" ? (
        <form
          onSubmit={handlePasswordSubmit}
          className="space-y-4"
          noValidate
          aria-busy={loading}
        >
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={loading}
              className={cn(error && "border-destructive")}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Senha</Label>
            <PasswordField
              id="login-password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={loading}
              className={cn(error && "border-destructive")}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          {error ? (
            <p id="login-error" className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
          {loading ? (
            <p className="text-muted-foreground text-center text-xs">
              Validando suas credenciais...
            </p>
          ) : null}
        </form>
      ) : (
        <form
          onSubmit={handleMfaSubmit}
          className="space-y-4"
          noValidate
          aria-busy={loading}
        >
          <p className="text-muted-foreground text-sm">
            Digite o código de 6 dígitos do seu aplicativo de autenticação.
          </p>
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Código 2FA</Label>
            <Input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={mfaCode}
              onChange={(ev) => setMfaCode(ev.target.value)}
              disabled={loading}
              aria-invalid={!!error}
              aria-describedby={error ? "mfa-error" : undefined}
            />
          </div>
          {error ? (
            <p id="mfa-error" className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verificando…" : "Confirmar"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={async () => {
              await logAuthTroubleshootingEvent({
                event: "mfa_back_to_password",
                step: "mfa",
                outcome: "success",
              });
              setStep("password");
              setMfaCode("");
              setFactorId(null);
              setChallengeId(null);
              setError(null);
              await createClient().auth.signOut();
            }}
            disabled={loading}
          >
            Voltar
          </Button>
        </form>
      )}

      <p className="text-muted-foreground text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-primary font-medium underline-offset-4 hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          Recuperar senha
        </Link>
      </p>

      <p className="text-muted-foreground text-center text-sm">
        Ainda sem conta?{" "}
        <Link
          href="/register"
          className="text-primary font-medium underline-offset-4 hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          Criar cadastro
        </Link>
      </p>
    </div>
  );
}
