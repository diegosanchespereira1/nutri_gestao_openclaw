---
stepsCompleted: ['step-01-document-discovery', 'step-02-prd-analysis', 'step-03-epic-coverage', 'step-04-ux-alignment', 'step-05-epic-quality', 'step-06-final-assessment']
documentsAnalyzed:
  prd: '_bmad-output/planning-artifacts/prd.md'
  architecture: null
  epics: null
  ux: null
  supersededBy: '_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-31.md'
---

> **Este relatório está desatualizado.** Foi gerado quando só o PRD existia.  
> **Use o relatório atual:** [`implementation-readiness-report-2026-03-31.md`](./implementation-readiness-report-2026-03-31.md)

---

# Implementation Readiness Assessment Report (histórico — 2026-03-30)

**Date:** 2026-03-30
**Project:** Nutricao_stratosTech

## Inventário de Documentos

| Tipo | Arquivo | Status |
|---|---|---|
| PRD | `prd.md` | Encontrado, completo |
| Arquitetura | — | Não criado ainda |
| Épicos/Stories | — | Não criado ainda |
| UX Design | — | Não criado ainda |

## Análise do PRD

### Requisitos Funcionais Extraídos (66 FRs)

**1. Gestão de Usuários e Autenticação (FR1-FR5)**
- FR1: Profissional pode criar conta na plataforma com email e senha
- FR2: Profissional pode autenticar via provedor OAuth social
- FR3: Profissional pode ativar e gerenciar autenticação de dois fatores
- FR4: Profissional pode cadastrar e manter seu perfil incluindo número de inscrição no CRN
- FR5: Sistema insere identificação CRN automaticamente em todos os documentos e prescrições gerados

**2. Gestão de Clientes, Estabelecimentos e Pacientes (FR6-FR11)**
- FR6: Profissional pode cadastrar clientes pessoa física ou jurídica
- FR7: Profissional pode cadastrar estabelecimentos vinculados a clientes PJ, classificados por tipo (escola, hospital, clínica, lar de idosos, empresa)
- FR8: Profissional pode cadastrar pacientes vinculados a estabelecimentos ou diretamente a clientes PF
- FR9: Profissional pode registrar perfil completo do paciente com formulários de avaliação nutricional
- FR10: Profissional pode visualizar histórico consolidado de um paciente atendido em múltiplos estabelecimentos
- FR11: Profissional pode importar clientes, estabelecimentos e pacientes a partir de arquivo CSV/Excel

**3. Checklists e Compliance Regulatório (FR12-FR16)**
- FR12: Sistema disponibiliza checklists pré-configurados por portaria sanitária estadual com campos obrigatórios identificados
- FR13: Profissional pode preencher checklists regulatórios com validação de campos obrigatórios
- FR14: Profissional pode criar checklists customizados com campos extras configuráveis
- FR15: Admin pode criar, editar e versionar checklists regulatórios na plataforma
- FR16: Sistema notifica profissionais afetados quando um checklist regulatório é atualizado pelo admin

**4. Visitas Técnicas e Dossiê (FR17-FR25)**
- FR17: Profissional pode agendar visitas técnicas a estabelecimentos e pacientes cadastrados
- FR18: Profissional pode iniciar e executar visita com preenchimento de checklist aplicável
- FR19: Profissional pode registrar fotos vinculadas a itens específicos do checklist durante a visita
- FR20: Profissional pode registrar anotações textuais vinculadas a itens do checklist
- FR21: Sistema destaca itens com não-conformidade recorrente baseado no histórico de visitas anteriores ao mesmo estabelecimento
- FR22: Sistema gera relatório/dossiê automaticamente ao profissional finalizar visita, compilando checklist preenchido, fotos e anotações
- FR23: Profissional pode revisar, editar e aprovar o relatório gerado antes da finalização definitiva
- FR24: Profissional pode exportar relatório de visita em PDF
- FR25: Sistema pode enviar relatório de visita por email automaticamente conforme configuração do profissional

**5. Ficha Técnica e Receitas (FR26-FR36)**
- FR26: Profissional pode cadastrar receitas com lista de ingredientes especificando peso/quantidade
- FR27: Sistema vincula ingredientes à tabela TACO e calcula informação nutricional automaticamente
- FR28: Profissional pode cadastrar matéria-prima com custo unitário de compra
- FR29: Sistema aplica fator de correção e fator de cocção ao cálculo de custo e nutricional
- FR30: Sistema calcula custo total da receita com base nos ingredientes, pesos e custos unitários
- FR31: Profissional pode configurar impostos aplicáveis e margem de venda por receita
- FR32: Sistema calcula preço de venda por porção considerando custo, impostos e margem
- FR33: Sistema calcula informação nutricional por porção com base na tabela TACO
- FR34: Profissional pode escalonar receita por regra de três ajustando rendimento desejado
- FR35: Sistema recalcula em cascata todas as fichas técnicas afetadas quando o preço de um ingrediente é alterado
- FR36: Profissional pode exportar ficha técnica completa em PDF

