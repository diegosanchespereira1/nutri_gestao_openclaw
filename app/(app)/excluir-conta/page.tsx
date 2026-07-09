/**
 * Página: Exclusão de conta (LGPD) — área autenticada
 * Rota: /excluir-conta (linkada pela Política de Privacidade)
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import {
  getDeletionStatus,
  cancelAccountDeletion,
} from "@/lib/actions/account-deletion";
import { AccountClosureState, LGPD_RETENTION_YEARS } from "@/lib/types/account-deletion";
import { DeletionRequestModal } from "@/components/settings/deletion-request-modal";
import { DeletionStatusCard } from "@/components/settings/deletion-status-card";

export default function ExcluirContaPage() {
  const router = useRouter();
  const [state, setState] = useState<AccountClosureState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);

    const result = await getDeletionStatus();
    setLoading(false);

    if (!result.success) {
      setError(result.error || "Erro ao carregar estado");
    } else if (result.status) {
      setState(result.status);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <p className="text-muted-foreground mb-2 text-sm">
          <Link href="/politica-de-privacidade" className="underline underline-offset-2">
            Política de Privacidade
          </Link>
        </p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Excluir conta
        </h1>
        <p className="text-muted-foreground">
          Solicite o encerramento do seu acesso à NutriGestão (LGPD). Dados
          clínicos podem ser retidos pelo prazo legal mínimo de{" "}
          {LGPD_RETENTION_YEARS} anos.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : null}

      {state ? (
        <DeletionStatusCard
          state={state}
          onRequestDeletion={() => setShowModal(true)}
          onCancelDeletion={() => {
            void (async () => {
              const r = await cancelAccountDeletion("");
              if (r.success) await loadStatus();
              else setError(r.error ?? "Não foi possível cancelar");
            })();
          }}
        />
      ) : null}

      <div className="mt-8 space-y-8">
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-blue-900">
            <AlertCircle className="h-5 w-5" aria-hidden />
            O que este pedido faz
          </h2>
          <p className="text-sm text-blue-800">
            Este fluxo <strong>não</strong> apaga de imediato dados clínicos. Após
            confirmação por email, <strong>bloqueia o seu acesso</strong> à
            plataforma, mantendo registos de saúde pelo período legal aplicável.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">O que é encerrado e o que é mantido</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 font-semibold">Encerrado</th>
                  <th className="px-4 py-2 font-semibold">Retido (obrigação legal)</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-t">
                  <td className="px-4 py-2">Acesso e login à plataforma</td>
                  <td className="px-4 py-2">Dados clínicos de pacientes</td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2">Sessões e credenciais ativas</td>
                  <td className="px-4 py-2">Avaliações, visitas e checklists</td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2">Perfil ativo do profissional</td>
                  <td className="px-4 py-2">Registros exigidos por normas do CFN</td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2">Notificações futuras</td>
                  <td className="px-4 py-2">
                    Logs de auditoria (mínimo {LGPD_RETENTION_YEARS} anos)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Como funciona</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Confirme com a sua senha e receba um email com link seguro (24h).</li>
            <li>Confirme ou cancele o pedido pelo email.</li>
            <li>Após confirmar, o login deixa de ser permitido.</li>
          </ol>
        </section>
      </div>

      {state ? (
        <DeletionRequestModal
          open={showModal}
          onOpenChange={setShowModal}
          onSuccess={loadStatus}
        />
      ) : null}

      <p className="text-muted-foreground mt-8 text-xs">
        Também disponível em{" "}
        <button
          type="button"
          className="underline"
          onClick={() => router.push("/configuracoes/deletar-conta")}
        >
          Configurações → Excluir conta
        </button>
        .
      </p>
    </div>
  );
}
