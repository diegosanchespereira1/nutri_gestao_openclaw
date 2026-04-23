---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# Nutricao_stratosTech - Epic Breakdown

## Overview

Este documento decompõe requisitos do PRD, da arquitetura e do UX Design em épicos e *stories* implementáveis. **Estado:** workflow de épicos **concluído** (Passos 1–4). **Implementação:** épicos **1–5 concluídos** (épico 2 com story 2.7 em backlog); **épico 6 concluído** (6.1–6.9); **épico 7 concluído** (7.1–7.4); épicos **8–11 em backlog** — detalhe por story abaixo e em `_bmad-output/implementation-artifacts/sprint-status.yaml`.

**Decisão de âmbito (produto):** **FR2** (autenticação OAuth / login social) **não será implementado** na fase atual. Mantém-se no inventário do PRD como requisito documentado, fora do *delivery* até nova decisão.

## Requirements Inventory

### Functional Requirements

```
FR1: Profissional pode criar conta na plataforma com email e senha
FR2: Profissional pode autenticar via provedor OAuth social
FR3: Profissional pode ativar e gerenciar autenticação de dois fatores
FR4: Profissional pode cadastrar e manter seu perfil incluindo número de inscrição no CRN
FR5: Sistema insere identificação CRN automaticamente em todos os documentos e prescrições gerados
FR6: Profissional pode cadastrar clientes pessoa física ou jurídica
FR7: Profissional pode cadastrar exatamente 1 estabelecimento por cliente PJ (relação 1:1 — 1 CNPJ = 1 cliente = 1 estabelecimento), classificado por tipo (escola, hospital, clínica, lar de idosos, empresa). Para múltiplas unidades, criar um cliente distinto por unidade.
FR8: Profissional pode cadastrar pacientes vinculados a estabelecimentos ou diretamente a clientes PF
FR9: Profissional pode registrar perfil completo do paciente com formulários de avaliação nutricional
FR10: Profissional pode visualizar histórico consolidado de um paciente atendido em múltiplos estabelecimentos
FR11: Profissional pode importar clientes, estabelecimentos e pacientes a partir de arquivo CSV/Excel
FR12: Sistema disponibiliza checklists pré-configurados por portaria sanitária estadual com campos obrigatórios identificados
FR13: Profissional pode preencher checklists regulatórios com validação de campos obrigatórios
FR14: Profissional pode criar checklists customizados com campos extras configuráveis
FR15: Admin pode criar, editar e versionar checklists regulatórios na plataforma
FR16: Sistema notifica profissionais afetados quando um checklist regulatório é atualizado pelo admin
FR17: Profissional pode agendar visitas técnicas a estabelecimentos e pacientes cadastrados
FR18: Profissional pode iniciar e executar visita com preenchimento de checklist aplicável
FR19: Profissional pode registrar fotos vinculadas a itens específicos do checklist durante a visita
FR20: Profissional pode registrar anotações textuais vinculadas a itens do checklist
FR21: Sistema destaca itens com não-conformidade recorrente baseado no histórico de visitas anteriores ao mesmo estabelecimento
FR22: Sistema gera relatório/dossiê automaticamente ao profissional finalizar visita, compilando checklist preenchido, fotos e anotações
FR23: Profissional pode revisar, editar e aprovar o relatório gerado antes da finalização definitiva
FR24: Profissional pode exportar relatório de visita em PDF
FR25: Sistema pode enviar relatório de visita por email automaticamente conforme configuração do profissional
FR26: Profissional pode cadastrar receitas com lista de ingredientes especificando peso/quantidade
FR27: Sistema vincula ingredientes à tabela TACO e calcula informação nutricional automaticamente
FR28: Profissional pode cadastrar matéria-prima com custo unitário de compra
FR29: Sistema aplica fator de correção e fator de cocção ao cálculo de custo e nutricional
FR30: Sistema calcula custo total da receita com base nos ingredientes, pesos e custos unitários
FR31: Profissional pode configurar impostos aplicáveis e margem de venda por receita
FR32: Sistema calcula preço de venda por porção considerando custo, impostos e margem
FR33: Sistema calcula informação nutricional por porção com base na tabela TACO
FR34: Profissional pode escalonar receita por regra de três ajustando rendimento desejado
FR35: Sistema recalcula em cascata todas as fichas técnicas afetadas quando o preço de um ingrediente é alterado
FR36: Profissional pode exportar ficha técnica completa em PDF
FR37: Sistema disponibiliza templates de POP pré-configurados por tipo de estabelecimento
FR38: Profissional pode criar e customizar POPs vinculados a estabelecimentos
FR39: Sistema mantém versionamento de POPs com histórico de alterações
FR40: Profissional pode exportar POP em PDF
FR41: Profissional pode registrar e acompanhar status de pagamento por cliente
FR42: Profissional pode configurar recorrência de cobrança (mensal, anual, avulso) por cliente
FR43: Profissional pode definir datas de início e fim de contrato por cliente
FR44: Profissional pode gerar contratos a partir de modelos pré-preenchidos com dados do cliente
FR45: Sistema emite alertas de renovação e vencimento de contrato
FR46: Profissional pode cadastrar usuários com acesso externo (familiar, médico, paciente)
FR47: Profissional pode configurar quais categorias de dados cada usuário externo pode visualizar por paciente
FR48: Usuário externo pode visualizar relatórios, medições, exames e plano nutricional do paciente conforme permissões concedidas
FR49: Sistema coleta consentimento LGPD do responsável legal ao cadastrar paciente menor de idade
FR50: Profissional visualiza dashboard com agenda do dia organizada por prioridade e tipo
FR51: Sistema exibe alertas regulatórios com countdown de vencimento no dashboard
FR52: Profissional visualiza pendências financeiras no dashboard
FR53: Dashboard apresenta informações separadas por tópico (pacientes versus financeiro)
FR54: Sistema gera briefing com avisos da semana para o profissional se organizar
FR55: Sistema guia novo profissional por wizard de configuração inicial adaptado ao tipo de trabalho selecionado
FR56: Sistema sugere portarias aplicáveis baseado no estado e tipo de estabelecimento cadastrado
FR57: Admin pode gerenciar tenants (profissionais) da plataforma
FR58: Admin pode configurar planos de assinatura, limites e add-ons
FR59: Admin pode visualizar métricas da plataforma (assinantes, conversão, churn)
FR60: Admin pode gerenciar catálogo de dados compartilhados (portarias, tabela TACO, templates)
FR61: Sistema isola completamente os dados entre profissionais — nenhum tenant acessa dados de outro
FR62: Sistema registra log de auditoria de todas as ações em dados de pacientes
FR63: Sistema coleta e registra consentimento digital do paciente/responsável para uso de dados
FR64: Sistema permite ao profissional gerar relatório de dados pessoais de um paciente para atendimento de direitos LGPD
FR65: Profissional pode exportar todos os seus dados da plataforma em formato aberto a qualquer momento (Data Portability)
FR66: Sistema envia notificações push/email ao profissional sobre eventos relevantes (agenda do dia, alertas regulatórios, pendências financeiras, atualizações de portarias)
FR67: Profissional pode encerrar sessão (logout) e sistema invalida tokens de acesso
FR68: Profissional pode recuperar acesso à conta via email (reset de senha / Magic Link)
FR69: Profissional pode solicitar exclusão completa da sua conta e dados pessoais conforme LGPD Art. 18, respeitando obrigações legais de retenção
FR70: Sistema preserva checklists preenchidos em visitas como registros imutáveis (evidência legal) — edições geram nova versão, não substituem o original
FR71: Profissional pode associar opcionalmente um membro da equipe como responsável pelo atendimento em cada cliente e paciente; a equipa visualiza a carteira por profissional na área Equipe; alterações são registadas em auditoria (incluindo identificação da sessão que executou a mutação quando disponível)
```

