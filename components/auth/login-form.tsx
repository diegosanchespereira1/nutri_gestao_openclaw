"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { mapSupabaseLoginError } from "@/lib/map-supabase-auth-error";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [step, setStep] = useState<"password" | "mfa">("password");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function beginMfaChallenge(supabase: ReturnType<typeof createClient>) {
    const { data: factors, error: listErr } =
      await supabase.auth.mfa.listFactors();
    if (listErr) {
      setError(listErr.message);
      return false;
    }
    const totp = factors?.all?.find(
      (f) => f.factor_type === "totp" && f.status === "verified",
    );
    if (!totp?.id) {
      setError("2FA ativo mas fator TOTP não encontrado. Contacte suporte.");
      return false;
    }
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: totp.id,
    });
    if (chErr || !ch?.id) {
      setError(chErr?.message ?? "Não foi possível iniciar o desafio 2FA.");
      return false;
    }
    setFactorId(totp.id);
    setChallengeId(ch.id);
    setStep("mfa");
    return true;
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signErr) {
      setError(mapSupabaseLoginError(signErr));
      setLoading(false);
      return;
    }

    const { data: aal, error: aalErr } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalErr) {
      setError(aalErr.message);
      setLoading(false);
      return;
    }

    if (aal?.nextLevel === "aal2" && aal?.currentLevel === "aal1") {
      const ok = await beginMfaChallenge(supabase);
      setLoading(false);
      if (!ok) await supabase.auth.signOut();
      return;
    }

    setLoading(false);
    window.location.assign(next);
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || !challengeId) return;
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: mfaCode.replace(/\s/g, ""),
    });

    if (vErr) {
      setError(vErr.message);
      setLoading(false);
      setMfaCode("");
      await beginMfaChallenge(supabase);
      return;
    }

    setLoading(false);
    window.location.assign(next);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Entrar
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Aceda com o email e a palavra-passe da sua conta.
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
              "Ligação de autenticação inválida ou expirada. Tente novamente."
            )}
          </p>
          {searchParams.get("error_description") ? (
            <p className="text-muted-foreground text-xs break-words">
              {searchParams.get("error_description")}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === "password" ? (
        <form
          onSubmit={handlePasswordSubmit}
          className="space-y-4"
          noValidate
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
              className={cn(error && "border-destructive")}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Palavra-passe</Label>
            <PasswordField
              id="login-password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
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
            {loading ? "A entrar…" : "Entrar"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleMfaSubmit} className="space-y-4" noValidate>
          <p className="text-muted-foreground text-sm">
            Introduza o código de 6 dígitos da sua aplicação de autenticação.
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
            {loading ? "A verificar…" : "Confirmar"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={async () => {
              setStep("password");
              setMfaCode("");
              setFactorId(null);
              setChallengeId(null);
              setError(null);
              await createClient().auth.signOut();
            }}
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
          Recuperar palavra-passe
        </Link>
      </p>

      <p className="text-muted-foreground text-center text-sm">
        Ainda sem conta?{" "}
        <Link
          href="/register"
          className="text-primary font-medium underline-offset-4 hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          Criar registo
        </Link>
      </p>
    </div>
  );
}