**6. POPs (FR37-FR40)**
- FR37: Sistema disponibiliza templates de POP pré-configurados por tipo de estabelecimento
- FR38: Profissional pode criar e customizar POPs vinculados a estabelecimentos
- FR39: Sistema mantém versionamento de POPs com histórico de alterações
- FR40: Profissional pode exportar POP em PDF

**7. Controle Financeiro (FR41-FR45)**
- FR41: Profissional pode registrar e acompanhar status de pagamento por cliente
- FR42: Profissional pode configurar recorrência de cobrança (mensal, anual, avulso) por cliente
- FR43: Profissional pode definir datas de início e fim de contrato por cliente
- FR44: Profissional pode gerar contratos a partir de modelos pré-preenchidos com dados do cliente
- FR45: Sistema emite alertas de renovação e vencimento de contrato

**8. Portal de Acesso Externo (FR46-FR49)**
- FR46: Profissional pode cadastrar usuários com acesso externo (familiar, médico, paciente)
- FR47: Profissional pode configurar quais categorias de dados cada usuário externo pode visualizar por paciente
- FR48: Usuário externo pode visualizar relatórios, medições, exames e plano nutricional do paciente conforme permissões concedidas
- FR49: Sistema coleta consentimento LGPD do responsável legal ao cadastrar paciente menor de idade

**9. Dashboard e Organização (FR50-FR54)**
- FR50: Profissional visualiza dashboard com agenda do dia organizada por prioridade e tipo
- FR51: Sistema exibe alertas regulatórios com countdown de vencimento no dashboard
- FR52: Profissional visualiza pendências financeiras no dashboard
- FR53: Dashboard apresenta informações separadas por tópico (pacientes versus financeiro)
- FR54: Sistema gera briefing com avisos da semana para o profissional se organizar

**10. Onboarding e Configuração (FR55-FR56)**
- FR55: Sistema guia novo profissional por wizard de configuração inicial adaptado ao tipo de trabalho selecionado
- FR56: Sistema sugere portarias aplicáveis baseado no estado e tipo de estabelecimento cadastrado

**11. Administração da Plataforma (FR57-FR60)**
- FR57: Admin pode gerenciar tenants (profissionais) da plataforma
- FR58: Admin pode configurar planos de assinatura, limites e add-ons
- FR59: Admin pode visualizar métricas da plataforma (assinantes, conversão, churn)
- FR60: Admin pode gerenciar catálogo de dados compartilhados (portarias, tabela TACO, templates)

**12. Segurança e Privacidade (FR61-FR66)**
- FR61: Sistema isola completamente os dados entre profissionais — nenhum tenant acessa dados de outro
- FR62: Sistema registra log de auditoria de todas as ações em dados de pacientes
- FR63: Sistema coleta e registra consentimento digital do paciente/responsável para uso de dados
- FR64: Sistema permite ao profissional gerar relatório de dados pessoais de um paciente para atendimento de direitos LGPD
- FR65: Profissional pode exportar todos os seus dados da plataforma em formato aberto a qualquer momento (Data Portability)
- FR66: Sistema envia notificações push/email ao profissional sobre eventos relevantes (agenda do dia, alertas regulatórios, pendências financeiras, atualizações de portarias)

**Total FRs: 66**

### Requisitos Não-Funcionais Extraídos (37 NFRs)

**Performance (8 NFRs)**
- NFR-P1: Carregamento de telas < 2 segundos com conexão 4G
- NFR-P2: Geração de relatório de visita < 5 segundos (checklist + até 10 fotos)
- NFR-P3: Recálculo em cascata < 10 segundos para até 100 fichas afetadas
- NFR-P4: Geração de PDF < 5 segundos
- NFR-P5: Busca TACO < 1 segundo (autocomplete)
- NFR-P6: Dashboard load < 3 segundos
- NFR-P7: Importação CSV < 30 segundos para até 500 registros
- NFR-P8: 500 profissionais concorrentes sem degradação