### NonFunctional Requirements

```
NFR1: Carregamento de telas < 2 segundos em 4G
NFR2: Geração de dossiê de visita < 5 segundos (checklist + até 10 fotos)
NFR3: Recálculo em cascata de custos < 10 segundos para até 100 fichas afetadas
NFR4: Geração de PDF (ficha técnica / relatório) < 5 segundos
NFR5: Autocomplete TACO < 1 segundo
NFR6: Dashboard load < 3 segundos (agenda, alertas, financeiro)
NFR7: Importação CSV < 30 segundos para até 500 registros
NFR8: Suportar 500 profissionais concorrentes sem degradação (meta 12 meses)
NFR9: Criptografia em repouso AES-256 para dados de pacientes
NFR10: TLS 1.2+ em todas as conexões
NFR11: Access token 15 min + refresh 7 dias (Supabase JWT)
NFR12: CAPTCHA após 3 falhas de login, rate limit, sem bloqueio permanente de conta; Magic Link como fallback
NFR13: Rate limiting API: leitura 100/min, escrita 30/min, upload 10/min por utilizador
NFR14: Isolamento multi-tenant verificado por testes automatizados a cada deploy (RLS)
NFR15: Log de auditoria com retenção 12 meses e mascaramento de campos sensíveis
NFR16: Scan de vulnerabilidades no CI/CD a cada merge
NFR17: Pen-test antes do lançamento e anualmente
NFR18: Escalabilidade horizontal de 50 a 5.000 profissionais sem redesenho de infra
NFR19: Storage suportando crescimento ~15%/mês em fotos/documentos
NFR20: Benchmark DB: 100 tenants × 1.000 pacientes sem degradação de queries (validar mês 1)
NFR21: Filas assíncronas: 1.000 jobs/hora (PDF, email, sync)
NFR22: Auto-scaling de contentores com CPU/memória > 70%
NFR23: Uptime mensal 99,5% (MVP) → 99,9% (Etapa 2)
NFR24: Deploy zero-downtime (rolling update)
NFR25: Backup diário, retenção 30 dias, teste mensal de restauração
NFR26: RTO < 4 h, RPO < 1 h (desastre)
NFR27: Retenção de dados pós-contrato 5 anos
NFR28: WCAG 2.1 AA nos fluxos principais
NFR29: Contraste mínimo 4,5:1 texto, 3:1 elementos gráficos UI
NFR30: Navegação por teclado em fluxos principais
NFR31: Responsivo funcional de 375px a 1920px
NFR32: Corpo de texto mínimo 16px, redimensionável
NFR33: Dependência Supabase Auth alinhada ao SLA do fornecedor
NFR34: Email transacional entrega < 60 s, bounce < 2%
NFR35: TACO pré-carregada; atualização manual pelo admin (sem API externa obrigatória)
NFR36: Gateway de pagamento (Etapa 2) via Strategy Pattern e failover entre provedores
NFR37: API pública futura versionada, documentada, rate-limited
```

### Additional Requirements

```
- Starter obrigatório: create-next-app (Next.js App Router, TypeScript, Tailwind); integração @supabase/ssr para sessão segura (sem service role no client).
- Supabase: Auth, Postgres com RLS em todas as tabelas sensíveis, Storage (fotos/documentos), Edge Functions para orquestração leve; jobs pesados (PDF grande, volume email) via fila + worker Node (não só Edge CPU 2s).
- Multi-tenant: isolamento total por tenant; testes de regressão anti cross-tenant em cada deploy.
- PDF: padrão assíncrono com estados na UI (a gerar / pronto / erro recuperável) alinhado à arquitetura de filas.
- TACO: catálogo nutricional pré-carregado no banco; admin gere atualizações.
- FR70 / domínio: registos de visita imutáveis com versionamento — impacto em modelo de dados e API.
- Observabilidade: logging estruturado, métricas de negócio; conforme arquitetura.
- Revisão jurídica LGPD antes do lançamento (dependência externa).
- Lançamento regulatório: portarias checklist foco SP; expansão por estado sem mudança de código core (config/dados).
```

### UX Design Requirements

```
UX-DR1: Inicializar design system shadcn/ui + Tailwind com componentes base: button, input, label, card, switch, tabs, dropdown-menu, dialog, sheet, table, select, toast/sonner, skeleton.
UX-DR2: Aplicar tema de cor preferido theme-nutri-teal (HSL em theme-nutri-teal.css); manter theme-nutri-ref-a disponível para comparação com referências stakeholder.
UX-DR3: Implementar shell logado: sidebar + header coerentes com referências visuais; sidebar colapsável / Sheet em mobile.
UX-DR4: Login e registo: layout duas colunas 50/50; **apenas** email + palavra-passe (sem login social/OAuth); CRN no registo; acessível (foco, labels, erros).
UX-DR5: Componente ChecklistItemVisit: item regulatório com conforme/NC, foto e nota por itemId (CTAs **Tirar foto** / **Galeria** em campo), aviso de recorrência, estados de sync/erro.
UX-DR6: Componente VisitExecutionHeader: contexto estabelecimento, data, progresso x/n, rascunho, menu sair/guardar.
UX-DR7: Componente DossierPreview: secções colapsáveis, galeria com legenda ao item, edição leve antes de aprovar.
UX-DR8: Componente TechnicalSheetIngredientRow + CostSummaryPanel: linha editável com TACO/custo e painel de totais, recálculo visível.
UX-DR9: Componente AgendaVisitBlock: cartão de visita com prioridade e CTA Iniciar/Ver detalhe; alvo toque ≥44px nas ações críticas.
UX-DR10: Componente DashboardAlertCard: alerta regulatório/financeiro com countdown e uma CTA; não depender só da cor (ícone/texto).
UX-DR11: Componente CsvImportMapper: upload, mapeamento de colunas, relatório de erros por linha.
UX-DR12: Componente RegulatoryVersionBanner (admin): nova versão de portaria/checklist publicada.
UX-DR13: Padrões UX: hierarquia de botões (primário/secundário/destrutivo), feedback toast vs inline para erros críticos PDF/email, formulários com validação e 16px em inputs mobile.
UX-DR14: Responsivo: mobile-first; breakpoints sm/md/lg/xl; visita otimizada para 375px; ficha técnica densa em desktop com sticky header opcional.
UX-DR15: Acessibilidade: WCAG AA, skip link, foco em modais, aria-live para toasts/countdown conforme spec, prefers-reduced-motion.
UX-DR16: Gráficos dashboard: wrapper Recharts/Chart.js com cores lidas de tokens ou chartPalette centralizado.
UX-DR17: Ícones lucide-react alinhados à navegação e ações.
```

