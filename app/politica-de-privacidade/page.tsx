import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade — NutriGestão",
  description:
    "Saiba como o NutriGestão coleta, usa, armazena e protege seus dados pessoais e os dados dos seus pacientes, em conformidade com a LGPD.",
};

const LAST_UPDATED = "18 de junho de 2026";
const COMPANY_NAME = "NutriGestão";
const COMPANY_EMAIL = "privacidade@nutrigestao.app";
const DPO_EMAIL = "dpo@nutrigestao.app";

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "hsl(165 25% 97%)" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: "hsl(173 60% 10%)",
          borderBottom: "1px solid hsl(173 45% 16%)",
        }}
        className="sticky top-0 z-10"
      >
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2 group">
            <span
              className="text-lg font-bold tracking-tight"
              style={{ color: "hsl(168 25% 88%)" }}
            >
              Nutri<span style={{ color: "hsl(173 60% 36%)" }}>Gestão</span>
            </span>
          </Link>
          <span
            className="text-xs"
            style={{ color: "hsl(168 10% 60%)" }}
          >
            Atualizada em {LAST_UPDATED}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 pb-24">
        {/* Título */}
        <div className="mb-10">
          <div
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full mb-4"
            style={{
              backgroundColor: "hsl(173 60% 36% / 0.12)",
              color: "hsl(173 72% 28%)",
            }}
          >
            <span>⚖️</span> LGPD — Lei nº 13.709/2018
          </div>
          <h1
            className="text-3xl font-bold mb-3"
            style={{ color: "hsl(172 46% 10%)" }}
          >
            Política de Privacidade
          </h1>
          <p style={{ color: "hsl(168 10% 45%)" }} className="text-base leading-relaxed">
            Esta Política de Privacidade descreve como o <strong>{COMPANY_NAME}</strong> coleta,
            utiliza, armazena e protege seus dados pessoais e os dados dos seus pacientes/clientes,
            em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).
          </p>
        </div>

        {/* Índice */}
        <nav
          className="rounded-xl p-6 mb-10"
          style={{
            backgroundColor: "hsl(0 0% 100%)",
            border: "1px solid hsl(168 22% 85%)",
          }}
        >
          <h2
            className="text-sm font-semibold uppercase tracking-wider mb-4"
            style={{ color: "hsl(173 72% 28%)" }}
          >
            Sumário
          </h2>
          <ol className="space-y-1.5 text-sm" style={{ color: "hsl(173 72% 28%)" }}>
            {[
              ["1", "Quem somos (Controlador de Dados)"],
              ["2", "Quais dados coletamos"],
              ["3", "Como e por que usamos seus dados"],
              ["4", "Base legal para o tratamento"],
              ["5", "Dados de saúde (dados sensíveis)"],
              ["6", "Compartilhamento de dados"],
              ["7", "Transferência internacional de dados"],
              ["8", "Armazenamento e retenção"],
              ["9", "Segurança dos dados"],
              ["10", "Cookies e tecnologias similares"],
              ["11", "Seus direitos como titular"],
              ["12", "Menores de idade"],
              ["13", "Alterações nesta Política"],
              ["14", "Contato e Encarregado de Dados (DPO)"],
            ].map(([num, title]) => (
              <li key={num}>
                <a
                  href={`#secao-${num}`}
                  className="hover:underline underline-offset-2"
                >
                  {num}. {title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Seções */}
        <div className="space-y-10">

          {/* 1 */}
          <Section id="secao-1" number="1" title="Quem somos (Controlador de Dados)">
            <p>
              O <strong>{COMPANY_NAME}</strong> é uma plataforma SaaS de gestão de processos
              destinada a profissionais e empresas das áreas de Nutrição e Segurança Alimentar.
              Para fins da LGPD, atuamos como <strong>Controlador de Dados</strong> em relação
              aos dados dos usuários da plataforma (profissionais, nutricionistas, gestores), e
              como <strong>Operador de Dados</strong> em relação aos dados dos pacientes/clientes
              inseridos pelos próprios usuários da plataforma.
            </p>
            <InfoBox>
              Os profissionais que utilizam o {COMPANY_NAME} para gerenciar seus pacientes são
              considerados controladores dos dados de seus pacientes e são responsáveis por obter
              os consentimentos necessários junto a eles.
            </InfoBox>
          </Section>

          {/* 2 */}
          <Section id="secao-2" number="2" title="Quais dados coletamos">
            <p className="mb-4">Coletamos diferentes categorias de dados dependendo do seu relacionamento com a plataforma:</p>

            <SubSection title="2.1 Dados dos Usuários (Profissionais)">
              <ul>
                <li><strong>Identificação:</strong> nome completo, endereço de e-mail, número de telefone.</li>
                <li><strong>Credenciais profissionais:</strong> número de registro no conselho (ex.: CRN, CRQ) e área de atuação.</li>
                <li><strong>Dados da empresa:</strong> razão social, CNPJ, endereço comercial (quando aplicável).</li>
                <li><strong>Dados de acesso:</strong> login, senha (armazenada de forma criptografada) e logs de autenticação.</li>
                <li><strong>Dados de cobrança:</strong> informações de pagamento processadas por provedor terceiro seguro (ex.: Stripe); não armazenamos números de cartão em nossos servidores.</li>
                <li><strong>Dados de uso:</strong> páginas visitadas, funcionalidades utilizadas, dispositivo, sistema operacional, endereço IP e dados de sessão.</li>
              </ul>
            </SubSection>

            <SubSection title="2.2 Dados de Pacientes/Clientes (inseridos pelo profissional)">
              <ul>
                <li><strong>Identificação:</strong> nome, data de nascimento, sexo, e-mail e telefone.</li>
                <li><strong>Dados de saúde (sensíveis):</strong> peso, altura, IMC, histórico alimentar, alergias, intolerâncias, condições clínicas, exames e outras informações nutricionais inseridas pelo profissional.</li>
                <li><strong>Planos e prontuários:</strong> planos alimentares, registros de consultas e evolução clínica.</li>
                <li><strong>Dados de contato:</strong> informações de agenda e comunicação entre profissional e paciente mediadas pela plataforma.</li>
              </ul>
            </SubSection>

            <SubSection title="2.3 Dados coletados automaticamente">
              <ul>
                <li>Endereço IP, tipo de navegador, dispositivo e sistema operacional.</li>
                <li>Dados de navegação e interação com a plataforma (logs de acesso).</li>
                <li>Cookies e tecnologias similares (detalhes na <a href="#secao-10" className="underline" style={{ color: "hsl(173 72% 28%)" }}>Seção 10</a>).</li>
              </ul>
            </SubSection>
          </Section>

          {/* 3 */}
          <Section id="secao-3" number="3" title="Como e por que usamos seus dados">
            <Table
              headers={["Finalidade", "Dados utilizados"]}
              rows={[
                ["Criar e gerenciar sua conta de acesso", "Nome, e-mail, senha, dados profissionais"],
                ["Prestar os serviços contratados (gestão nutricional)", "Todos os dados inseridos na plataforma"],
                ["Processar pagamentos e gerenciar assinaturas", "Dados de cobrança (via Stripe)"],
                ["Comunicar atualizações, novidades e suporte", "Nome, e-mail"],
                ["Melhorar a plataforma com base em uso e feedback", "Dados de uso anonimizados ou agregados"],
                ["Pesquisa e desenvolvimento em saúde e nutrição", "Indicadores estatísticos anonimizados — nenhum dado que identifique o paciente é utilizado"],
                ["Cumprir obrigações legais e regulatórias", "Dados necessários conforme exigência legal"],
                ["Prevenir fraudes e garantir a segurança", "Logs de acesso, IP, dados de autenticação"],
                ["Emissão de notas fiscais e documentos fiscais", "Nome/razão social, CPF/CNPJ, endereço"],
              ]}
            />
          </Section>

          {/* 4 */}
          <Section id="secao-4" number="4" title="Base legal para o tratamento">
            <p className="mb-4">
              Todo tratamento de dados realizado pelo {COMPANY_NAME} está amparado em pelo menos
              uma das bases legais previstas na LGPD (Art. 7º e Art. 11):
            </p>
            <Table
              headers={["Base Legal", "Quando se aplica"]}
              rows={[
                ["Execução de contrato (Art. 7º, V)", "Dados necessários para prestar o serviço contratado"],
                ["Legítimo interesse (Art. 7º, IX)", "Melhorias na plataforma, segurança e prevenção de fraudes"],
                ["Cumprimento de obrigação legal (Art. 7º, II)", "Retenção de dados fiscais, atendimento a autoridades"],
                ["Consentimento (Art. 7º, I / Art. 11, I)", "Comunicações de marketing opcionais; dados sensíveis de pacientes"],
                ["Tutela da saúde (Art. 11, II, f)", "Tratamento de dados de saúde por profissional habilitado"],
                ["Proteção da vida (Art. 11, II, e)", "Situações de emergência que envolvam risco à saúde"],
              ]}
            />
          </Section>

          {/* 5 */}
          <Section id="secao-5" number="5" title="Dados de saúde (dados sensíveis)">
            <p>
              Dados de saúde são classificados como <strong>dados pessoais sensíveis</strong> pela
              LGPD (Art. 5º, II) e recebem proteção reforçada. O {COMPANY_NAME} trata esses dados
              exclusivamente para viabilizar os serviços de gestão nutricional contratados, com
              as seguintes garantias:
            </p>
            <ul className="mt-3">
              <li>Acesso restrito aos profissionais autorizados pelo titular da conta.</li>
              <li>Criptografia em trânsito (TLS) e em repouso (AES-256).</li>
              <li>Isolamento por organização/clínica (multi-tenant com Row Level Security).</li>
              <li>
                Os profissionais usuários são responsáveis por obter o consentimento explícito
                de seus pacientes antes de inserir dados de saúde na plataforma, conforme
                exige o Art. 11, I da LGPD e as resoluções do CFN.
              </li>
            </ul>
            <p className="mt-4">
              Os dados de saúde inseridos na plataforma poderão ser utilizados, de forma secundária,
              para fins de pesquisa e desenvolvimento em saúde e nutrição. Nesse contexto, somente
              indicadores estatísticos agregados são considerados — como médias populacionais, tendências
              nutricionais e padrões clínicos. <strong>Nenhuma informação que possibilite a identificação
              do paciente</strong> (nome, data de nascimento, CPF, contato ou qualquer outro dado direto
              ou indireto de identificação) será utilizada ou compartilhada para essa finalidade. O processo
              de descaracterização (anonimização) é aplicado antes de qualquer uso analítico, em conformidade
              com o Art. 12 da LGPD, de modo que os dados resultantes não possam ser associados a um
              indivíduo específico.
            </p>
          </Section>

          {/* 6 */}
          <Section id="secao-6" number="6" title="Compartilhamento de dados">
            <p className="mb-4">
              Não vendemos, alugamos nem comercializamos seus dados. Podemos compartilhá-los
              apenas nas situações abaixo:
            </p>
            <Table
              headers={["Com quem", "Por quê"]}
              rows={[
                ["Supabase (banco de dados e autenticação)", "Infraestrutura da plataforma — dados armazenados em servidores na região configurada"],
                ["Stripe (processamento de pagamentos)", "Cobrança e gestão de assinaturas — dados financeiros tratados sob PCI DSS"],
                ["Provedores de e-mail transacional", "Envio de notificações, confirmações e recuperação de senha"],
                ["Ferramentas de monitoramento e erros", "Identificação de falhas técnicas — dados anonimizados ou pseudonimizados"],
                ["Autoridades públicas e regulatórias", "Cumprimento de ordem judicial, regulatória ou legal"],
                ["Parceiros de auditoria e compliance", "Quando exigido por processo de certificação ou auditoria contratada"],
              ]}
            />
            <InfoBox variant="warning">
              Todos os fornecedores terceiros são contratualmente obrigados a tratar os dados
              apenas para as finalidades específicas e com nível de segurança equivalente ao
              exigido pela LGPD.
            </InfoBox>
          </Section>

          {/* 7 */}
          <Section id="secao-7" number="7" title="Transferência internacional de dados">
            <p>
              Alguns de nossos fornecedores de infraestrutura (como Supabase e Stripe) podem
              processar dados em servidores localizados fora do Brasil. Quando isso ocorre,
              adotamos as salvaguardas previstas no Art. 33 da LGPD:
            </p>
            <ul className="mt-3">
              <li>Utilizamos fornecedores que oferecem nível de proteção adequado ou equivalente ao exigido pela LGPD.</li>
              <li>Contratos com cláusulas específicas de proteção de dados são firmados com cada fornecedor.</li>
              <li>Priorizamos configurações de armazenamento regional (ex.: South America / São Paulo) sempre que disponíveis.</li>
            </ul>
          </Section>

          {/* 8 */}
          <Section id="secao-8" number="8" title="Armazenamento e retenção">
            <Table
              headers={["Categoria de dado", "Período de retenção"]}
              rows={[
                ["Dados da conta do profissional", "Durante a vigência do contrato + 5 anos após encerramento (obrigação fiscal)"],
                ["Dados de pacientes/clientes", "Enquanto o profissional mantiver conta ativa + conforme solicitação de exclusão"],
                ["Logs de acesso e segurança", "12 meses (conforme Marco Civil da Internet — Lei 12.965/2014)"],
                ["Dados fiscais e financeiros", "10 anos (obrigação tributária)"],
                ["Dados de suporte e atendimento", "2 anos após o encerramento do chamado"],
              ]}
            />
            <p className="mt-4">
              Após o prazo de retenção aplicável, os dados são excluídos de forma segura ou
              anonimizados, de modo que não seja possível identificar o titular.
            </p>
          </Section>

          {/* 9 */}
          <Section id="secao-9" number="9" title="Segurança dos dados">
            <p className="mb-3">
              Adotamos medidas técnicas e organizacionais compatíveis com o estado da arte para
              proteger seus dados contra acesso não autorizado, perda, alteração ou divulgação indevida:
            </p>
            <ul>
              <li><strong>Criptografia TLS/HTTPS</strong> em todas as comunicações entre seu dispositivo e nossos servidores.</li>
              <li><strong>Criptografia em repouso (AES-256)</strong> para dados armazenados.</li>
              <li><strong>Autenticação segura</strong> com hash de senhas (bcrypt) e suporte a autenticação de dois fatores (2FA).</li>
              <li><strong>Controle de acesso por perfil (RBAC)</strong> e isolamento de dados por organização (Row Level Security).</li>
              <li><strong>Monitoramento contínuo</strong> de tentativas de acesso suspeito e anomalias.</li>
              <li><strong>Backups regulares</strong> com versionamento e política de recuperação de desastres.</li>
              <li><strong>Revisões de segurança periódicas</strong> e avaliações de vulnerabilidade.</li>
            </ul>
            <InfoBox>
              Em caso de incidente de segurança que possa causar risco ou dano a titulares,
              notificaremos a Autoridade Nacional de Proteção de Dados (ANPD) e os titulares
              afetados no prazo legalmente exigido.
            </InfoBox>
          </Section>

          {/* 10 */}
          <Section id="secao-10" number="10" title="Cookies e tecnologias similares">
            <p className="mb-4">
              Utilizamos cookies e tecnologias similares para garantir o funcionamento da
              plataforma e melhorar a experiência de uso. Veja os tipos utilizados:
            </p>
            <Table
              headers={["Tipo", "Finalidade", "Obrigatório?"]}
              rows={[
                ["Cookies essenciais", "Manter sessão autenticada e preferências básicas", "Sim"],
                ["Cookies de segurança", "Prevenção de CSRF e proteção de sessão", "Sim"],
                ["Cookies de desempenho", "Identificar erros e lentidões na plataforma", "Não"],
                ["Cookies analíticos", "Entender como as funcionalidades são utilizadas (dados agregados)", "Não"],
              ]}
            />
            <p className="mt-4">
              Você pode configurar seu navegador para bloquear ou alertar sobre cookies.
              Observe que bloquear cookies essenciais pode comprometer o funcionamento da plataforma.
            </p>
          </Section>

          {/* 11 */}
          <Section id="secao-11" number="11" title="Seus direitos como titular">
            <p className="mb-4">
              A LGPD garante a você os seguintes direitos em relação aos seus dados pessoais
              (Art. 18). Para exercê-los, entre em contato pelo e-mail{" "}
              <a href={`mailto:${COMPANY_EMAIL}`} style={{ color: "hsl(173 72% 28%)" }} className="underline">
                {COMPANY_EMAIL}
              </a>:
            </p>
            <Table
              headers={["Direito", "O que significa"]}
              rows={[
                ["✅ Confirmação e acesso", "Saber se tratamos seus dados e obter uma cópia"],
                ["✏️ Correção", "Solicitar a correção de dados incompletos, inexatos ou desatualizados"],
                ["🗑️ Eliminação", "Pedir a exclusão de dados tratados com base em consentimento"],
                ["🔄 Portabilidade", "Receber seus dados em formato estruturado para migração a outro serviço"],
                ["🚫 Oposição", "Opor-se a tratamento que considere irregular"],
                ["ℹ️ Informação sobre compartilhamento", "Saber com quais entidades compartilhamos seus dados"],
                ["↩️ Revogação de consentimento", "Retirar o consentimento a qualquer momento, sem prejudicar tratamentos anteriores"],
                ["📋 Revisão de decisão automatizada", "Solicitar revisão humana de decisões tomadas exclusivamente por meios automatizados"],
              ]}
            />
            <p className="mt-4">
              Responderemos às suas solicitações em até <strong>15 dias úteis</strong>, podendo
              este prazo ser prorrogado conforme a complexidade da solicitação.
            </p>
            <p className="mt-4">
              Para solicitar a <strong>exclusão da sua conta</strong> na plataforma, acesse{" "}
              <a
                href="/excluir-conta"
                style={{ color: "hsl(173 72% 28%)" }}
                className="underline"
              >
                nutrigestao.app/excluir-conta
              </a>
              .
            </p>
          </Section>

          {/* 12 */}
          <Section id="secao-12" number="12" title="Menores de idade">
            <p>
              O {COMPANY_NAME} é destinado exclusivamente a profissionais maiores de 18 anos.
              Não coletamos intencionalmente dados de menores de 18 anos como usuários da
              plataforma. No entanto, profissionais de nutrição podem atender pacientes menores
              de idade; nesses casos, a responsabilidade pelo consentimento do representante
              legal do menor é do profissional usuário da plataforma.
            </p>
          </Section>

          {/* 13 */}
          <Section id="secao-13" number="13" title="Alterações nesta Política">
            <p>
              Esta Política de Privacidade pode ser atualizada periodicamente para refletir
              mudanças em nossas práticas, novas funcionalidades ou exigências legais.
              Quando realizarmos alterações relevantes, notificaremos os usuários por e-mail
              e/ou por aviso em destaque na plataforma com antecedência mínima de 15 dias,
              salvo quando a alteração for exigida por lei com prazo inferior.
            </p>
            <p className="mt-3">
              A versão em vigor é sempre a publicada nesta página, identificada pela data de
              última atualização no topo.
            </p>
          </Section>

          {/* 14 */}
          <Section id="secao-14" number="14" title="Contato e Encarregado de Dados (DPO)">
            <p className="mb-4">
              Para exercer seus direitos, esclarecer dúvidas ou comunicar qualquer questão
              relacionada à privacidade e proteção de dados, entre em contato com nosso
              Encarregado de Proteção de Dados (DPO):
            </p>
            <div
              className="rounded-xl p-6 flex flex-col gap-3"
              style={{
                backgroundColor: "hsl(173 60% 36% / 0.08)",
                border: "1px solid hsl(173 60% 36% / 0.2)",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📧</span>
                <div>
                  <p className="text-xs font-medium" style={{ color: "hsl(168 10% 60%)" }}>
                    E-mail para privacidade e exercício de direitos
                  </p>
                  <a
                    href={`mailto:${COMPANY_EMAIL}`}
                    className="font-semibold"
                    style={{ color: "hsl(173 72% 28%)" }}
                  >
                    {COMPANY_EMAIL}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">🔒</span>
                <div>
                  <p className="text-xs font-medium" style={{ color: "hsl(168 10% 60%)" }}>
                    Contato direto com o DPO
                  </p>
                  <a
                    href={`mailto:${DPO_EMAIL}`}
                    className="font-semibold"
                    style={{ color: "hsl(173 72% 28%)" }}
                  >
                    {DPO_EMAIL}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">🏛️</span>
                <div>
                  <p className="text-xs font-medium" style={{ color: "hsl(168 10% 60%)" }}>
                    Autoridade de Proteção de Dados
                  </p>
                  <p className="text-sm" style={{ color: "hsl(172 46% 10%)" }}>
                    Você também pode contatar a{" "}
                    <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> pelo
                    site{" "}
                    <a
                      href="https://www.gov.br/anpd"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "hsl(173 72% 28%)" }}
                      className="underline"
                    >
                      www.gov.br/anpd
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Rodapé da página */}
        <div
          className="mt-14 pt-8 text-center text-sm"
          style={{
            borderTop: "1px solid hsl(168 22% 85%)",
            color: "hsl(168 10% 60%)",
          }}
        >
          <p>
            {COMPANY_NAME} · Política de Privacidade · Versão de {LAST_UPDATED}
          </p>
          <p className="mt-2">
            Em conformidade com a{" "}
            <strong>Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</strong>
          </p>
          <div className="mt-4 flex justify-center gap-6">
            <Link
              href="/login"
              style={{ color: "hsl(173 72% 28%)" }}
              className="hover:underline"
            >
              ← Voltar ao app
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Componentes auxiliares ─────────────────────────────── */

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-4">
        <span
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{
            backgroundColor: "hsl(173 72% 28%)",
            color: "hsl(0 0% 100%)",
          }}
        >
          {number}
        </span>
        <h2 className="text-xl font-semibold" style={{ color: "hsl(172 46% 10%)" }}>
          {title}
        </h2>
      </div>
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: "hsl(0 0% 100%)",
          border: "1px solid hsl(168 22% 85%)",
        }}
      >
        <div
          className="text-sm leading-relaxed space-y-4"
          style={{ color: "hsl(172 30% 25%)" }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold mb-2" style={{ color: "hsl(172 46% 10%)" }}>
        {title}
      </h3>
      <ul className="list-disc list-inside space-y-1.5 ml-1">{children}</ul>
    </div>
  );
}