**Segurança (9 NFRs)**
- NFR-S1: Criptografia em repouso AES-256 para dados de pacientes
- NFR-S2: TLS 1.2+ em todas as conexões
- NFR-S3: Access token 15min + refresh token 7 dias
- NFR-S4: CAPTCHA após 3 falhas, rate limit 20 req/min por IP, atraso exponencial, nunca bloquear conta
- NFR-S5: Rate limiting API: leitura 100 req/min, escrita 30 req/min, upload 10 req/min
- NFR-S6: Zero vazamento cross-tenant verificado por testes a cada deploy
- NFR-S7: Log de auditoria com retenção 12 meses, campos sensíveis mascarados
- NFR-S8: Scan de vulnerabilidades no CI/CD a cada merge
- NFR-S9: Pen-test antes do lançamento e anualmente

**Escalabilidade (5 NFRs)**
- NFR-E1: De 50 para 5.000 profissionais sem redesign
- NFR-E2: Suportar crescimento de 15% ao mês em storage
- NFR-E3: 100 tenants × 1.000 pacientes sem degradação de queries
- NFR-E4: 1.000 jobs/hora em filas assíncronas
- NFR-E5: Auto-scaling com CPU/memória > 70%

**Disponibilidade e Confiabilidade (5 NFRs)**
- NFR-D1: Uptime 99.5% MVP → 99.9% Etapa 2
- NFR-D2: Deploy zero-downtime (rolling update)
- NFR-D3: Backup diário, retenção 30 dias, testado mensalmente
- NFR-D4: RTO < 4 horas, RPO < 1 hora
- NFR-D5: Retenção de dados 5 anos pós-contrato

**Acessibilidade (5 NFRs)**
- NFR-A1: WCAG AA para fluxos principais
- NFR-A2: Contraste mínimo 4.5:1 texto, 3:1 gráficos
- NFR-A3: Navegação por teclado para fluxos principais
- NFR-A4: Responsividade 375px-1920px
- NFR-A5: Fonte mínima 16px, redimensionável

**Integração (5 NFRs)**
- NFR-I1: Supabase Auth vinculado ao SLA 99.9%
- NFR-I2: Email transacional < 60 segundos, bounce < 2%
- NFR-I3: Tabela TACO pré-carregada, atualização manual
- NFR-I4: Gateway de pagamento com abstração Strategy Pattern (Etapa 2)
- NFR-I5: API pública versionada, documentada, rate-limited

**Total NFRs: 37**

### Requisitos Adicionais (Domínio e Restrições)

**Compliance e Regulatório:**
- LGPD: Dados sensíveis de saúde com proteção reforçada; consentimento específico para IA/métricas; revisão jurídica obrigatória pré-lançamento
- LGPD Menores: Consentimento parental obrigatório (até 12 anos, Art. 14 §1º); fluxo específico no cadastro de alunos; monitorar ECA Digital 2026
- Portarias Sanitárias: Lançamento SP; expansão por demanda; central admin sem mudança de código
- CRN: Identificação automática em documentos (MVP); assinatura eletrônica Gov.BR/ICP-Brasil (Etapa 2)

**Restrições Arquiteturais (SaaS B2B):**
- Multi-tenant com RLS por tenant via Supabase
- RBAC: 4 papéis (Super Admin, Profissional, Cliente PJ, Acesso Externo)
- 4 tiers de assinatura (Trial, Básico, Profissional, Enterprise)
- Supabase Auth como provedor único (elimina microserviço de Auth)
- Microserviços por domínio + fila de mensagens + API Gateway
- Feature flags por plano/tenant/global
- Billing engine com abstração de gateway (Strategy Pattern)

**Dependências Críticas:**
- Revisão jurídica LGPD antes do lançamento
- Validação de checklists de SP com nutricionista especialista
- Dados da tabela TACO carregados no banco

### Avaliação de Completude do PRD

**Pontos Fortes:**
- 66 FRs cobrindo 12 áreas de capacidade — cobertura abrangente
- 37 NFRs mensuráveis e testáveis em 6 categorias
- Escopo MVP claro com fases bem definidas (MVP → 1.5 → 2 → Futuro)
- Jornadas de usuário ricas com marcação de fase (⭐/🔮)
- Requisitos de domínio detalhados (LGPD, CRN, portarias)
- Estratégia de segurança robusta e sem lockout de conta
- Tiers de assinatura e RBAC bem definidos

**Gaps Potenciais Identificados:**
1. **FR sem detalhe de regras de negócio:** Alguns FRs como FR35 (cascata) e FR21 (não-conformidade recorrente) precisarão de regras de negócio detalhadas na fase de stories/arquitetura
2. **Sem FR para gestão de sessão/logout:** Falta requisito explícito para gestão de sessão, logout, expiração
3. **Sem FR para recuperação de senha:** Supabase Auth cobre, mas não está explícito
4. **Sem FR para exclusão de conta:** LGPD exige, coberto em FR64 parcialmente mas não explicitamente
5. **Sem FR para versionamento de checklists preenchidos:** FR39 cobre POPs, mas checklists preenchidos em visitas anteriores precisam ser imutáveis (evidência)
6. **Timeline MVP de 2 meses é agressivo** para 66 FRs mesmo com equipe de 3 devs — priorização interna do MVP será necessária na fase de épicos