### FR Coverage Map

| FR | Épico | Nota |
|----|--------|------|
| FR1, FR3, FR4, FR67, FR68 | 1 | Auth email/senha, 2FA, perfil, sessão |
| FR2 | — | **Fora de âmbito** — login social não implementado (decisão produto) |
| FR5 | 4 | CRN em PDFs/relatórios gerados |
| FR6–FR11, FR71 | 2 | Cadastros e importação |
| FR12–FR14 | 3 | Checklists lado profissional |
| FR15, FR16 | 10 | Admin checklists e notificações |
| FR17–FR25, FR70 | 4 | Visitas, dossiê, imutabilidade |
| FR26–FR36 | 6 | Ficha técnica e TACO |
| FR37–FR40 | 7 | POPs |
| FR41–FR45 | 8 | Financeiro |
| FR46–FR49 | 9 | Portal e consentimento |
| FR50–FR54 | 5 | Dashboard |
| FR55–FR56 | 2 | Onboarding após cadastro (wizard) |
| FR57–FR60 | 10 | Admin SaaS |
| FR61–FR66, FR69 | 11 | Segurança, LGPD, notificações transversais |

**UX-DR:** distribuídos pelos épicos 1 (DR1–4,7,13,15 parcial), 2 (DR11), 3–5 (DR5–6,8–10,14,16), 4 (DR5–7,13), 6 (DR8,14), 10 (DR12), 11 (DR14,15).

## Epic List

### Epic 1: Fundação do produto, autenticação e shell
Profissional utiliza uma aplicação Next.js com tema NutriGestão, autentica-se com email/senha, gere sessão e perfil com CRN, e navega num *shell* coerente com o UX spec.  
**FRs:** FR1, FR3, FR4, FR67, FR68. (**FR2** fora de âmbito — ver nota no topo do documento.)
**Implementação (épico):** Concluído.

### Epic 2: Cadastro operacional, onboarding e importação
Profissional cadastra clientes, estabelecimentos e pacientes, completa wizard inicial, importa CSV e vê histórico consolidado do paciente.  
**FRs:** FR6–FR11, FR55, FR56.
**Implementação (épico):** Concluído (story 2.7 ainda em backlog).

### Epic 3: Checklists regulatórios (uso profissional)
Sistema disponibiliza modelos por portaria; profissional preenche com validação e cria checklists customizados.  
**FRs:** FR12, FR13, FR14.
**Implementação (épico):** Concluído.

### Epic 4: Visitas técnicas, dossiê, PDF e email
Profissional agenda e executa visitas com evidências, gera dossiê, aprova, exporta PDF com CRN e envia por email; registos imutáveis com versionamento.  
**FRs:** FR5, FR17–FR25, FR70.
**Implementação (épico):** Concluído.

### Epic 5: Dashboard e organização
Profissional vê agenda do dia, alertas com *countdown*, financeiro resumido, separação por tópico e briefing da semana.  
**FRs:** FR50–FR54.
**Implementação (épico):** Concluído.

### Epic 6: Ficha técnica, TACO e custos
Profissional gere receitas, ingredientes, TACO, custos, cascata e PDF da ficha.  
**FRs:** FR26–FR36.
**Implementação (épico):** Concluído (6.1–6.9).

### Epic 7: POPs
Profissional usa templates, customiza POPs por estabelecimento, versiona e exporta PDF.  
**FRs:** FR37–FR40.
**Implementação (épico):** Concluído (7.1–7.4).

### Epic 8: Controle financeiro e contratos
Profissional regista pagamentos, recorrência, contratos e alertas de renovação.  
**FRs:** FR41–FR45.
**Implementação (épico):** Backlog.

### Epic 9: Portal externo e LGPD menores
Profissional convida utilizadores externos; estes visualizam dados permitidos; consentimento para menores.  
**FRs:** FR46–FR49.
**Implementação (épico):** Backlog.

### Epic 10: Administração da plataforma
Admin gere tenants, planos, métricas, catálogo (portarias, TACO), CRUD e versionamento de checklists e notificações de atualização.  
**FRs:** FR15, FR16, FR57–FR60.
**Implementação (épico):** Backlog.

### Epic 11: Segurança transversal, auditoria e direitos do titular
RLS verificado, auditoria em dados de paciente, consentimentos, DSAR, portabilidade, notificações transversais, exclusão de conta.  
**FRs:** FR61–FR66, FR69.
**Implementação (épico):** Backlog.

---

## Epic 1: Fundação do produto, autenticação e shell

Profissional utiliza uma aplicação Next.js com tema NutriGestão, autentica-se com email/senha, gere sessão e perfil com CRN, e navega num *shell* coerente com o UX spec.

**Implementação (épico):** Concluído.

### Story 1.1: Scaffold Next.js, Supabase SSR e ambiente

**Implementação:** Concluída

As a developer,  
I want the repo inicial com App Router, TypeScript, Tailwind e cliente Supabase seguro via cookies,  
So that todas as stories seguintes assentem na arquitetura acordada.

**Referência:** arquitetura (create-next-app, `@supabase/ssr`). **NFR:** TLS, segredos fora do Git.

**Acceptance Criteria:**

**Given** repositório novo ou ramo de feature  
**When** executo o scaffold e configuro variáveis `NEXT_PUBLIC_SUPABASE_URL` e chaves  
**Then** a app compila, página inicial renderiza e sessão Supabase lê/escreve *cookie* sem expor *service role* no cliente  
**And** existe README com comandos `dev`/`build`

### Story 1.2: shadcn/ui, tema Teal e tema Ref-A opcional

**Implementação:** Concluída

As a profissional,  
I want a UI base com componentes acessíveis e tema NutriGestão Teal,  
So that a experiência visual alinha ao UX spec desde o primeiro ecrã.

**Referência:** UX-DR1, UX-DR2, `theme-nutri-teal.css` / `theme-nutri-ref-a.css`.

**Acceptance Criteria:**

**Given** projeto Next existente  
**When** corro `shadcn` init e importo tokens CSS do *planning-artifacts*  
**Then** `Button`, `Input`, `Card` renderizam com cores do tema Teal por defeito  
**And** posso alternar classe `theme-nutri-ref-a` em *demo* sem quebrar layout

### Story 1.3: Shell logado — sidebar e navegação mobile

**Implementação:** Concluída

As a profissional,  
I want sidebar em desktop e menu em *sheet* no telemóvel,  
So that consigo navegar módulos em campo e no escritório.

**Referência:** UX-DR3, UX-DR17, UX-DR14 (breakpoints).

**Acceptance Criteria:**

**Given** utilizador autenticado  
**When** acedo à área logada em viewport ≥1024px  
**Then** vejo sidebar fixa com itens de navegação e estado ativo visível  
**When** em viewport &lt;768px  
**Then** o menu principal abre num `Sheet` acionado por ícone, com mesmos destinos

