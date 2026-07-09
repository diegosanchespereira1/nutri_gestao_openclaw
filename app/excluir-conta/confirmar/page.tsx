import Link from "next/link";
import { Suspense } from "react";

import { ExcluirContaConfirmarClient } from "@/components/public/excluir-conta-confirmar-client";
import { PublicLegalPageShell } from "@/components/public/public-legal-page-shell";

export default function ExcluirContaConfirmarPage() {
  return (
    <PublicLegalPageShell
      title="Confirmação de exclusão"
      subtitle="Processamento do seu pedido de encerramento de conta."
      badge="NutriGestão"
    >
      <Suspense
        fallback={
          <div className="rounded-xl border border-[hsl(168_22%_85%)] bg-white p-6">
            <p className="text-sm text-muted-foreground">A processar o seu pedido…</p>
          </div>
        }
      >
        <ExcluirContaConfirmarClient />
      </Suspense>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/excluir-conta" className="underline">
          Voltar ao formulário de exclusão
        </Link>
      </p>
    </PublicLegalPageShell>
  );
}
