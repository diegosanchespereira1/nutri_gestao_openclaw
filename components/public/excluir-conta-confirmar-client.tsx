"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  cancelAccountDeletion,
  confirmAccountDeletionByToken,
} from "@/lib/actions/account-deletion";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export function ExcluirContaConfirmarClient() {
  const searchParams = useSearchParams();
  const processedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (processedRef.current) return;

    const token = searchParams.get("token");
    const action = searchParams.get("action");

    if (!token || (action !== "confirm" && action !== "cancel")) {
      setLoading(false);
      setError("Link inválido ou incompleto.");
      return;
    }

    processedRef.current = true;

    (async () => {
      const result =
        action === "confirm"
          ? await confirmAccountDeletionByToken(token)
          : await cancelAccountDeletion(token);

      setLoading(false);

      if (result.success) {
        setMessage(result.message ?? "Operação concluída.");
        window.history.replaceState({}, "", "/excluir-conta/confirmar");
      } else {
        setError(result.error ?? "Não foi possível concluir a operação.");
      }
    })();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[hsl(168_22%_85%)] bg-white p-6">
        <p className="text-sm text-muted-foreground">A processar o seu pedido…</p>
      </div>
    );
  }

  if (message) {
    return (
      <div
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-6"
        role="status"
      >
        <p className="text-sm leading-relaxed text-emerald-800">{message}</p>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex")}
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 p-6"
      role="alert"
    >
      <p className="text-sm leading-relaxed text-red-800">{error}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/excluir-conta"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Voltar ao formulário
        </Link>
        <a
          href="mailto:privacidade@nutrigestao.app"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Contactar suporte
        </a>
      </div>
    </div>
  );
}