### Story 1.4: Páginas de login e registo — layout duas colunas (sem social)

**Implementação:** Concluída

As a profissional,  
I want ecrãs de login e registo no layout 50/50 **só** com email e palavra-passe,  
So that o fluxo segue o UX spec e **não** expõe login social (FR2 fora de âmbito).

**Referência:** UX-DR4, UX-DR15 (foco, labels).

**Acceptance Criteria:**

**Given** rotas públicas `/login` e `/register`  
**When** abro qualquer uma  
**Then** vejo coluna de formulário e coluna visual conforme spec, com **Entrar** / registo por email  
**And** **não** existem botões nem separador “Ou” para Google ou outros provedores OAuth  
**And** campos têm `label`, erros associados e foco visível

### Story 1.5: Registo com email e palavra-passe

**Implementação:** Concluída

As a profissional,  
I want criar conta com email e senha,  
So that passo a usar a plataforma (FR1).

**Acceptance Criteria:**

**Given** formulário de registo válido  
**When** submeto email + senha + confirmação + campos obrigatórios do produto  
**Then** Supabase cria utilizador e sou redirecionado para onboarding ou *dashboard* vazio  
**And** erros de email duplicado ou senha fraca são mostrados sem *stack trace*

### Story 1.6: Sessão, logout e proteção de rotas

**Implementação:** Concluída

As a profissional,  
I want iniciar sessão e terminar sessão com invalidação de tokens,  
So that o meu acesso fica seguro (FR67).

**Acceptance Criteria:**

**Given** credenciais válidas  
**When** faço login  
**Then** obtenho sessão válida e rotas protegidas deixam de redirecionar para `/login`  
**When** faço logout  
**Then** *cookies*/sessão invalidam e sou redirecionado ao login

### Story 1.7: Recuperação de acesso por email

**Implementação:** Concluída

As a profissional,  
I want recuperar acesso via reset de senha ou *magic link*,  
So that não fico bloqueado se esquecer a senha (FR68).

**Acceptance Criteria:**

**Given** email registado  
**When** solicito recuperação  
**Then** recebo fluxo Supabase (link ou código) e consigo definir nova senha  
**And** mensagens não revelam se o email existe ou não (política de enumeração acordada no PRD)

### Story 1.8: Perfil profissional com CRN

**Implementação:** Concluída

As a profissional,  
I want cadastrar e editar o meu perfil incluindo CRN,  
So that o sistema possa usar o CRN em documentos (FR4).

**Acceptance Criteria:**

**Given** área de perfil  
**When** guardo nome e número CRN válido  
**Then** os dados persistem por *tenant*/utilizador e aparecem na UI  
**And** validação impede formato vazio onde for obrigatório

### Story 1.9: Autenticação de dois fatores

**Implementação:** Concluída

As a profissional,  
I want ativar e gerir 2FA,  
So that aumento a segurança da conta (FR3).

**Acceptance Criteria:**

**Given** conta autenticada  
**When** ativo 2FA seguindo fluxo Supabase/TOTP  
**Then** login subsequente exige segundo fator  
**When** desativo com confirmação  
**Then** login volta ao fluxo simples

---

## Epic 2: Cadastro operacional, onboarding e importação

Profissional cadastra clientes, estabelecimentos e pacientes, completa wizard inicial, importa CSV e vê histórico consolidado do paciente.

**Implementação (épico):** Concluído (story 2.7 ainda em backlog).

### Story 2.1: Modelo e CRUD de clientes PF e PJ

**Implementação:** Concluída

As a profissional,  
I want registar clientes pessoa física ou jurídica,  
So that organizo a minha carteira (FR6).

**Acceptance Criteria:**

**Given** sessão autenticada  
**When** crio cliente PF ou PJ com dados mínimos  
**Then** registo aparece na lista filtrável do meu *tenant*  
**And** RLS impede leitura por outro profissional (FR61)

### Story 2.2: Estabelecimentos por cliente PJ e tipo

**Implementação:** Concluída

As a profissional,  
I want associar estabelecimentos a clientes PJ com tipo (escola, hospital, etc.),  
So that aplico portarias e visitas corretas (FR7).

**Acceptance Criteria:**

**Given** cliente PJ existente  
**When** adiciono estabelecimento com tipo e morada  
**Then** guarda e lista sob o cliente  
**And** tipo é obrigatório e enum alinhado ao PRD

### Story 2.3: Pacientes e vínculos a estabelecimento ou PF

**Implementação:** Concluída

As a profissional,  
I want cadastrar pacientes ligados a estabelecimento ou a cliente PF,  
So that registo clínico fica coerente (FR8).

**Acceptance Criteria:**

**Given** cliente e opcionalmente estabelecimento  
**When** crio paciente com vínculo válido  
**Then** paciente aparece no contexto certo para visitas e prontuário

### Story 2.4: Perfil nutricional e formulários de avaliação

**Implementação:** Concluída

As a profissional,  
I want completar perfil do paciente com formulários de avaliação,  
So that suporto acompanhamento (FR9).

**Acceptance Criteria:**

**Given** paciente criado  
**When** preencho secções de avaliação definidas no MVP  
**Then** dados guardam versionados ou com *timestamp*  
**And** campos sensíveis respeitam máscaras e LGPD (sem dados em *toast*)

### Story 2.5: Histórico consolidado multi-estabelecimento

**Implementação:** Concluída

As a profissional,  
I want ver histórico de um paciente atravessando estabelecimentos,  
So that tenho visão única (FR10).

**Acceptance Criteria:**

**Given** paciente com registos em ≥2 estabelecimentos  
**When** abro ficha de histórico  
**Then** vejo linha do tempo ou lista unificada ordenada por data  
**And** cada evento indica estabelecimento de origem

### Story 2.6: Importação CSV/Excel — mapeamento e erros

**Implementação:** Concluída

As a profissional,  
I want importar clientes, estabelecimentos e pacientes via ficheiro,  
So that migro do Excel rapidamente (FR11, UX-DR11).

**Acceptance Criteria:**

**Given** ficheiro CSV exemplo  
**When** faço *upload* e mapeio colunas para campos  
**Then** pré-visualização mostra erros por linha antes de confirmar  
**When** confirmo importação válida  
**Then** contagem de registos criados é mostrada (*toast* ou resumo)  
**And** NFR7: desempenho aceitável até 500 linhas *(meta)*

### Story 2.7: Wizard de onboarding e sugestão de portarias

**Implementação:** Concluída

As a novo profissional,  
I want ser guiado no setup inicial e receber sugestão de portarias por UF/tipo,  
So that começo com contexto certo (FR55, FR56).

**Acceptance Criteria:**

**Given** primeira sessão pós-registo  
**When** escolho tipo de trabalho (institucional/clínico/ambos)  
**Then** wizard pede primeiro cliente/estabelecimento e sugere portarias aplicáveis para o estado  
**When** completo o wizard  
**Then** sou levado ao *dashboard* com estado “pronto para agendar visita”

### Story 2.8: Profissional responsável pela carteira (cliente e paciente)

**Implementação:** Concluída

