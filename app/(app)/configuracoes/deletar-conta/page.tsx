/**
 * Página: Encerrar acesso à conta (LGPD) — Story 11.7
 * Rota: /configuracoes/deletar-conta
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getDeletionStatus,
  confirmAccountDeletion,
  cancelAccountDeletion,
} from "@/lib/actions/account-deletion";
import { AccountClosureState, LGPD_RETENTION_YEARS } from "@/lib/types/account-deletion";
import { DeletionRequestModal } from "@/components/settings/deletion-request-modal";
import { DeletionStatusCard } from "@/components/settings/deletion-status-card";
import { AlertCircle } from "lucide-react";

export default function DeletarContaPage() {
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
    let cancelled = false;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const action = params.get("action");

      if (token && (action === "confirm" || action === "cancel")) {
        setLoading(true);
        setError(null);
        const result =
          action === "confirm"
            ? await confirmAccountDeletion(token)
            : await cancelAccountDeletion(token);
        if (!cancelled && !result.success) {
          setError(
            result.error ??
              "Operação falhou. Inicie sessão se o pedido exigir confirmação autenticada.",
          );
        }
        if (!cancelled) {
          router.replace("/configuracoes/deletar-conta");
        }
      }

      const statusResult = await getDeletionStatus();
      if (cancelled) return;
      setLoading(false);
      if (!statusResult.success) {
        setError(statusResult.error || "Erro ao carregar estado");
      } else if (statusResult.status) {
        setState(statusResult.status);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-4">
          <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Encerrar acesso à conta
        </h1>
        <p className="text-gray-600">
          Pedido de encerramento de acesso à plataforma (LGPD) — retenção mínima
          de {LGPD_RETENTION_YEARS} anos para dados de saúde
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {state && (
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
      )}

      <div className="mt-8 space-y-8">
        <section className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            O que este pedido faz
          </h2>
          <p className="text-sm text-blue-800 mb-2">
            Este fluxo <strong>não</strong> apaga de imediato dados clínicos. A
            operação prevê <strong>bloquear o seu acesso</strong> à conta após
            confirmação (e retenção legal de registos de saúde, em linha com a
            legislação aplicável).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">⏱️ O que acontece</h2>
          <div className="space-y-3">
            {[
              {
                time: "Agora",
                title: "Pedido",
                desc: "Indica a sua senha e recebe um email com links para confirmar ou cancelar (24h).",
                icon: "📧",
              },
              {
                time: "Até 24h",
                title: "Janela de confirmação",
                desc: "Pode cancelar o pedido pelo email ou, com sessão iniciada, nesta página.",
                icon: "⏳",
              },
              {
                time: "Após confirmar",
                title: "Acesso bloqueado",
                desc: "O login deixa de ser permitido para o seu utilizador. Dados clínicos permanecem retidos.",
                icon: "🔒",
              },
              {
                time: `Retenção (${LGPD_RETENTION_YEARS} anos)`,
                title: "Dados de saúde",
                desc: "Registos de saúde podem ser mantidos pelo período legal mínimo (documentação indica 10 anos).",
                icon: "📋",
              },
            ].map((step, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="text-2xl pt-1">{step.icon}</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {step.time}: {step.title}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">📦 O que não é apagado de imediato</h2>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-900 mb-2">
              <strong>Por quê?</strong> Obrigações legais de retenção de dados de
              saúde e de auditoria.
            </p>
            <ul className="space-y-1 text-sm text-yellow-900">
              <li>📋 Dados de pacientes e registos clínicos</li>
              <li>📊 Visitas técnicas e relatórios associados</li>
              <li>🔍 Log de auditoria (compliance)</li>
              <li>⚖️ Contratos e consentimentos quando aplicável</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">❓ Perguntas frequentes</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-gray-900">Posso cancelar?</p>
              <p className="text-gray-600 mt-1">
                Sim, enquanto o pedido estiver pendente (até 24h após o email).
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                Os dados de pacientes são apagados logo?
              </p>
              <p className="text-gray-600 mt-1">
                Não. O modelo é bloqueio de acesso e retenção legal de dados de
                saúde (mínimo {LGPD_RETENTION_YEARS} anos na documentação do
                produto).
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                Quem pode ver dados durante a retenção?
              </p>
              <p className="text-gray-600 mt-1">
                Administradores da plataforma podem ter acesso de leitura para
                cumprimento legal; o titular não acede à app após o bloqueio.
              </p>
            </div>
          </div>
        </section>
      </div>

      {state && (
        <DeletionRequestModal
          open={showModal}
          onOpenChange={setShowModal}
          onSuccess={loadStatus}
        />
      )}
    </div>
  );
}
