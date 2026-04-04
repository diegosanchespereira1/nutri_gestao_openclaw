"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { getBrowserAppOrigin } from "@/lib/app-origin";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== confirm) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    if (password.length < 8) {
      setError("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const origin = getBrowserAppOrigin();

    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/inicio`,
        data: { full_name: fullName },
      },
    });

    if (signErr) {
      const msg = signErr.message.toLowerCase().includes("already")
        ? "Este email já está registado."
        : signErr.message;
      setError(msg);
      setLoading(false);
      return;
    }

    if (data.session) {
      setLoading(false);
      router.replace("/inicio");
      router.refresh();
      return;
    }

    setLoading(false);
    setInfo(
      "Se o email estiver disponível, receberá uma mensagem para confirmar a conta antes de entrar.",
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Criar conta
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Registo apenas com email e palavra-passe (sem redes sociais).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="reg-name">Nome completo</Label>
          <Input
            id="reg-name"
            name="full_name"
            autoComplete="name"
            required
            value={fullName}
            onChange={(ev) => setFullName(ev.target.value)}
            className={cn(error && "border-destructive")}
            aria-invalid={!!error}
            aria-describedby={error ? "reg-error" : info ? "reg-info" : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-email">Email</Label>
          <Input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className={cn(error && "border-destructive")}
            aria-invalid={!!error}
            aria-describedby={error ? "reg-error" : info ? "reg-info" : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-password">Palavra-passe</Label>
          <PasswordField
            id="reg-password"
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className={cn(error && "border-destructive")}
            aria-invalid={!!error}
            aria-describedby={error ? "reg-error" : info ? "reg-info" : undefined}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-confirm">Confirmar palavra-passe</Label>
          <PasswordField
            id="reg-confirm"
            name="confirm"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(ev) => setConfirm(ev.target.value)}
            className={cn(error && "border-destructive")}
            aria-invalid={!!error}
            aria-describedby={error ? "reg-error" : info ? "reg-info" : undefined}
          />
        </div>

        {error ? (
          <p id="reg-error" className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        {info ? (
          <p id="reg-info" className="text-muted-foreground text-sm" role="status">
            {info}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "A criar conta…" : "Registar"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="text-primary font-medium underline-offset-4 hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