As a profissional ou gestor de equipa,  
I want associar opcionalmente um membro da equipe como responsável pelo atendimento em cada cliente e paciente e ver a carteira por pessoa na área Equipe,  
So that há clareza de ownership e rastreio em auditoria (FR71).

**Acceptance Criteria:**

**Given** sessão no workspace com membros em `team_members`  
**When** edito cliente ou paciente e escolho um responsável (ou deixo vazio)  
**Then** o valor é guardado e validado contra o mesmo tenant  
**And** na página Equipe vejo listas de clientes e pacientes por membro  
**And** alterações em clientes e pacientes aparecem no log de auditoria; mutações via triggers de paciente incluem `actor_user_id` quando a sessão está disponível

---

## Epic 3: Checklists regulatórios (uso profissional)

**Implementação (épico):** Concluído.

### Story 3.1: Catálogo de checklists por portaria e campos obrigatórios

**Implementação:** Concluída

As a profissional,  
I want ver checklists aplicáveis ao meu estabelecimento com itens obrigatórios marcados,  
So that cumpro a portaria (FR12).

**Acceptance Criteria:**

**Given** estabelecimento com UF e tipo configurados  
**When** abro módulo de checklists  
**Then** vejo template ativo da portaria (ex.: SP no MVP) com *badges* de obrigatório  
**And** dados vêm do catálogo admin/seed sem vazamento entre *tenants*

### Story 3.2: Preenchimento com validação de obrigatórios

**Implementação:** Concluída

As a profissional,  
I want preencher itens e ser bloqueado se faltar obrigatório antes de concluir secção,  
So that não envio relatório incompleto (FR13, UX-DR5 parcial).

**Acceptance Criteria:**

**Given** checklist numa visita ou rascunho  
**When** marco item sem preencher campo obrigatório anexado  
**Then** validação inline impede avanço ou mostra erro claro  
**When** todos obrigatórios OK  
**Then** posso gravar estado intermediário

### Story 3.3: Checklists customizados do profissional

**Implementação:** Concluída

As a profissional,  
I want criar checklist custom com campos extra,  
So that adapto a clientes específicos (FR14).

**Acceptance Criteria:**

**Given** permissão no *tenant*  
**When** duplico template base e adiciono campos configuráveis  
**Then** posso aplicar esse modelo a visitas futuras desse estabelecimento

---

## Epic 4: Visitas técnicas, dossiê, PDF e email

**Implementação (épico):** Concluído (4.1–4.9).

### Story 4.1: Agendamento de visitas

**Implementação:** Concluída (ext. 2026-04-10: tipo de visita, equipe, modal duplo clique — alinhado a FR17 atualizado no PRD).

As a profissional,  
I want agendar visita a estabelecimento ou paciente,  
So that organizo o calendário (FR17, UX-DR9).

**Acceptance Criteria:**

**Given** entidades cadastradas  
**When** crio visita com data/hora e prioridade  
**Then** aparece no calendário/agenda e no *dashboard*  
**And** CTA “Iniciar visita” fica disponível no dia

**Extensões entregues:**

- **Tipo de visita** obrigatório no agendamento (lista fechada: clínica/paciente, técnica/conformidade, acompanhamento, auditoria, formação, outro).
- **Equipe:** cadastro em `/equipe` (cargo, área; CRN obrigatório só na nutrição); atribuição opcional na visita (“Eu” ou membro).
- **Agenda:** duplo clique num compromisso abre **modal** com detalhe e atalhos (ficha completa / iniciar visita).

### Story 4.2: Iniciar visita e checklist aplicável

**Implementação:** Concluída (2026-04-04: sessão de preenchimento ligada à visita, cabeçalho de execução, modelo aplicável por estabelecimento, pendências de NC da última sessão no mesmo estabelecimento).

As a profissional,  
I want iniciar execução com checklist carregado e cabeçalho de contexto,  
So that sei onde estou (FR18, UX-DR5, UX-DR6).

**Acceptance Criteria:**

**Given** visita agendada  
**When** inicio visita  
**Then** checklist correto carrega com pendências da última visita se existirem  
**And** *VisitExecutionHeader* mostra estabelecimento, data e progresso

### Story 4.3: Fotos por item com *storage*

**Implementação:** Concluída (bucket `checklist-fill-photos`, tabela `checklist_fill_item_photos`, UI por item no wizard com **Tirar foto** (`capture=environment`, telemóvel/tablet) e **Galeria** (sem *capture*), geolocalização opcional, erro de rede com retry por origem).

As a profissional,  
I want anexar fotos a itens específicos,  
So that tenho evidência (FR19).

**Acceptance Criteria:**

**Given** visita em curso  
**When** capturo ou envio foto para item X  
**Then** *thumbnail* liga-se ao `itemId` e metadados (tempo; geo se ativo) guardam  
**And** falha de rede mostra estado recuperável (MVP online)

**Extensão UX (campo):** em *mobile/tablet*, o profissional dispõe de ação explícita **Tirar foto** (câmara) além de **Galeria** (ficheiros existentes), alinhado a UX-DR5 / *ChecklistItemVisit*.

### Story 4.4: Anotações textuais por item

**Implementação:** Concluída (2026-04-16: coluna `item_annotation` em `checklist_fill_item_responses`, nota opcional por item após avaliação, distinta da descrição de NC em `note`; resumo “dossiê” ao validar a última secção com texto e fotos por item).

As a profissional,  
I want notas por item,  
So that documento o contexto (FR20).

**Acceptance Criteria:**

**Given** item do checklist  
**When** escrevo nota e guardo  
**Then** texto aparece no dossiê na secção do item

### Story 4.5: Destaque de não-conformidade recorrente

**Implementação:** Concluída (2026-04-16: por item, contagem de sessões anteriores no mesmo estabelecimento com NC; *badge* **Recorrente · N×** e texto explicativo no cartão do item; aviso global na página de execução da visita).

As a profissional,  
I want ver aviso quando item falhou em visitas anteriores,  
So that priorizo correção (FR21).

**Acceptance Criteria:**

**Given** histórico com NC no mesmo item e estabelecimento  
**When** abro item na visita atual  
**Then** vejo alerta textual e/ou *badge* “recorrente” com contagem

### Story 4.6: Compilar dossiê ao finalizar

**Implementação:** Concluída (2026-04-16: após validar a última secção, **Finalizar e ver dossiê** abre diálogo de confirmação; componente *ChecklistFillDossierPreview* com secções colapsáveis e conteúdo completo por item — avaliação, NC, anotação, fotos — via `ChecklistFillDossierItemBody`).

As a profissional,  
I want que o sistema agregue checklist, fotos e notas ao finalizar,  
So that obtenho relatório único (FR22, UX-DR7).

**Acceptance Criteria:**

**Given** visita com dados  
**When** clico finalizar (com confirmação se regras de negócio)  
**Then** *DossierPreview* mostra secções colapsáveis com conteúdo completo

### Story 4.7: Revisar, editar observações e aprovar

**Implementação:** Concluída (2026-04-16: `dossier_approved_at` em `checklist_fill_sessions`; edição no *preview* de texto de NC e anotação antes de aprovar; `Aprovar dossiê` com validação global; bloqueio de mutações em respostas/fotos via trigger + server actions após aprovação; visita ligada → `completed`; reabertura = nova versão de produto em roadmap explícito na UI).