## Validação de Cobertura de Épicos

**Status:** Documento de Épicos não existe ainda.

Não é possível validar cobertura de FRs contra épicos. Este passo deverá ser reexecutado após criação dos épicos e stories.

**Recomendação:** Ao criar épicos, garantir que cada um dos 66 FRs tenha rastreabilidade para pelo menos uma story.

## Alinhamento UX

**Status:** Documento de UX não existe ainda.

**Avaliação:** O PRD implica fortemente a necessidade de UX:
- Aplicação web responsiva com múltiplos perfis de usuário
- Dashboard com separação por tópicos
- Wizard de onboarding adaptativo
- Portal de acesso externo para leigos (familiares, gestores)
- Ficha técnica com cálculos complexos em tempo real
- Preenchimento de checklists em campo via celular

**Risco:** Sem UX documentado, o desenvolvimento pode gerar interfaces inconsistentes ou inadequadas para o público-alvo (nutricionistas em campo, gestores não-técnicos, familiares idosos).

**Recomendação:** Criar especificação de UX antes da implementação, priorizando:
1. Fluxo de visita técnica (workflow mais crítico e diferencial)
2. Ficha técnica com cascata de custos (interface mais complexa)
3. Dashboard do profissional (tela mais acessada)
4. Portal de acesso externo (público mais diverso)

## Revisão de Qualidade de Épicos

**Status:** Documento de Épicos não existe ainda. Não é possível avaliar qualidade.

**Recomendação:** Ao criar épicos, seguir as práticas:
- Cada épico entrega valor ao usuário (não milestone técnico)
- Épicos são independentes (Epic N não depende de Epic N+1)
- Stories sem dependências futuras
- Critérios de aceitação em formato Given/When/Then
- Tabelas de banco criadas quando necessárias, não upfront

## Resumo e Recomendações

### Status Geral de Prontidão

**PRECISA DE TRABALHO** — O PRD está sólido e completo, mas 3 dos 4 artefatos necessários para implementação ainda não existem (Arquitetura, UX, Épicos).

### Issues Críticos que Requerem Ação Imediata

| # | Issue | Severidade | Ação |
|---|---|---|---|
| 1 | Arquitetura não documentada | 🔴 Crítico | Criar documento de arquitetura técnica (Supabase schema, APIs, microserviços) |
| 2 | UX não documentado | 🔴 Crítico | Criar especificação de UX para os 4 fluxos prioritários |
| 3 | Épicos e Stories não criados | 🔴 Crítico | Quebrar 66 FRs em épicos e stories com critérios de aceitação |
| 4 | FRs faltantes no PRD | 🟠 Maior | Adicionar: gestão de sessão/logout, recuperação de senha, exclusão de conta, imutabilidade de checklists preenchidos |
| 5 | Timeline de 2 meses vs 66 FRs | 🟠 Maior | Priorizar FRs internamente no MVP — nem todos os 66 FRs podem ser implementados em 2 meses |
| 6 | Dependência jurídica LGPD | 🟡 Menor | Iniciar busca de advogado especialista para revisão de termos |
| 7 | Validação de checklists SP | 🟡 Menor | Agendar sessão com nutricionista especialista para validar portarias |

### Próximos Passos Recomendados (em ordem)

1. **Corrigir FRs faltantes no PRD** (30 min) — Adicionar FR67-FR70 para os gaps identificados
2. **Criar Arquitetura Técnica** — Schema Supabase, definição de APIs, estrutura de microserviços, design system
3. **Criar Especificação de UX** — Wireframes/fluxos para visita técnica, ficha técnica, dashboard, portal externo
4. **Criar Épicos e Stories** — Quebrar FRs em épicos com stories independentes e critérios de aceitação
5. **Reexecutar esta validação** — Após criação dos 3 artefatos, rodar novamente para validação completa
6. **Iniciar desenvolvimento** — Somente após validação completa

### Nota Final

Esta avaliação identificou **7 issues** em **4 categorias** (3 críticos, 2 maiores, 2 menores). O PRD em si é de alta qualidade: 66 FRs testáveis, 37 NFRs mensuráveis, escopo claro por fases, jornadas marcadas com indicador de fase, e requisitos de domínio detalhados. Os gaps são principalmente de FRs menores que ficaram implícitos (auth flows cobertos pelo Supabase) e da ausência natural dos artefatos downstream (Arquitetura, UX, Épicos) que são o próximo passo do processo.
