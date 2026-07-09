import type { Metadata } from "next";
import Link from "next/link";

import { AccountClosureRequestForm } from "@/components/public/account-closure-request-form";
import {
  PublicLegalPageShell,
  SectionCard,
} from "@/components/public/public-legal-page-shell";
import { LGPD_RETENTION_YEARS } from "@/lib/types/account-deletion";

export const metadata: Metadata = {
  title: "Excluir conta — NutriGestão",
  description:
    "Solicite a exclusão da sua conta NutriGestão. Saiba o que é encerrado, o que é retido por obrigação legal e como confirmar o pedido.",
};

const PRIVACY_EMAIL = "privacidade@nutrigestao.app";

export default function ExcluirContaPage() {
  return (
    <PublicLegalPageShell
      title="Solicitar exclusão da conta"
      subtitle="Use esta página para pedir o encerramento do seu acesso à NutriGestão, conforme exigido pela Google Play e pela LGPD (Lei nº 13.709/2018)."
    >
      <div className="space-y-8">
        <SectionCard title="Como funciona">
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[hsl(168_10%_35%)]">
            <li>Preencha o email usado para acessar a plataforma.</li>
            <li>
              Se o email estiver cadastrado, enviaremos um link seguro por email
              (válido por 24 horas).
            </li>
            <li>
              Confirme ou cancele o pedido diretamente no email — sem precisar
              estar logado.
            </li>
            <li>
              Após a confirmação, seu login é encerrado. Dados clínicos seguem
              retidos pelo prazo legal.
            </li>
          </ol>
          <p className="mt-4 text-sm text-[hsl(168_10%_35%)]">
            Prazo de processamento: até 30 dias para concluir o encerramento após
            a confirmação. A confirmação por email deve ocorrer em até 24 horas
            após o pedido.
          </p>
        </SectionCard>

        <SectionCard title="O que é excluído e o que é mantido">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-[hsl(168_22%_85%)]">
                  <th className="py-2 pr-4 font-semibold text-[hsl(172_46%_10%)]">
                    Encerrado
                  </th>
                  <th className="py-2 font-semibold text-[hsl(172_46%_10%)]">
                    Retido (obrigação legal)
                  </th>
                </tr>
              </thead>
              <tbody className="text-[hsl(168_10%_35%)]">
                <tr className="border-b border-[hsl(168_22%_90%)]">
                  <td className="py-2 pr-4">Acesso e login à plataforma</td>
                  <td className="py-2">Dados clínicos de pacientes</td>
                </tr>
                <tr className="border-b border-[hsl(168_22%_90%)]">
                  <td className="py-2 pr-4">Sessões e credenciais ativas</td>
                  <td className="py-2">Avaliações, visitas e checklists</td>
                </tr>
                <tr className="border-b border-[hsl(168_22%_90%)]">
                  <td className="py-2 pr-4">Perfil ativo do profissional</td>
                  <td className="py-2">Registros exigidos por normas do CFN</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Notificações futuras</td>
                  <td className="py-2">
                    Logs de auditoria (mínimo {LGPD_RETENTION_YEARS} anos)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[hsl(168_10%_35%)]">
            <strong>Importante:</strong> “Excluir conta” significa{" "}
            <strong>encerrar seu acesso</strong>, não apagar imediatamente
            prontuários ou dados de saúde. A retenção mínima é de{" "}
            {LGPD_RETENTION_YEARS} anos, conforme LGPD e regulamentações
            aplicáveis ao setor de saúde e nutrição.
          </p>
        </SectionCard>

        <SectionCard title="Formulário de solicitação">
          <AccountClosureRequestForm />
        </SectionCard>

        <SectionCard title="Contato">
          <p className="text-sm leading-relaxed text-[hsl(168_10%_35%)]">
            Para dúvidas sobre privacidade ou exercício de direitos:{" "}
            <a
              href={`mailto:${PRIVACY_EMAIL}`}
              className="font-medium text-[hsl(173_72%_28%)] underline"
            >
              {PRIVACY_EMAIL}
            </a>
            . Consulte também a{" "}
            <Link
              href="/politica-de-privacidade"
              className="font-medium text-[hsl(173_72%_28%)] underline"
            >
              Política de Privacidade
            </Link>
            .
          </p>
        </SectionCard>
      </div>
    </PublicLegalPageShell>
  );
}