As a profissional,  
I want ajustar texto e aprovar antes de fechar,  
So that controlo o que sai (FR23).

**Acceptance Criteria:**

**Given** dossiê em *preview*  
**When** edito observações permitidas e aprovo  
**Then** versão aprovada fica registada como tal  
**And** alterações posteriores seguem política FR70 (nova versão, original imutável)

### Story 4.8: Geração de PDF assíncrona com CRN

**Implementação:** Concluída (2026-04-17: tabela `checklist_fill_pdf_exports` + bucket `checklist-dossier-pdfs`; `pdf-lib` com texto do dossié e CRN/nome do perfil; job `processing→ready|failed`; UI *Gerar PDF / Gerar novamente / Transferir* com erro e retry; geração no server action com URL assinada; fila “assíncrona” MVP = job persistido + estados na UI; sem worker separado.)

As a profissional,  
I want exportar PDF do relatório com CRN incluído,  
So that envio a cliente e arquivo (FR24, FR5, UX-DR13).

**Acceptance Criteria:**

**Given** relatório aprovado  
**When** peço PDF  
**Then** job assíncrono processa e UI mostra *a gerar / pronto / erro* com *retry*  
**And** PDF contém identificação CRN do profissional

### Story 4.9: Envio automático por email

**Implementação:** Concluída (2026-04-18: colunas em `scheduled_visits` — `dossier_recipient_emails`, `dossier_email_send_status`, `dossier_email_last_error`, `dossier_email_sent_at`; Resend com PDF em anexo; após aprovação do dossiê `after()` tenta envio se houver destinatários e `RESEND_API_KEY` + remetente; UI na ficha da visita — destinatários, estado, erro, *Enviar*/*Reenviar*; opcional na *Nova visita*; sem fila externa — envio no worker da resposta em segundo plano via `after()`.)

As a profissional,  
I want configurar destinatários e enviar PDF por email,  
So that o cliente recebe sem passos manuais extra (FR25).

**Acceptance Criteria:**

**Given** emails configurados para a visita/estabelecimento  
**When** disparo envio pós-aprovação  
**Then** fila envia anexo ou link seguro conforme desenho  
**And** falha mostra estado na visita com ação *reenviar*

---

## Epic 5: Dashboard e organização

**Implementação (épico):** Concluído (5.1–5.6; dados financeiros mínimos em `financial_charges` antecipam integração com o épico 8).

### Story 5.1: Agenda do dia por prioridade

**Implementação:** Concluída (2026-04-18: `/inicio` ordena visitas do dia com `sortScheduledVisitsForDashboard` — prioridade urgente→baixa, tipo de visita regulatório antes de clínico, depois hora; `VisitAgendaBlock` com barra lateral por prioridade, tipo visível, CTAs *Ver* e *Iniciar*/*Continuar*; mesma ordenação por dia na agenda `/visitas`.)

As a profissional,  
I want ver visitas do dia ordenadas por prioridade/tipo,  
So that planifico a manhã (FR50, UX-DR9).

**Acceptance Criteria:**

**Given** visitas hoje  
**When** abro *dashboard*  
**Then** lista reflete ordem de prioridade acordada e CTAs *Iniciar* / *Ver*

### Story 5.2: Alertas regulatórios com *countdown*

**Implementação:** Concluída (2026-04-18: tabela `establishment_compliance_deadlines` + RLS por dono do cliente; secção na edição do estabelecimento para criar/eliminar prazos; `/inicio` lista alertas no horizonte −365d..+90d; `RegulatoryAlertCard` + `RegulatoryCountdown` (texto + ícone + estado textual, não só cor); CTA *Ver checklist* com `?template=` e scroll no catálogo; `diffCalendarDayKeys` / `calendarDaysUntilDueDate` no fuso do perfil.)

As a profissional,  
I want alertas de portaria com prazo visível,  
So that não perco vencimentos (FR51, UX-DR10).

**Acceptance Criteria:**

**Given** datas de compliance configuradas  
**When** prazo aproxima  
**Then** *DashboardAlertCard* mostra *countdown* e CTA *Ver checklist*  
**And** informação não depende só da cor (NFR28–29)

### Story 5.3: Pendências financeiras no *dashboard*

**Implementação:** Concluída (2026-04-04: tabela `financial_charges` + RLS por `owner_user_id`; `/financeiro` com lista, nova cobrança e *Marcar pago*; `/inicio` com `FinancialPendingCard` — totais em atraso e CTA *Ver pendências* / *Área financeira*; agregação com `summarizeOverdueCharges` e fuso do perfil via `todayKey`. Base de dados alinhada ao Épico 8.)

As a profissional,  
I want ver resumo de pendências financeiras,  
So that cobro ou acompanho (FR52).

**Acceptance Criteria:**

**Given** dados financeiros (Épico 8)  
**When** há valores em atraso  
**Then** cartão ou secção mostra totais e ligação ao detalhe

### Story 5.4: Separação pacientes vs financeiro

**Implementação:** Concluída (2026-04-18: `/inicio` com dois `DashboardFocusPanel` — bloco clínico «Pacientes, visitas e compliance» com barra lateral *primary* e subsecções; bloco «Financeiro» com barra *âmbar* e *placeholder* para 5.3; atalhos Pacientes / Visitas / Checklists no primeiro painel.)

As a profissional,  
I want blocos distintos para tópicos clínicos e financeiros,  
So that reduzo ruído cognitivo (FR53).

**Acceptance Criteria:**

**Given** *dashboard*  
**When** carrego página  
**Then** secções “Pacientes / visitas / compliance” e “Financeiro” são visualmente separadas

### Story 5.5: Briefing semanal

**Implementação:** Concluída (2026-04-18: `buildWeeklyBriefing` — janela móvel de 7 dias civis no fuso do perfil; filtra visitas `scheduled`/`in_progress` e prazos de compliance já carregados; `WeeklyBriefingWidget` com `<details>` (abrir/fechar), listas com limite + remissão à agenda / alertas completos; `formatDayKeyLong` em `calendar-tz`.)

As a profissional,  
I want resumo de avisos da semana,  
So that me organizo (FR54).

**Acceptance Criteria:**

**Given** eventos da semana  
**When** abro *widget* de briefing  
**Then** lista principais alertas e visitas futuras

### Story 5.6: Gráficos com tokens de tema

**Implementação:** Concluída (2026-04-18: dependência `recharts`; `buildVisitsByMonthSeries` + `VisitsMonthBarChart` no `/inicio` quando há visitas nos últimos 6 meses; `Cell` com `fill: var(--chart-1)` … `--chart-5`; grelha/eixos/tooltip com `var(--border)`, `var(--muted-foreground)`, `var(--card)`; helper `chartCssVar` em `lib/constants/chart-theme.ts`.)

As a profissional,  
I want gráficos de resumo quando houver dados,  
So that vejo tendências (UX-DR16).

**Acceptance Criteria:**

