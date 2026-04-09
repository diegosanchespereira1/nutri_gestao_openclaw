/**
 * Página: Deletar Minha Conta
 * Rota: /app/configuracoes/deletar-conta
 * Story: 11.7 - LGPD Art. 18 (Right to be Forgotten)
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getDeletionStatus } from '@/lib/actions/account-deletion';
import { AccountDeletionState } from '@/lib/types/account-deletion';
import { DeletionRequestModal } from '@/components/settings/deletion-request-modal';
import { DeletionStatusCard } from '@/components/settings/deletion-status-card';
import { AlertCircle } from 'lucide-react';

export default function DeletarContaPage() {
  const [state, setState] = useState<AccountDeletionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Carregar status
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);

    const result = await getDeletionStatus();
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Erro ao carregar status');
    } else if (result.status) {
      setState(result.status);
    }
  };

  // Detectar confirmação via query param (email link)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const action = urlParams.get('action');

    if (token && action === 'confirm') {
      // TODO: Chamar confirmAccountDeletion(token)
      // e exibir modal de sucesso
      console.log('Confirmar exclusão com token:', token);
    } else if (token && action === 'cancel') {
      // TODO: Chamar cancelAccountDeletion(token)
      // e exibir modal de sucesso
      console.log('Cancelar exclusão com token:', token);
    }
  }, []);

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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Deletar Minha Conta</h1>
        <p className="text-gray-600">Solicitar exclusão da sua conta conforme LGPD Art. 18</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Status Card */}
      {state && (
        <DeletionStatusCard
          state={state}
          onRequestDeletion={() => setShowModal(true)}
          onCancelDeletion={() => {
            // TODO: Implementar cancelamento
          }}
        />
      )}

      {/* Main Content */}
      <div className="mt-8 space-y-8">
        {/* LGPD Info */}
        <section className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Direito ao Esquecimento — LGPD Art. 18
          </h2>
          <p className="text-sm text-blue-800 mb-2">
            Você tem o direito de solicitar a exclusão completa de sua conta e dados pessoais.
            Este processo segue a Lei Geral de Proteção de Dados (LGPD) Art. 18 e respeita
            obrigações legais de retenção de dados de saúde.
          </p>
        </section>

        {/* Timeline Explicada */}
        <section>
          <h2 className="text-lg font-semibold mb-4">⏱️ O Que Acontecerá</h2>
          <div className="space-y-3">
            {[
              {
                time: 'Agora',
                title: 'Solicitar Exclusão',
                desc: 'Você clica em "Solicitar Exclusão" e recebe email de confirmação',
                icon: '📧',
              },
              {
                time: 'Próximas 24h',
                title: 'Janela de Cancelamento',
                desc: 'Clique no link do email para confirmar. Você pode cancelar a qualquer momento.',
                icon: '⏳',
              },
              {
                time: 'Após 24h',
                title: 'Conta Desativada',
                desc: 'Seu login será bloqueado. Você não conseguirá mais acessar a plataforma.',
                icon: '🔒',
              },
              {
                time: 'Próximos 5 Anos',
                title: 'Retenção Legal',
                desc: 'Dados de pacientes serão retidos conforme obrigações legais de saúde.',
                icon: '📋',
              },
              {
                time: 'Após 5 Anos',
                title: 'Limpeza Automática',
                desc: 'Todos os dados serão completamente deletados do sistema.',
                icon: '✓',
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

        {/* O Que Será Deletado */}
        <section>
          <h2 className="text-lg font-semibold mb-4">🗑️ O Que Será Deletado Imediatamente</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✓ Sua conta de login</li>
            <li>✓ Seu email e senha</li>
            <li>✓ Seus dados de perfil (CRN, telefone, endereço)</li>
            <li>✓ Suas preferências e configurações</li>
            <li>✓ Seus estabelecimentos cadastrados</li>
          </ul>
        </section>

        {/* O Que Será Retido */}
        <section>
          <h2 className="text-lg font-semibold mb-4">📦 O Que Será Retido por 5 Anos</h2>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-900 mb-2">
              <strong>Por quê?</strong> Obrigações legais de retenção de dados de saúde no Brasil.
            </p>
            <ul className="space-y-1 text-sm text-yellow-900">
              <li>📋 Dados de pacientes (nomes, avaliações)</li>
              <li>📊 Relatórios de visitas técnicas</li>
              <li>🔍 Log de auditoria (para segurança e compliance)</li>
              <li>⚖️ Documentação legal (contratos, consentimentos)</li>
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-lg font-semibold mb-4">❓ Perguntas Frequentes</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-gray-900">Posso cancelar depois?</p>
              <p className="text-gray-600 mt-1">
                Sim, mas apenas nos primeiros 24h após solicitar. Após esse período, a exclusão é
                irreversível.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Meus dados de pacientes serão deletados?</p>
              <p className="text-gray-600 mt-1">
                Não imediatamente. Conforme lei de saúde, eles serão retidos por 5 anos após sua
                exclusão. Após isso, são completamente deletados.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Quem pode ver meus dados durante retenção?</p>
              <p className="text-gray-600 mt-1">
                Ninguém. Seus dados são completamente isolados e inacessíveis, mas mantidos por lei.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Posso exportar meus dados antes?</p>
              <p className="text-gray-600 mt-1">
                Sim! Acesse "Meus Dados" em configurações para exportar cópia completa (JSON/CSV)
                antes de solicitar exclusão.
              </p>
            </div>
          </div>
        </section>

        {/* Compliance */}
        <section className="p-4 bg-gray-50 border border-gray-200 rounded">
          <h3 className="font-semibold text-gray-900 mb-2">🛡️ Conformidade LGPD</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>✓ Solicitação registada com timestamp e IP</li>
            <li>✓ Confirmação por email (token único, 24h expiração)</li>
            <li>✓ Soft-delete (dados não deletados imediatamente, apenas marcados)</li>
            <li>✓ Retenção legal documentada (5 anos conforme práticas de saúde)</li>
            <li>✓ Audit trail imutável (nunca deletado, apenas mascarado)</li>
            <li>✓ Isolamento tenant (seus dados não afetam outros usuários)</li>
          </ul>
        </section>
      </div>

      {/* Modal */}
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
