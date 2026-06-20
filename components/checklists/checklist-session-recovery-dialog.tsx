"use client";

import Link from "next/link";
import { useState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { waitForServerAuthReady } from "@/lib/client/wait-for-server-auth";
import { STALE_SERVER_ACTION_MESSAGE } from "@/lib/client/server-action-errors";
import { mapSupabaseLoginError } from "@/lib/map-supabase-auth-error";
import { persistNativeClientCookie } from "@/lib/mobile/persist-native-client-cookie";
import { isNativeApp } from "@/lib/mobile/platform";
import { createClient } from "@/lib/supabase/client";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnPath: string;
  onSessionRestored: () => Promise<void>;
};

export function ChecklistSessionRecoveryDialog({
  open,
  onOpenChange,
  returnPath,
  onSessionRestored,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signErr) {
        setError(mapSupabaseLoginError(signErr));
        return;
      }

      const { data: aal, error: aalErr } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalErr) {
        setError(aalErr.message);
        return;
      }

      if (aal?.nextLevel === "aal2" && aal?.currentLevel === "aal1") {
        setError(
          "Esta conta exige 2FA. Use a página de login completa (link abaixo).",
        );
        return;
      }

      if (!data.session) {
        setError("Não foi possível restaurar a sessão. Tente novamente.");
        return;
      }

      if (isNativeApp()) {
        persistNativeClientCookie();
      }

      const serverReady = await waitForServerAuthReady();
      if (serverReady === "stale") {
        setError(STALE_SERVER_ACTION_MESSAGE);
        return;
      }
      if (serverReady !== "ready") {
        setError(
          "Login aceito neste dispositivo, mas o servidor ainda não reconheceu a sessão. Aguarde um instante e tente novamente.",
        );
        return;
      }

      await onSessionRestored();
      onOpenChange(false);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  const loginHref = `/login?next=${encodeURIComponent(returnPath)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sessão expirada</DialogTitle>
          <DialogDescription>
            As suas respostas continuam neste dispositivo. Entre novamente para
            gravar no servidor sem perder o trabalho.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="session-recovery-email">Email</Label>
            <Input
              id="session-recovery-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-recovery-password">Senha</Label>
            <PasswordField
              id="session-recovery-password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">{error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar e gravar respostas"}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-xs">
          Conta com 2FA ou outro método?{" "}
          <Link href={loginHref} className="text-primary font-medium underline-offset-4 hover:underline">
            Abrir página de login
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