function InfoBox({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "warning";
}) {
  const styles =
    variant === "warning"
      ? {
          bg: "hsl(48 100% 95%)",
          border: "hsl(38 90% 50% / 0.3)",
          icon: "⚠️",
        }
      : {
          bg: "hsl(173 60% 36% / 0.06)",
          border: "hsl(173 60% 36% / 0.2)",
          icon: "ℹ️",
        };

  return (
    <div
      className="rounded-lg p-4 flex gap-3 mt-4"
      style={{
        backgroundColor: styles.bg,
        border: `1px solid ${styles.border}`,
      }}
    >
      <span className="flex-shrink-0 mt-0.5">{styles.icon}</span>
      <p className="text-sm leading-relaxed" style={{ color: "hsl(172 46% 10%)" }}>
        {children}
      </p>
    </div>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm border-collapse" style={{ minWidth: "480px" }}>
        <thead>
          <tr style={{ backgroundColor: "hsl(168 20% 94%)" }}>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-4 py-2.5 font-semibold first:rounded-tl-lg last:rounded-tr-lg"
                style={{ color: "hsl(172 46% 10%)", borderBottom: "1px solid hsl(168 22% 85%)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{
                backgroundColor: i % 2 === 0 ? "transparent" : "hsl(168 20% 97%)",
                borderBottom: "1px solid hsl(168 22% 85%)",
              }}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-3"
                  style={{ color: j === 0 ? "hsl(172 46% 10%)" : "hsl(172 30% 35%)" }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
