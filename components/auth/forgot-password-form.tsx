"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { getBrowserAppOrigin } from "@/lib/app-origin";
import { mapSupabaseRecoverPasswordError } from "@/lib/map-supabase-auth-error";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Mensagem única — evita enumeração de emails (PRD / Story 1.7). */
const GENERIC_SUCCESS =
  "Se existir uma conta associada a este email, enviamos instruções para redefinir a senha.";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitInFlight = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitInFlight.current) return;
    setError(null);
    submitInFlight.current = true;
    setLoading(true);
    const supabase = createClient();
    const origin = getBrowserAppOrigin();

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
        },
      );

      if (resetErr) {
        setError(mapSupabaseRecoverPasswordError(resetErr));
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
      submitInFlight.current = false;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Recuperar acesso
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Indique o email da conta. Não revelamos se o endereço está registado.
        </p>
      </div>

      {sent ? (
        <p className="text-muted-foreground text-sm" role="status">
          {GENERIC_SUCCESS}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="fp-email">Email</Label>
            <Input
              id="fp-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className={cn(error && "border-destructive")}
              aria-invalid={!!error}
              aria-describedby={error ? "fp-error" : undefined}
            />
          </div>
          {error ? (
            <p id="fp-error" className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "A enviar…" : "Enviar instruções"}
          </Button>
        </form>
      )}

      <p className="text-muted-foreground text-center text-sm">
        <Link
          href="/login"
          className="text-primary font-medium underline-offset-4 hover:underline focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
