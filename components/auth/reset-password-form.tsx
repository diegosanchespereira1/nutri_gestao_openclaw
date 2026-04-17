"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session &&
        (event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED")
      ) {
        setReady(true);
        setError(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
        setError(null);
      }
      setSessionChecked(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;
    const t = window.setTimeout(() => {
      if (!ready) {
        setError(
          "Ligação inválida ou expirada. Peça um novo email de recuperação.",
        );
      }
    }, 2500);
    return () => window.clearTimeout(t);
  }, [sessionChecked, ready]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: upErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  if (!ready && !error) {
    return <p className="text-muted-foreground text-sm">A validar ligação…</p>;
  }

  if (error && !ready) {
    return (
      <div className="space-y-4">
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
        <Link
          href="/forgot-password"
          className="text-primary text-sm font-medium underline-offset-4 hover:underline"
        >
          Pedir novo email
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Nova senha
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Defina uma nova senha para a sua conta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="np-password">Nova senha</Label>
          <Input
            id="np-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className={cn(error && "border-destructive")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="np-confirm">Confirmar</Label>
          <Input
            id="np-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(ev) => setConfirm(ev.target.value)}
            className={cn(error && "border-destructive")}
          />
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Salvando…" : "Salvar"}
        </Button>
      </form>
    </div>
  );
}