**Given** métricas agregadas (ex.: visitas por mês)  
**When** renderizo gráfico  
**Then** cores vêm de `--chart-*` ou *palette* central

---

## Epic 6: Ficha técnica, TACO e custos

**Implementação (épico):** Concluído (6.1–6.9, 2026-04-06).

### Story 6.1: Receitas e linhas de ingrediente

**Implementação:** Concluída (tabelas `technical_recipes` / `technical_recipe_lines`, RLS; UI lista/nova/editar em `/ficha-tecnica`; rascunho; validação de totais homogéneos massa/volume.)

As a profissional,  
I want criar receita com ingredientes e quantidades,  
So that baseio custo e nutrição (FR26, UX-DR8).

**Acceptance Criteria:**

**Given** módulo ficha técnica  
**When** adiciono linhas com peso/unidade  
**Then** posso guardar rascunho e validar totais

### Story 6.2: Ligação TACO e informação nutricional

**Implementação:** Concluída (2026-04-04: tabela `taco_reference_foods` com amostra MVP + RLS leitura para `authenticated`; `technical_recipe_lines.taco_food_id`; `searchTacoFoodsAction` com debounce na UI; `TacoLineLinker` no formulário de receita; painel «Nutrição estimada (TACO)» com `computeRecipeNutritionTotals` — g/kg/ml/l com aproximação água; `un` excluído do somatório.)

As a profissional,  
I want ingredientes ligados à TACO com cálculo automático,  
So that nutrição é consistente (FR27).

**Acceptance Criteria:**

**Given** catálogo TACO carregado  
**When** busco ingrediente no autocomplete  
**Then** NFR5: resposta &lt;1s em condições normais  
**And** valores nutricionais calculados por receita

### Story 6.3: Matéria-prima e custo unitário

**Implementação:** Concluída (2026-04-04: `professional_raw_materials` + RLS; `technical_recipe_lines.raw_material_id`; CRUD em `/ficha-tecnica/materias-primas`; formulário de receita com seleção por linha, custo por linha e painel total com `sumRecipeMaterialCostBrl` / compatibilidade massa·volume·un.)

As a profissional,  
I want registar custo de compra da matéria-prima,  
So that custo da receita reflete preços (FR28).

**Acceptance Criteria:**

**Given** ingrediente da *base*  
**When** defino custo unitário e unidade  
**Then** receitas que o usam atualizam totais

### Story 6.4: Fatores de correção e cocção

**Implementação:** Concluída (2026-04-05: colunas `correction_factor` e `cooking_factor` em `technical_recipe_lines` (0,01–10); correção multiplica quantidade no custo de matéria-prima; cocção multiplica na nutrição TACO; UI por linha no `RecipeForm`; validação Zod e testes.)

As a profissional,  
I want aplicar fatores de correção e cocção,  
So that quantidades netas estão corretas (FR29).

**Acceptance Criteria:**

**Given** linha de ingrediente  
**When** defino fatores  
**Then** custo e nutrição recalculam conforme fórmula do domínio

### Story 6.5: Custo total, impostos, margem e preço por porção

**Implementação:** Concluída (2026-04-05: colunas `portions_yield`, `margin_percent`, `tax_percent` em `technical_recipes`; `CostSummaryPanel` no formulário; `computeRecipePricingBreakdown` e nutrição por porção; persistência no guardar rascunho.)

As a profissional,  
I want ver painel de totais com impostos e margem,  
So that defino preço de venda (FR30–FR33, UX-DR8).

**Acceptance Criteria:**

**Given** receita completa  
**When** altero margem ou impostos  
**Then** *CostSummaryPanel* moststra custo total, preço sugerido por porção e info nutricional por porção

### Story 6.6: Escalonamento por regra de três

**Implementação:** Concluída (2026-04-06: `scaleIngredientQuantitiesForPortionYield` + cartão no `RecipeForm`; testes em `recipe-yield-scale.test.ts`.)

As a profissional,  
I want escalonar rendimento,  
So that adapto porções (FR34).

**Acceptance Criteria:**

**Given** receita base  
**When** informo novo rendimento desejado  
**Then** quantidades de ingredientes escalonam proporcionalmente

### Story 6.7: Recálculo em cascata

**Implementação:** Concluída (2026-04-06: após atualizar preço da matéria-prima, `revalidatePath` das fichas afetadas + redirecionamento com contagem de receitas; banner em `materias-primas`. Custos continuam derivados da base em tempo real.)

As a profissional,  
I want que alterar preço de ingrediente atualize todas as fichas afetadas,  
So that não fico com valores obsoletos (FR35, NFR3).

**Acceptance Criteria:**

**Given** ingrediente em N receitas  
**When** atualizo custo unitário  
**Then** job ou transação recalcula fichas e notifica conclusão ou mostra progresso  
**And** tempo dentro da meta NFR3 para volume MVP

### Story 6.8: Exportar ficha técnica em PDF

**Implementação:** Concluída (2026-04-06: `GET /ficha-tecnica/[id]/pdf`, `buildTechnicalRecipePdfBytes` com pdf-lib; ligações na lista e na edição; teste `technical-sheet-pdf.test.ts`.)

As a profissional,  
I want PDF da ficha,  
So that partilho com cozinha ou cliente (FR36).

**Acceptance Criteria:**

**Given** receita validada  
**When** exporto PDF  
**Then** documento inclui tabela de ingredientes, custos e nutrição conforme template

### Story 6.9: Administração — catálogo TACO (referência)

**Implementação:** Concluída (2026-04-06: migração `20260424120000_taco_reference_foods_admin_rls.sql`; `/admin/catalogo-taco`; `lib/actions/taco-reference-foods-admin.ts`; componente `TacoCatalogAdmin`.)

As a **administrador** ou **super administrador**,  
I want **gerir o catálogo `taco_reference_foods` na área `/admin`**,  
So that **a lista completa é auditável e atualizável no front** sem SQL manual (FR60, NFR35).

**Acceptance Criteria:**

**Given** `profiles.role` ∈ {`admin`, `super_admin`}  
**When** acedo à rota de administração do catálogo TACO  
**Then** vejo e posso criar, editar e eliminar alimentos de referência com RLS a permitir mutações só para estes papéis  
**And** utilizadores `user` não acedem à UI nem conseguem mutar a tabela

---

## Epic 7: POPs

**Implementação (épico):** Concluído (2026-04-06).

### Story 7.1: Templates POP por tipo de estabelecimento

**Implementação:** Concluída (tabela `pop_templates` + seeds por tipo; `/pops/modelos`; modelos filtrados em «Novo POP» por `establishment_type`.)

As a profissional,  
I want escolher template POP adequado,  
So that começo de modelo válido (FR37).

### Story 7.2: Criar e editar POP por estabelecimento

**Implementação:** Concluída (`establishment_pops` + RLS por estabelecimento; `/pops`, `/pops/estabelecimento/[id]`, novo/editar, eliminar.)

As a profissional,  
I want POPs vinculados ao estabelecimento,  
So that procedimentos são locais (FR38).

### Story 7.3: Versionamento de POP

**Implementação:** Concluída (`pop_versions` imutáveis; guardar cria nova versão; `/pops/[popId]/historico`; `nextPopVersionNumber` + testes.)

