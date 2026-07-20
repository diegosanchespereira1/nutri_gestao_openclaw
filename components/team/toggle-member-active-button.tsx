"use client";

import { useState, useTransition } from "react";
import { UserCheck, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toggleTeamMemberActiveByTeamAction } from "@/lib/actions/team-members";

type Props = {
  memberId: string;
  memberName: string;
  isActive: boolean;
};

/**
 * Botão Ativar/Desativar membro da equipe (visível para titular e Gestão).
 * Desativar pede confirmação: bloqueia o login do membro e o exclui das
 * permissões do workspace até ser reativado.
 */
export function ToggleMemberActiveButton({ memberId, memberName, isActive }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    if (isActive) {
      const confirmed = window.confirm(
        `Desativar ${memberName}?\n\nO acesso ao sistema será bloqueado imediatamente. Você pode reativar a qualquer momento (o membro receberá um email para redefinir a senha).`,
      );
      if (!confirmed) return;
    }
    startTransition(async () => {
      const res = await toggleTeamMemberActiveByTeamAction({
        memberId,
        activate: !isActive,
      });
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button
        type="button"
        variant={isActive ? "outline" : "default"}
        size="sm"
        className="gap-1.5"
        disabled={pending}
        onClick={handleClick}
        aria-label={
          isActive ? `Desativar ${memberName}` : `Ativar ${memberName}`
        }
      >
        {isActive ? (
          <>
            <UserX className="size-4" aria-hidden />
            {pending ? "Desativando…" : "Desativar"}
          </>
        ) : (
          <>
            <UserCheck className="size-4" aria-hidden />
            {pending ? "Ativando…" : "Ativar"}
          </>
        )}
      </Button>
      {error ? (
        <p className="text-destructive max-w-52 text-right text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
