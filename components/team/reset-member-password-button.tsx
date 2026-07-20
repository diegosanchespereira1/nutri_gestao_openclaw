"use client";

import { useState, useTransition, type FormEvent } from "react";
import { KeyRound } from "lucide-react";

import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { resetTeamMemberPasswordByTeamAction } from "@/lib/actions/team-members";

type Props = {
  memberId: string;
  memberName: string;
};

const hasSpecialCharRegex = /[^A-Za-z0-9]/;

/**
 * Botão para redefinir a senha de um membro (visível para titular e Gestão).
 */
export function ResetMemberPasswordButton({ memberId, memberName }: Props) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function resetLocalState() {
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetLocalState();
  }

  function validateClient(): string | null {
    if (!password || !confirmPassword) {
      return "Informe a nova senha e a confirmação.";
    }
    if (password.length < 6) {
      return "A senha deve ter no mínimo 6 caracteres.";
    }
    if (!hasSpecialCharRegex.test(password)) {
      return "A senha precisa ter pelo menos 1 caractere especial (ex.: @ # !).";
    }
    if (password !== confirmPassword) {
      return "As senhas não coincidem.";
    }
    return null;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const clientError = validateClient();
    if (clientError) {
      setError(clientError);
      return;
    }

    startTransition(async () => {
      const res = await resetTeamMemberPasswordByTeamAction({
        memberId,
        password,
        confirmPassword,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
        aria-label={`Redefinir senha de ${memberName}`}
      >
        <KeyRound className="size-4" aria-hidden />
        Senha
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha de acesso para{" "}
              <span className="text-foreground font-medium">{memberName}</span>.
              A alteração vale no próximo login.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`reset-password-${memberId}`}>Nova senha</Label>
              <PasswordField
                id={`reset-password-${memberId}`}
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending || success}
                required
                minLength={6}
              />
              <p className="text-muted-foreground text-xs">
                Mínimo 6 caracteres, com pelo menos 1 símbolo (ex.: @ # !).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`reset-confirm-${memberId}`}>
                Confirmar senha
              </Label>
              <PasswordField
                id={`reset-confirm-${memberId}`}
                name="confirm_password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={pending || success}
                required
                minLength={6}
              />
            </div>

            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}

            {success ? (
              <p
                className="text-sm text-emerald-700 dark:text-emerald-400"
                role="status"
              >
                Senha atualizada com sucesso.
              </p>
            ) : null}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => handleOpenChange(false)}
              >
                {success ? "Fechar" : "Cancelar"}
              </Button>
              {!success ? (
                <Button type="submit" disabled={pending}>
                  {pending ? "Salvando…" : "Salvar nova senha"}
                </Button>
              ) : null}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