As a profissional,  
I want histórico de versões do POP,  
So that audito mudanças (FR39).

### Story 7.4: Exportar POP em PDF

**Implementação:** Concluída (`GET /pops/[popId]/pdf`, `buildPopPdfBytes`, teste `pop-pdf.test.ts`.)

As a profissional,  
I want PDF do POP,  
So that imprimo ou envio (FR40).

**Acceptance Criteria (7.1–7.4):** cada *story* tem CRUD ou exportação testável; versão anterior permanece consultável; RLS por *tenant*.

---

## Epic 8: Controle financeiro e contratos

**Implementação (épico):** Em progresso.

### Story 8.1: Status de pagamento por cliente

**Implementação:** Concluída (gráficos: últimos N meses, total até hoje, intervalo por datas; CSV por cartão; cores semânticas — ver story file e `financial-charts-ux-pattern.md`).

As a profissional,  
I want registar e filtrar status de pagamento,  
So that vejo inadimplência (FR41).

### Story 8.2: Recorrência de cobrança

**Implementação:** Backlog

As a profissional,  
I want definir mensal/anual/avulso,  
So that espelho contrato real (FR42).

### Story 8.3: Datas de contrato

**Implementação:** Backlog

As a profissional,  
I want início e fim de contrato,  
So that sei vigência (FR43).

### Story 8.4: Contratos a partir de modelos

**Implementação:** Backlog

As a profissional,  
I want gerar PDF pré-preenchido com dados do cliente,  
So that ganho tempo (FR44).

### Story 8.5: Alertas de renovação e vencimento

**Implementação:** Backlog

As a profissional,  
I want alertas antes do fim do contrato,  
So that renovo a tempo (FR45).

**Acceptance Criteria:** dados isolados por *tenant*; alertas aparecem no *dashboard* (ligação Épico 5).

---

## Epic 9: Portal externo e LGPD menores

**Implementação (épico):** Backlog.

### Story 9.1: Cadastro de utilizadores externos

**Implementação:** Backlog

As a profissional,  
I want convidar familiar/médico/paciente com acesso,  
So that partilho informação controlada (FR46).

### Story 9.2: Permissões por categoria de dado

**Implementação:** Backlog

As a profissional,  
I want definir o que cada externo vê por paciente,  
So that minimizo exposição (FR47).

### Story 9.3: Visualização no portal

**Implementação:** Backlog

As a utilizador externo,  
I want ver apenas relatórios/dados permitidos,  
So that acompanho o paciente (FR48).

### Story 9.4: Consentimento parental (menores)

**Implementação:** Backlog

As a profissional,  
I want fluxo de consentimento para menores,  
So that cumpro LGPD Art. 14 (FR49).

**Acceptance Criteria:** *login* separado ou *magic link*; linguagem acessível (UX spec portal); trilho de auditoria (Épico 11).

---

## Epic 10: Administração da plataforma

**Implementação (épico):** Backlog.

### Story 10.1: Gestão de tenants

**Implementação:** Backlog

As a admin,  
I want listar suspender e apoiar *tenants*,  
So that opero o SaaS (FR57).

### Story 10.2: Planos, limites e *add-ons*

**Implementação:** Backlog

As a admin,  
I want configurar planos,  
So that monetização e *feature flags* refletem o PRD (FR58).

### Story 10.3: Métricas da plataforma

**Implementação:** Backlog

As a admin,  
I want MRR, conversão trial, churn,  
So that acompanho negócio (FR59).

### Story 10.4: Catálogo portarias, TACO, templates

**Implementação:** Backlog

As a admin,  
I want gerir dados partilhados,  
So that profissionais recebem conteúdo atual (FR60).

### Story 10.5: CRUD e versionamento de checklists regulatórios

**Implementação:** Backlog

As a admin,  
I want editar e publicar nova versão de checklist,  
So that lei reflete no produto (FR15, UX-DR12).

### Story 10.6: Notificar profissionais ao atualizar portaria

**Implementação:** Backlog

As a sistema,  
I want notificar *tenants* afetados,  
So that atualizam processos (FR16).

**Acceptance Criteria:** *super-admin* role; sem acesso a dados clínicos de *tenants* salvo o estritamente necessário para suporte (política a documentar).

---

## Epic 11: Segurança transversal, auditoria e direitos do titular

**Implementação (épico):** Backlog.

### Story 11.1: Testes automatizados de isolamento multi-*tenant*

**Implementação:** Backlog

As a equipe,  
I want testes que provem ausência de *cross-tenant* em queries críticas,  
So that cumprimos FR61 e NFR14.

### Story 11.2: Log de auditoria em dados de paciente

**Implementação:** Backlog

As a sistema,  
I want registar mutações sensíveis,  
So that investigamos incidentes (FR62, NFR15).

### Story 11.3: Registo de consentimentos digital

**Implementação:** Backlog

As a sistema,  
I want armazenar evidência de consentimento,  
So that LGPD é demonstrável (FR63).

### Story 11.4: Relatório de dados pessoais (DSAR paciente)

**Implementação:** Backlog

As a profissional,  
I want gerar pacote de dados do paciente,  
So that respondo a pedidos (FR64).

### Story 11.5: Portabilidade de dados do profissional

**Implementação:** Backlog

As a profissional,  
I want exportar todos os meus dados em formato aberto,  
So that exerço direitos (FR65).

### Story 11.6: Notificações push/email transversais

**Implementação:** Backlog

As a profissional,  
I want receber eventos (agenda, alertas, portarias, financeiro),  
So that não perco urgências (FR66).

### Story 11.7: Pedido de exclusão de conta e dados

**Implementação:** Backlog

As a profissional,  
I want solicitar eliminação respeitando retenção legal,  
So that cumpro Art. 18 (FR69).

### Story 11.8: *Smoke* de acessibilidade WCAG AA

**Implementação:** Backlog

As a equipe,  
I want checklist e testes manuais nos fluxos críticos,  
So that UX-DR14 e UX-DR15 e NFR28–32 são verificados antes de *release*.

---

## Validação final (Passo 4)

| Verificação | Resultado |
|-------------|-----------|
| Cobertura FR1–FR70 | Cada FR no mapa; **FR2** explicitamente **fora de âmbito** (sem *story*); restantes com *story* ou critério |
| UX-DR1–UX-DR17 | Distribuídos; *shell*, temas, componentes de visita/*dashboard*/import/admin e padrões globais |
| Starter / Story 1.1 | Alinhado a `create-next-app` + Supabase SSR da arquitetura |
| Tabelas / entidades | Criadas incrementalmente por *story* (sem “big bang” único) |
| Dependências entre épicos | 1 → 2 → 3 → 4 → 5; 6–11 podem seguir em paralelo após 2 conforme capacidade, com dados mínimos onde necessário |
| Dependências dentro do épico | Cada *story* n.N assume apenas conclusão de n.(N-1) no mesmo épico |

**Workflow:** Create Epics and Stories **concluído.** Próximo passo sugerido: `bmad-sprint-planning` ou `bmad-dev-story` / `bmad-quick-dev` para implementação.
