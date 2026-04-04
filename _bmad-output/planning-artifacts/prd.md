---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments: ['_bmad-output/brainstorming/brainstorming-session-2026-03-30-001.md']
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: 'saas_b2b'
  domain: 'healthcare'
  complexity: 'high'
  projectContext: 'greenfield'
---

# Product Requirements Document - Nutricao_stratosTech

**Autor:** Diego
**Data:** 2026-03-30

## Executive Summary

A plataforma NutriGestão (nome de trabalho) é um SaaS B2B voltado para profissionais de nutrição que prestam consultoria a múltiplos estabelecimentos — hospitais, clínicas, escolas, lares de idosos e empresas — e simultaneamente atendem pacientes individuais. O produto resolve um problema estrutural do setor: a fragmentação entre trabalho de campo, compliance regulatório, gestão de pacientes e controle financeiro, que hoje é feita com papel, planilhas e WhatsApp, gerando perda de tempo, risco regulatório e dificuldade de escalar o negócio do profissional.

A plataforma opera em dois eixos complementares que nenhum concorrente une: **nutrição institucional** (checklists regulatórios, visitas técnicas, fichas técnicas, POPs, cardápios) e **nutrição clínica** (prontuário de pacientes, avaliações nutricionais, planos de ação, monitoramento de evolução). Além do profissional, entrega valor direto para os estabelecimentos que precisam estar em conformidade mas não possuem conhecimento técnico, e para familiares e médicos que precisam acompanhar pacientes à distância.

### O Que Torna Este Produto Especial

**Automação que elimina burocracia:** O profissional preenche o checklist no celular durante a visita e o relatório sai pronto — fotos, anotações e geolocalização se compilam automaticamente num dossiê digital. Atualizar o preço de um ingrediente recalcula em cascata todas as receitas, fichas técnicas e listas de compras.

**Ficha técnica com custo real:** Cada receita é documentada com ingredientes por peso, custo de matéria-prima, fator de correção/cocção, impostos e margem de venda — o preço por porção sai automaticamente. Alterar um ingrediente propaga para todas as fichas afetadas.

**Conhecimento regulatório embutido:** O sistema já contém os checklists por portaria e estado, com campos obrigatórios pré-configurados. O profissional não precisa memorizar legislação — a plataforma guia. Alertas com countdown avisam quando prazos regulatórios estão vencendo.

**Organização multi-cliente com isolamento de dados:** Um profissional gerencia todos os seus estabelecimentos e pacientes numa única plataforma, cada um com seus dados completamente separados e organizados. Visão unificada do profissional, visão isolada por cliente.

**Ponte entre técnico e leigo:** O mesmo dado é apresentado em camadas — profundidade técnica para o nutricionista, indicadores visuais para o gestor hospitalar, resumos acessíveis para o familiar do paciente. Portal unificado de acesso externo com permissões granulares.

**Visão completa (roadmap):** Modo offline real para trabalho de campo sem internet (Etapa 2), app mobile nativo (Etapa 2), ciclo financeiro completo com gateway de pagamento (Etapa 2), teleconsulta e IA avançada (Etapa 2).

## Classificação do Projeto

- **Tipo:** SaaS B2B (com componente B2C no portal de acesso externo)
- **Domínio:** Healthcare — Nutrição Clínica e Institucional
- **Complexidade:** Alta — regulamentação por estado, dados sensíveis de saúde (LGPD), múltiplos contextos e perfis de usuário
- **Contexto:** Greenfield — produto novo do zero
- **Concorrentes analisados:** Food Checker, DietSystem, Nutrium, Clinora, Nutrio, Sanut, Illumia/Culinary Digital
- **Posicionamento competitivo:** Único no mercado brasileiro e internacional a unir nutrição clínica + institucional numa plataforma SaaS com automação de campo e compliance regulatório embutido

## Critérios de Sucesso

### Sucesso do Usuário (MVP)

- **Redução drástica de tempo burocrático:** O profissional gera relatório de visita completo (checklist + fotos + anotações + dossiê) em menos de 2 minutos após finalizar a visita, versus processo manual atual (baseline a ser mensurado)
- **Organização multi-cliente sem fricção:** O profissional navega entre estabelecimentos e pacientes em no máximo 2 toques, com dados completamente isolados e contextualizados
- **Conformidade regulatória sem memorização:** O sistema guia 100% dos campos obrigatórios por portaria; alertas de countdown eliminam visitas atrasadas; o profissional não precisa consultar legislação externamente
- **Atualização de custos em cascata:** Alterar o preço de um ingrediente recalcula automaticamente todas as fichas técnicas afetadas em menos de 10 segundos
- **Ficha técnica com custo real:** Profissional obtém preço por porção considerando ingredientes, fatores de correção/cocção, impostos e margem — sem planilha

### Sucesso do Usuário (Etapa 2)

- **Trabalho de campo sem interrupção:** Modo offline funcional com zero perda de dados e sincronização transparente ao reconectar
- **Inteligência artificial:** Transcrição de áudio, preenchimento preditivo, geração de cardápio, OCR de rótulos

### Sucesso de Negócio

- **Aquisição inicial:** 50 nutricionistas assinantes ativos nos primeiros 6 meses pós-lançamento
- **Retenção:** Churn mensal abaixo de 5% após os primeiros 3 meses de operação
- **Ativação:** 70%+ dos usuários em trial completam o onboarding guiado e realizam pelo menos 1 visita ou cadastram 1 cliente na primeira semana
- **Marketplace:** Catálogo de fornecedores ativo na Etapa 1.5; monetização via destaque pago a partir de 100+ assinantes
- **Add-ons:** Funcionalidades WhatsApp como add-on pago contribuindo para ARPU a partir da Etapa 2

### Sucesso Técnico

- **Disponibilidade:** 99.5%+ de uptime mensal
- **Performance:** Carregamento de telas < 2 segundos; geração de relatório < 5 segundos; recálculo em cascata < 10 segundos
- **Segurança:** Zero incidentes de vazamento de dados de saúde; criptografia em repouso ativa desde o dia 1
- **Escalabilidade:** Arquitetura suporta crescimento de 50 para 5.000 profissionais sem redesign de infraestrutura
- **Multi-tenant:** Isolamento de dados por tenant verificado e auditável; nenhum dado cruza entre profissionais

### Resultados Mensuráveis

| Métrica | Baseline (atual) | Meta MVP (2 meses) | Meta Etapa 2 (8 meses) |
|---|---|---|---|
| Nutricionistas em validação | 0 | 3-5 (beta fechado) | 50 assinantes |
| Churn mensal | — | < 5% | < 3% |
| Tempo para gerar relatório | A mensurar | < 2 min | < 30 seg (com IA) |
| Conversão trial → pago | — | > 20% | > 30% |
| NPS do profissional | — | > 40 | > 60 |
| Uptime mensal | — | 99.5% | 99.9% |

## Escopo do Projeto e Desenvolvimento em Fases

### Estratégia de MVP

**Abordagem:** MVP de resolução de problema — entregar o mínimo necessário para que nutricionistas que usam Excel digam "nunca mais volto". Foco em velocidade de entrega (2 meses) e validação com profissionais reais.

**Benchmark de sucesso:** Ser claramente superior ao Excel nos 3 workflows core: (1) visita técnica com relatório automático, (2) ficha técnica com custo real e cascata, (3) controle de pagamentos.

**Plataforma MVP:** Web responsiva (desktop + mobile via navegador). Sem app nativo, sem modo offline.

**Requisitos de Equipe (mínimo recomendado para 2 meses):**
- 1 dev full-stack senior (React + Node/Supabase)
- 1 dev frontend (React + design system)
- 1 dev backend (Supabase + Edge Functions + microserviços)
- Acesso a designer UI para componentes críticos (pode ser parcial)

### MVP — Fase 1 (2 meses)

**Jornadas Suportadas:**
- Maria — Visita Técnica (sem offline, sem áudio)
- Maria — Onboarding (com importação CSV, sem sandbox)
- Diego — Admin básico

**Capacidades Must-Have:**

| Módulo | Escopo |
|---|---|
| **Auth + Perfil** | Supabase Auth (email/senha, OAuth, 2FA), cadastro do profissional com CRN |
| **Clientes e Estabelecimentos** | CRUD clientes PJ/PF, estabelecimentos com tipo (escola/hospital/clínica/lar/empresa), pacientes vinculados, perfil completo do paciente, formulários de avaliação, histórico multi-estabelecimento |
| **Checklists Regulatórios** | Checklists por portaria (lançamento: SP), campos obrigatórios pré-configurados, checklists customizáveis, campos extras configuráveis |
| **Visitas Técnicas** | Agendamento, execução com checklist + registro fotográfico + anotações, alerta de não-conformidade recorrente (baseado em histórico), relatório automático com preview/aprovação, export PDF, envio por email |
| **Ficha Técnica** | Receita com ingredientes por peso, vínculo tabela TACO (nutricional), lista de matéria-prima com custo unitário, fator de correção e cocção, cálculo de custo total, impostos configuráveis, margem de venda (%), preço por porção, informação nutricional por porção, escalonamento regra de três, recálculo em cascata (preço de ingrediente propaga para todas as fichas), export PDF |
| **POPs** | Procedimentos Operacionais Padronizados: templates pré-configurados + customizáveis, vinculados ao estabelecimento, versionamento, export PDF |
| **Financeiro Básico** | Dashboard de status de pagamentos, controle de recorrência (mensal/anual/avulso), datas de início/fim de contrato, modelos de contrato pré-preenchidos, lembretes de renovação |
| **Dashboard** | Estático por perfil: agenda do dia por prioridade, alertas regulatórios com countdown, pendências financeiras, separação por tópico (pacientes vs financeiro) |
| **Portal Acesso Externo** | Básico: familiar/médico visualiza relatórios, medições, exames e plano nutricional do paciente. Permissões configuradas pelo profissional. Gestão de consentimento LGPD |
| **Onboarding** | Wizard por perfil de trabalho, importação CSV/Excel (clientes, estabelecimentos, pacientes) |
| **Admin SaaS** | Gestão de tenants, CRUD portarias/checklists regulatórios, configuração de planos, dashboard de métricas básico |
| **Segurança** | RLS em todas as tabelas, criptografia em repouso (AES-256), TLS 1.2+, 2FA, JWT com expiração curta, rate limiting, CSP headers, queries parametrizadas, log de auditoria, termos de consentimento digital. **Dependência:** Revisão jurídica dos termos por advogado especialista em LGPD antes do lançamento |

### Etapa 1.5 — Complemento (mês 3-4)

Features que completam a experiência mas não são bloqueantes para validação inicial:

- **Portal Cliente PJ** — Dashboard de métricas para gestores (Dona Margarida/Carlos), semáforo de conformidade, pacote para fiscalização, evolução de indicadores, status de prontidão
- **Marketplace de Fornecedores** — Catálogo básico gerenciado pelo admin
- **Gravação de áudio** em visitas (storage + playback)
- **Sandbox de demonstração** para trial
- **Cardápio escolar** por faixa etária + mapa de alergias + lista de compras automática
- **Central de ajuda contextual**
- **Busca filtrada por categoria**
- **Alertas configuráveis** avançados (email automático habilitável)
- **Biblioteca de legislações** pesquisável
- **Metas do paciente** com barra de progresso e evolução visual
- **Fichas de preparo simplificadas**, checklist para cozinha, cardápio visual para mural

### Etapa 2 — Crescimento (mês 5-8)

- **Modo offline** (PWA + Service Workers + IndexedDB + sincronização)
- **App mobile nativo** (React Native)
- Ciclo financeiro completo (gateway de pagamento real, cobrança automatizada, assinatura eletrônica, NFS-e)
- Teleconsulta via Jitsi
- Transcrição de áudio com IA
- IA avançada (copilot, OCR, geração de cardápio, preenchimento preditivo)
- Portal externo avançado (timeline, ficha visual, gráficos de tendência, alertas familiares)
- WhatsApp Business (add-on pago)
- Gamificação, multi-profissional, colaboração, supervisão
- Assinatura eletrônica (Gov.BR / ICP-Brasil)
- i18n (es/en)
- Google Calendar / Apple Calendar
- Mensagens internas, chat de suporte IA
- Marketplace com planos para fornecedores e cupons
- Monitoramento remoto, diário alimentar, triagem nutricional

### Fase 3 — Visão Futura

- Integração com wearables (Apple Watch, Fitbit, balanças inteligentes)
- Prontuário interoperável (HL7 FHIR) para integração com sistemas hospitalares
- Benchmark anônimo entre estabelecimentos (efeito rede com dados agregados)
- Marketplace como hub de serviços de nutrição
- Expansão internacional (LATAM — espanhol)

### Mitigação de Riscos de Escopo

| Risco | Tipo | Mitigação |
|---|---|---|
| Timeline de 2 meses insuficiente | Recursos | Escopo cirúrgico definido; Etapa 1.5 como buffer; features cortáveis identificadas |
| Ficha Técnica com cascata complexa | Técnico | Prototipar cálculo em cascata na semana 1; se muito complexo, simplificar para cálculo isolado por receita |
| Supabase RLS como gargalo de performance | Técnico | Testar com volume simulado (100 tenants × 1000 pacientes) no mês 1; otimizar queries se necessário |
| Nutricionista não abandona Excel | Mercado | Validação com 3-5 profissionais no mês 1.5 (beta fechado); importação CSV para migração sem fricção |
| Checklists regulatórios incorretos | Domínio | Validar checklists de SP com nutricionista especialista antes do lançamento |
| Escopo creep durante desenvolvimento | Processo | Qualquer feature nova vai para Etapa 1.5; MVP congelado após aprovação deste PRD |

## Jornadas de Usuário

### Jornada 1: Maria — Dia de Visita Técnica (Jornada Primária)

> **Nota de escopo:** Esta jornada descreve a experiência completa (visão futura). No MVP: sem modo offline (requer conexão), sem gravação de áudio (só foto + texto), sem sincronização local. Funcionalidades marcadas com ⭐ são MVP; com 🔮 são Etapa 1.5/2.

**Persona:** Maria, 32 anos, nutricionista autônoma. CRN ativo, 4 clientes institucionais (2 escolas, 1 hospital, 1 lar de idosos) e 12 pacientes particulares. Vive no carro entre visitas, celular é sua principal ferramenta.

**Cena de Abertura — 7h da manhã:**
Maria acorda e recebe a notificação push matinal: "Bom dia Maria! Hoje: 2 visitas técnicas, 1 consulta particular. Atenção: checklist da Escola B vence em 3 dias. Pagamento da Escola A: R$800 pendente há 10 dias." Ela abre o app e vê o dashboard separado por tópicos — Pacientes à esquerda, Financeiro à direita, tudo por ordem de urgência. Em 30 segundos sabe exatamente como será seu dia. ⭐

**Ação Crescente — 9h, Escola B:**
Maria chega na cozinha da escola. Ela abre o app e inicia a visita — o sistema já pré-carregou o checklist da portaria estadual aplicável à Escola B, com os itens pendentes da última visita destacados em amarelo ⭐. Maria vai marcando item a item. No item 4.3 (piso da cozinha), encontra não-conformidade. Com um toque, tira foto — o sistema vincula automaticamente ao item 4.3 com geolocalização e timestamp ⭐. Ela registra uma anotação: "Piso molhado próximo à bancada de preparo, risco de queda. Terceira vez que registro isso." ⭐ (🔮 Na Etapa 2, poderá gravar áudio com transcrição automática.)

O sistema destaca: "⚠️ Item 4.3 foi não-conforme nas últimas 2 visitas. Ação corretiva anterior não implementada." ⭐ Maria anota recomendação de ação urgente.

**Clímax — 10h30, finalizando a visita:**
Maria clica "Finalizar Visita". Em segundos, o sistema apresenta o dossiê completo: checklist preenchido, 4 fotos vinculadas, 6 anotações, horário de entrada e saída ⭐. Tudo compilado num relatório formatado. Maria revisa a prévia, ajusta uma observação no item 7.1, aprova ⭐. O sistema salva o relatório, gera PDF e envia automaticamente por email para Dona Margarida (diretora da escola), conforme configuração ⭐.

**Resolução — 10h35, no carro:**
Maria consulta a agenda: "Próxima visita: Hospital Santa Clara — 14h. 1 não-conformidade pendente, checklist da Portaria X a aplicar." ⭐

**Antes vs Depois:**
- Antes: 2h montando relatório no computador à noite, risco de esquecer detalhes, fotos soltas no celular sem contexto
- Depois: Relatório pronto em segundos, zero retrabalho, evidências vinculadas automaticamente

### Jornada 2: Maria — Onboarding e Primeiro Uso (Jornada de Ativação)

> **Nota de escopo:** Sandbox de demonstração é Etapa 1.5. No MVP: wizard + importação CSV + cadastro direto.

**Persona:** Mesma Maria, mas no momento de descoberta da plataforma. Ela usa Excel e WhatsApp há 5 anos. Está frustrada com a desorganização mas cética sobre mudar de ferramenta.

**Cena de Abertura — Descoberta:**
Maria encontra a plataforma por indicação de uma colega. Acessa o site, vê a proposta de valor. Clica "Iniciar teste grátis". Em 30 segundos criou a conta. ⭐

**Ação Crescente — Wizard de onboarding:**
O sistema pergunta: "Como você trabalha? (a) Consultoria institucional (b) Atendimento clínico particular (c) Ambos." Maria seleciona "Ambos". O dashboard se configura automaticamente com módulos relevantes ⭐. O wizard guia: "Passo 1: cadastre seu primeiro cliente." Maria cadastra a Escola B — seleciona tipo "Escola", estado "SP", e o sistema já sugere as portarias aplicáveis ⭐.

**Clímax — Importação e primeiro valor:**
Maria importa sua planilha de clientes via wizard de importação CSV ⭐. Os 4 estabelecimentos e 12 pacientes estão no sistema. Ela abre uma ficha técnica, cadastra uma receita com ingredientes — o sistema calcula custo por porção automaticamente com TACO ⭐. Pensa: "Isso é o que eu faço em 2 horas no Excel, pronto em segundos." (🔮 Na Etapa 1.5, poderá explorar sandbox com dados fictícios antes de cadastrar dados reais.)

**Resolução — Primeira visita agendada:**
Maria agenda a primeira visita para amanhã. O sistema já preparou o checklist regulatório ⭐. Maria fecha o notebook pensando: "Por que não descobri isso antes?"

**Antes vs Depois:**
- Antes: Medo de perder tempo aprendendo ferramenta nova, dados espalhados em 5 planilhas diferentes
- Depois: Em 15 minutos, todo o histórico migrado, primeira visita agendada com checklist pré-carregado

### Jornada 3: Dona Margarida e Carlos — Portal do Cliente PJ (Etapa 1.5)

> **Nota de escopo:** Portal Cliente PJ completo é Etapa 1.5. No MVP: profissional envia relatório PDF diretamente por email. Esta jornada documenta a experiência-alvo para a Etapa 1.5.

**Persona A:** Dona Margarida, 58 anos, diretora da Escola B. Não entende nutrição. Precisa prestar contas à Secretaria de Educação e aos pais.

**Persona B:** Carlos, 45 anos, gestor administrativo do Hospital Santa Clara. Pensa em risco, custo e compliance. A vigilância sanitária pode vir a qualquer momento.

**Cena de Abertura — Dona Margarida recebe o relatório:**
Após a visita de Maria, Dona Margarida recebe email automático: "Relatório de visita técnica — Escola B — 30/03/2026. Acesse seu portal para detalhes." Ela clica no link, faz login com a senha que Maria cadastrou para ela.

**Ação Crescente — Navegando o portal:**
Dona Margarida vê o dashboard de métricas: conformidade geral 85% (amarelo), 2 itens pendentes de correção. Ela abre o histórico de visitas — timeline com todas as visitas, cada uma com relatório disponível para download em PDF. Ela clica "Baixar relatório" e salva para enviar à Secretaria de Educação. Vê a evolução: "Conformidade: Jan 72% → Fev 78% → Mar 85%". O investimento na nutricionista está dando resultado.

**Cena Paralela — Carlos no hospital:**
Carlos abre seu portal e vê o semáforo: 🟢 "Conformidade geral: 91% — OK". Ele clica em "Status de prontidão para fiscalização": "Se a vigilância sanitária viesse hoje: 91% pronto. Pendente: atualizar POP de higienização (vence em 5 dias)." Carlos liga para Maria pedindo que priorize o POP. Quando precisa do pacote de documentação completo para uma auditoria, clica "Gerar pacote para fiscalização" — todos os checklists, relatórios e planos de ação do período compilados em um ZIP.

**Resolução:**
Dona Margarida apresenta os relatórios na reunião de pais com confiança. Carlos renova o contrato com Maria sem hesitar — os dados provam o valor. Nenhum dos dois precisou entender nutrição para tomar decisões informadas.

**Antes vs Depois:**
- Antes: Dona Margarida pedia relatórios por WhatsApp e recebia dias depois. Carlos juntava papéis em pânico quando sabia de fiscalização
- Depois: Acesso imediato, self-service, dados traduzidos em linguagem que gestores entendem

### Jornada 4: Diego — Administração da Plataforma (Jornada de Operações)

**Persona:** Diego, fundador e super admin da plataforma. Precisa garantir crescimento, retenção e operação saudável.

**Cena de Abertura — Manhã de segunda-feira:**
Diego abre o painel admin e vê o dashboard de saúde da plataforma: MRR atual, novos assinantes na semana, churn do mês, taxa de conversão trial→pago. Um alerta: "3 profissionais não fizeram login nos últimos 10 dias — risco de churn."

**Ação Crescente — Gestão de conteúdo regulatório:**
Diego recebe notificação de que a portaria sanitária do estado de MG foi atualizada. Ele acessa a Central de Conteúdo Regulatório, atualiza o checklist correspondente (adiciona novo item obrigatório, reformula item 3.2). Publica a versão 2. Todos os nutricionistas que atendem em MG recebem automaticamente: "Portaria X atualizada — novo item obrigatório adicionado. Seu checklist já foi atualizado."

**Clímax — Gestão do marketplace:**
Um fornecedor de termômetros digitais solicita cadastro no marketplace. Diego revisa no painel de gestão de fornecedores: dados da empresa, produtos oferecidos, preço. Aprova o cadastro e define o tier: listagem gratuita. O fornecedor aparece no catálogo para todos os profissionais. Outro fornecedor, já ativo há 3 meses, solicita upgrade para destaque pago — Diego aprova e a receita B2B do marketplace cresce.

**Resolução — Monitoramento técnico:**
Diego verifica o painel de infraestrutura: uso de storage (fotos e áudios crescendo 15% ao mês), filas de processamento saudáveis, latência dentro do esperado. Identifica que precisa escalar o storage em 2 meses. Planeja o upgrade no Kubernetes. Verifica a gestão multi-tenant: 47 tenants ativos, distribuição por plano, nenhum incidente de isolamento de dados.

**Antes vs Depois:**
- Antes: Sem plataforma, sem métricas, sem operação estruturada
- Depois: Visão completa do negócio, conteúdo regulatório atualizado centralmente, marketplace gerando receita adicional, infraestrutura monitorada

### Resumo de Requisitos Revelados pelas Jornadas

| Jornada | Capacidades Reveladas | Fase |
|---|---|---|
| Maria — Visita Técnica | Dossiê automático, foto com geolocalização, alertas regulatórios, relatório com preview, envio por email | MVP |
| Maria — Visita (evolução) | Modo offline, gravação de áudio, transcrição IA, sincronização, quick actions | Etapa 1.5/2 |
| Maria — Onboarding | Wizard por perfil, importação CSV, configuração automática por tipo de trabalho, sugestão de portarias por estado | MVP |
| Maria — Onboarding (evolução) | Sandbox demo | Etapa 1.5 |
| Dona Margarida/Carlos — Portal PJ | Dashboard de métricas simplificado, download de relatórios, semáforo de compliance, pacote para fiscalização, evolução de indicadores | Etapa 1.5 |
| Diego — Admin | Dashboard SaaS, CRUD regulatório com versionamento, gestão de tenants | MVP |
| Diego — Admin (evolução) | Gestão de fornecedores (marketplace), monitoramento de infraestrutura, sinais de churn | Etapa 1.5/2 |

## Requisitos Específicos de Domínio

### Compliance e Regulatório

**LGPD — Dados de Saúde (Dados Sensíveis):**
- Dados de saúde (prontuário, medições, diagnósticos) são dados pessoais sensíveis sob a LGPD, com proteção reforçada
- Base legal primária: tutela da saúde em procedimentos por profissionais de saúde
- Consentimento específico e destacado obrigatório para: uso de dados anonimizados em treinamento de IA, métricas, estudos e comercialização de insights agregados
- Requisito: Revisão jurídica dos termos por advogado especialista em LGPD antes do lançamento

**LGPD — Dados de Menores (Escolas):**
- Dados de crianças (até 12 anos) exigem consentimento específico de pelo menos um dos pais ou responsável legal (LGPD Art. 14, §1º)
- Consentimento deve ser destacado, não genérico — não pode estar embutido num contrato geral
- Para adolescentes (12-18 anos), princípio do "melhor interesse" se aplica mas consentimento parental não é obrigatório pelo Art. 14
- Necessário fluxo de consentimento parental no cadastro de alunos em escolas
- ECA Digital (2026) em vigor — fiscalização começa janeiro 2027. Monitorar evolução

**Portarias Sanitárias:**
- Cada estado tem portarias próprias para serviços de alimentação
- Lançamento inicial: São Paulo (portarias estaduais + RDC/Anvisa federais)
- Expansão progressiva para outros estados conforme crescimento da base
- Central de conteúdo regulatório (admin) permite adicionar estados sem mudança de código

**CRN — Conselho Regional de Nutricionistas:**
- Resolução CFN nº 666/2020 autoriza teleconsulta e prescrição eletrônica
- Assinatura eletrônica conforme Lei nº 14.063/2020 — aceita Gov.BR ou ICP-Brasil
- Prescrição deve incluir: nome do profissional + número de inscrição no CRN
- Resolução CFN nº 772/2024 estabelece CIP digital como padrão
- MVP: prescrições incluem identificação CRN automaticamente, formato imprimível. Assinatura eletrônica formal na Etapa 2

### Privacidade e Retenção de Dados

- Isolamento multi-tenant rigoroso — dados de um profissional jamais visíveis por outro
- Política de retenção: 5 anos após encerramento de contrato (conforme práticas de saúde)
- Direito de exclusão (LGPD Art. 18): exclusão respeitando obrigações legais de retenção
- Anonimização irreversível para dados usados em treinamento de IA e insights agregados
- Exportação completa de dados a qualquer momento (Data Portability — LGPD Art. 18)

### Segurança de Aplicação e Infraestrutura

> Critérios mensuráveis de segurança estão na seção de Requisitos Não-Funcionais. Esta seção documenta a estratégia e as técnicas de mitigação.

**Proteção contra ataques:**
- DDoS: Rate limiting por IP e por tenant, CDN com proteção DDoS, auto-scaling no Kubernetes
- Brute force: CAPTCHA após 3 falhas, rate limit 20 req/min por IP, atraso exponencial na resposta (1s→2s→4s→8s), notificação por email após 5 falhas, Magic Link como fallback. **Nunca bloquear a conta**
- Bot protection: User-agent validation, honeypot fields, fingerprinting de dispositivo

**Validação e sanitização de entrada:**
- SQL Injection: Queries parametrizadas obrigatórias, zero concatenação de strings
- XSS: Sanitização de todo input, Content Security Policy (CSP) headers restritivos
- CSRF: Tokens anti-CSRF em todas as mutações, SameSite cookies
- Input validation: Limite de tamanho em todos os campos, validação de tipo/formato no frontend E backend, rejeição de payloads malformados
- File upload: Validação de MIME type real, limite de tamanho (fotos: 10MB), scan de malware, armazenamento em bucket separado

**Row Level Security (RLS) — Supabase:**
- Políticas RLS ativas em todas as tabelas com dados de tenant
- Regra base: `auth.uid() = user_id` — nenhum usuário acessa dados de outro
- Acesso externo: policy vinculada a tabela de permissões explícitas
- Admin: policy separada com role `service_role`, nunca exposta ao frontend
- Teste automatizado: suite que verifica isolamento cross-tenant a cada deploy

**Segurança de infraestrutura:**
- Secrets via vault (não hardcoded)
- Containers Docker com imagem mínima (distroless/alpine), sem root
- Network policies no Kubernetes: zero acesso público direto aos microserviços
- Scan de vulnerabilidades no CI/CD a cada merge
- Pen-test antes do lançamento e anualmente

**Monitoramento de segurança:**
- Alertas para: picos anormais, login falhado em massa, queries RLS inesperadas, uploads suspeitos
- Log centralizado com retenção 12 meses, campos sensíveis mascarados
- Plano de resposta a incidentes documentado antes do lançamento

### Modo Offline e Integridade (Etapa 2)

- Dados locais criptografados no dispositivo
- Conflitos de sincronização: política "última escrita vence" + log de conflito para revisão
- Fotos e áudios com hash de integridade (não alterados pós-captura)

### Requisitos de Integração

**MVP:**
- Tabela TACO como base de dados nutricional
- Gateway de pagamento via camada de abstração (preparação arquitetural)
- Email transacional (relatórios, alertas, cobranças)

**Etapa 2:**
- WhatsApp Business API (add-on pago)
- Jitsi Meet (React SDK, self-hosted) para teleconsulta
- NFS-e para nota fiscal
- Assinatura eletrônica (Gov.BR ou ICP-Brasil)

### Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Vazamento de dados de saúde | Crítico | Criptografia E2E, RLS, 2FA, audit trail, pen-test pré-lançamento |
| Portaria desatualizada no sistema | Alto | Versionamento com vigência, notificação, processo de monitoramento |
| Dados de menores sem consentimento | Alto | Fluxo obrigatório de consentimento parental, bloqueio sem aceite |
| Perda de dados offline | Alto | Salvamento local criptografado, confirmação visual de sync, backup redundante |
| Prescrição sem identificação CRN | Médio | Campo obrigatório no cadastro, inserção automática em documentos |
| Ataque DDoS | Alto | CDN + rate limiting + auto-scaling K8s |
| SQL Injection / XSS | Crítico | Queries parametrizadas, sanitização, CSP headers, validação dupla |

## Inovação e Padrões Novos

### Áreas de Inovação Detectadas

**1. Convergência inédita de dois domínios:**
Nenhum concorrente une nutrição clínica e institucional numa mesma plataforma SaaS. Cria categoria nova: gestão integrada de consultoria nutricional.

**2. Automação de campo com dossiê digital:**
Relatório que se constrói automaticamente enquanto o profissional trabalha — fotos, áudios, anotações e geolocalização compilados num dossiê. Conceito de "body cam" adaptado para inspeção nutricional.

**3. Compliance como serviço embutido:**
O sistema sabe quais portarias se aplicam, quais campos são obrigatórios, e alerta com countdown. Conhecimento regulatório dentro do produto, não na cabeça do profissional.

**4. Recálculo em cascata de custos:**
Alterar preço de ingrediente propaga por receitas → fichas técnicas → cardápios → listas de compras. Primitiva simples com impacto enorme.

**5. Portal unificado multi-persona:**
Componente único que adapta profundidade ao perfil do visualizador. Progressive disclosure aplicado a dados de saúde.

### Contexto de Mercado e Competitivo

| Aspecto | Concorrentes | Esta Plataforma |
|---|---|---|
| Escopo | Clínico OU institucional | Ambos integrados |
| Trabalho de campo | Online-first | Web responsiva MVP; Offline-first com sync (Etapa 2) |
| Relatórios | Montagem manual pós-visita | Geração automática na visita |
| Compliance | Checklists genéricos | Portarias embutidas por estado com countdown |
| Custos de receitas | Cálculo isolado | Cascata automática ingrediente → cardápio |
| Acesso externo | Portal separado ou inexistente | Portal unificado multi-persona |
| Financeiro | Controle básico ou inexistente | Ciclo completo (Etapa 2) com abstração de gateway |

### Abordagem de Validação

| Inovação | Como Validar | Quando |
|---|---|---|
| Dossiê automático | Beta com 5 nutricionistas — medir tempo antes/depois | Pré-lançamento |
| Compliance embutido | Validar checklists com CRN-SP e nutricionistas de SP | Pré-lançamento |
| Cascata de custos | Teste com fichas técnicas reais de 3 estabelecimentos | Desenvolvimento |
| Portal multi-persona | Teste com 1 familiar, 1 gestor, 1 médico | Beta |
| Modo offline | Teste em 3 locais com Wi-Fi ruim | Beta |

### Mitigação de Riscos de Inovação

| Risco | Fallback |
|---|---|
| Dossiê automático complexo demais | Modo simplificado: checklist básico + template |
| Portarias difíceis de manter | Lançar só SP, validar modelo antes de expandir |
| Cascata com erros de propagação | Pré-visualização de impacto antes de confirmar |
| Portal confuso para leigos | Modo ultra-simplificado: apenas verde/vermelho |
| Offline com conflitos de sync | Política clara + notificação + log de conflitos |

## Requisitos Específicos SaaS B2B

### Visão Geral do Tipo de Projeto

Plataforma SaaS B2B multi-tenant com componente B2C (portal de acesso externo). Modelo de receita por assinatura recorrente com add-ons (WhatsApp) e marketplace (fornecedores). Atende profissionais autônomos e pequenas equipes de nutrição.

### Modelo Multi-Tenant

- **Isolamento:** Cada profissional (nutricionista) é um tenant. Dados de clientes, pacientes, visitas, checklists, receitas e financeiro são completamente isolados por tenant via Supabase Row Level Security
- **Hierarquia de dados:** Tenant (Profissional) → Clientes (PJ/PF) → Estabelecimentos → Pacientes. Cada nível herda isolamento do nível superior
- **Acesso cross-tenant:** Proibido. Único ponto de visão cross-tenant é o Super Admin para métricas agregadas e anonimizadas
- **Dados compartilhados (não-tenant):** Portarias/checklists regulatórios, tabela TACO, catálogo de fornecedores, templates de contrato — gerenciados pelo Super Admin, acessíveis por todos os tenants em modo leitura

### Matriz RBAC (Role-Based Access Control)

| Papel | Escopo | Permissões |
|---|---|---|
| **Super Admin** | Plataforma inteira | CRUD portarias/checklists, gestão de tenants, gestão de fornecedores, métricas SaaS, monitoramento de infraestrutura, configuração de planos |
| **Profissional** | Seu tenant | CRUD clientes/pacientes/visitas/checklists/receitas/financeiro, configuração de alertas, acesso ao marketplace, gestão de permissões de acesso externo |
| **Cliente PJ** | Seu estabelecimento | Leitura de relatórios/visitas/métricas do seu estabelecimento, download PDF, visualização de evolução de indicadores |
| **Acesso Externo** | Paciente(s) específico(s) | Leitura de dados do paciente conforme permissões configuradas pelo Profissional (medições, relatórios, exames, plano nutricional) |

**Regras adicionais:**
- Profissional controla quem tem acesso externo e a quais dados — acesso aberto por padrão para familiar/médico, restrição por exceção
- Cliente PJ nunca acessa dados de pacientes de outros estabelecimentos do mesmo profissional
- Acesso Externo nunca acessa dados de outros pacientes (exceto se explicitamente autorizado, como médico que atende múltiplos pacientes)

### Tiers de Assinatura

| Plano | Público-alvo | Funcionalidades | Limites |
|---|---|---|---|
| **Trial** | Qualquer profissional | Todas as funcionalidades do Profissional por 14 dias + sandbox demo | 14 dias, até 3 clientes, até 10 pacientes |
| **Básico** | Profissional solo, início de carreira | Dashboard, agenda, checklists, visitas, relatórios, pacientes, receitas básicas | Até 5 clientes, até 30 pacientes, 1GB storage |
| **Profissional** | Profissional autônomo consolidado | Tudo do Básico + financeiro completo, portal acesso externo, fichas técnicas, cardápios, POPs, alertas avançados | Até 20 clientes, até 200 pacientes, 10GB storage |
| **Enterprise** | Equipes / Clínicas de nutrição | Tudo do Profissional + multi-profissional, supervisão, transferência de pacientes, relatórios consolidados | Ilimitado clientes/pacientes, 50GB storage, suporte prioritário |

**Add-ons (cobrados separadamente):**
- WhatsApp Business (envio de relatórios, lembretes, cobranças)
- Storage adicional (pacote de 10GB)

**Observações:**
- Limites são configuráveis pelo Super Admin sem mudança de código
- Upgrade/downgrade de plano em tempo real
- Período de carência de 30 dias após expiração do trial antes de bloquear acesso (dados preservados)

### Considerações de Arquitetura Técnica

**Banco de Dados e Auth — Supabase (serviço central):**
- PostgreSQL com RLS em todas as tabelas de tenant
- Supabase Auth como provedor único de autenticação/autorização (JWT, OAuth social, Magic Link, 2FA) — elimina necessidade de microserviço de Auth próprio
- Todos os microserviços validam tokens JWT emitidos pelo Supabase Auth
- Policies de RLS integradas diretamente com `auth.uid()`, simplificando isolamento multi-tenant
- Realtime subscriptions para atualizações em tempo real (dashboard, alertas)
- Supabase Storage com policies de acesso vinculadas ao Auth para fotos, áudios e documentos
- Supabase Edge Functions para lógica server-side que precisa de acesso direto ao banco

**Backend — Microserviços:**
- Serviços independentes por domínio: Visitas/Checklists, Pacientes/Prontuário, Receitas/Fichas, Financeiro, Notificações, Marketplace, Admin
- Comunicação via fila de mensagens (RabbitMQ ou equivalente) para operações assíncronas (geração de PDF, envio de email/WhatsApp, sincronização offline)
- API Gateway como ponto único de entrada com rate limiting — autenticação delegada ao Supabase Auth

**Frontend — Web + Mobile:**
- React (web) com PWA para modo offline (Service Workers + IndexedDB)
- React Native ou framework cross-platform para mobile
- Design system compartilhado entre web e mobile
- i18n desde o início (pt-BR, preparado para es/en)

**Infraestrutura — Docker/Kubernetes:**
- Containers stateless, escaláveis horizontalmente
- Auto-scaling baseado em carga
- CI/CD com deploy zero-downtime
- Ambientes: development, staging, production

### Considerações de Implementação

- **Feature flags:** Sistema de feature flags para habilitar/desabilitar funcionalidades por plano, por tenant, ou globalmente — essencial para rollout gradual e testes A/B
- **Billing engine:** Integração com gateway de pagamento (Stripe/Mercado Pago) via camada de abstração (Strategy Pattern) para gerenciar assinaturas, upgrades, downgrades e add-ons
- **Onboarding personalizado:** Wizard que adapta o setup inicial baseado no plano e tipo de trabalho do profissional
- **Data migration:** Wizard de importação CSV/Excel para migração de dados de outros sistemas
- **Observabilidade:** Logging estruturado, métricas de negócio (MRR, churn, engagement), alertas operacionais

## Requisitos Funcionais

### 1. Gestão de Usuários e Autenticação

- **FR1:** Profissional pode criar conta na plataforma com email e senha
- **FR2:** Profissional pode autenticar via provedor OAuth social
- **FR3:** Profissional pode ativar e gerenciar autenticação de dois fatores
- **FR4:** Profissional pode cadastrar e manter seu perfil incluindo número de inscrição no CRN
- **FR5:** Sistema insere identificação CRN automaticamente em todos os documentos e prescrições gerados

### 2. Gestão de Clientes, Estabelecimentos e Pacientes

- **FR6:** Profissional pode cadastrar clientes pessoa física ou jurídica
- **FR7:** Profissional pode cadastrar estabelecimentos vinculados a clientes PJ, classificados por tipo (escola, hospital, clínica, lar de idosos, empresa)
- **FR8:** Profissional pode cadastrar pacientes vinculados a estabelecimentos ou diretamente a clientes PF
- **FR9:** Profissional pode registrar perfil completo do paciente com formulários de avaliação nutricional
- **FR10:** Profissional pode visualizar histórico consolidado de um paciente atendido em múltiplos estabelecimentos
- **FR11:** Profissional pode importar clientes, estabelecimentos e pacientes a partir de arquivo CSV/Excel

### 3. Checklists e Compliance Regulatório

- **FR12:** Sistema disponibiliza checklists pré-configurados por portaria sanitária estadual com campos obrigatórios identificados
- **FR13:** Profissional pode preencher checklists regulatórios com validação de campos obrigatórios
- **FR14:** Profissional pode criar checklists customizados com campos extras configuráveis
- **FR15:** Admin pode criar, editar e versionar checklists regulatórios na plataforma
- **FR16:** Sistema notifica profissionais afetados quando um checklist regulatório é atualizado pelo admin

### 4. Visitas Técnicas e Dossiê

- **FR17:** Profissional pode **agendar visitas** a estabelecimentos e pacientes cadastrados, com **tipo de visita** selecionável (ex.: visita clínica/paciente, técnica/conformidade, acompanhamento, auditoria, formação, outro), **atribuição opcional** a um membro da **equipe** cadastrada pelo titular (predefinição: o próprio titular), agenda semanal horária e **detalhe da visita em modal ao duplo clique** no compromisso. O titular pode **cadastrar e gerir a equipe** (nome, contactos, cargo, área nutrição vs. outra; **CRN obrigatório só** para perfis na área da nutrição). *(Modelo de dados: `visit_kind`, `assigned_team_member_id`, tabela `team_members`; ver artefacto de implementação.)*
- **FR18:** Profissional pode iniciar e executar visita com preenchimento de checklist aplicável
- **FR19:** Profissional pode registrar fotos vinculadas a itens específicos do checklist durante a visita
- **FR20:** Profissional pode registrar anotações textuais vinculadas a itens do checklist
- **FR21:** Sistema destaca itens com não-conformidade recorrente baseado no histórico de visitas anteriores ao mesmo estabelecimento
- **FR22:** Sistema gera relatório/dossiê automaticamente ao profissional finalizar visita, compilando checklist preenchido, fotos e anotações
- **FR23:** Profissional pode revisar, editar e aprovar o relatório gerado antes da finalização definitiva
- **FR24:** Profissional pode exportar relatório de visita em PDF
- **FR25:** Sistema pode enviar relatório de visita por email automaticamente conforme configuração do profissional

### 5. Ficha Técnica e Receitas

- **FR26:** Profissional pode cadastrar receitas com lista de ingredientes especificando peso/quantidade
- **FR27:** Sistema vincula ingredientes à tabela TACO e calcula informação nutricional automaticamente
- **FR28:** Profissional pode cadastrar matéria-prima com custo unitário de compra
- **FR29:** Sistema aplica fator de correção e fator de cocção ao cálculo de custo e nutricional
- **FR30:** Sistema calcula custo total da receita com base nos ingredientes, pesos e custos unitários
- **FR31:** Profissional pode configurar impostos aplicáveis e margem de venda por receita
- **FR32:** Sistema calcula preço de venda por porção considerando custo, impostos e margem
- **FR33:** Sistema calcula informação nutricional por porção com base na tabela TACO
- **FR34:** Profissional pode escalonar receita por regra de três ajustando rendimento desejado
- **FR35:** Sistema recalcula em cascata todas as fichas técnicas afetadas quando o preço de um ingrediente é alterado
- **FR36:** Profissional pode exportar ficha técnica completa em PDF

### 6. Procedimentos Operacionais Padronizados (POPs)

- **FR37:** Sistema disponibiliza templates de POP pré-configurados por tipo de estabelecimento
- **FR38:** Profissional pode criar e customizar POPs vinculados a estabelecimentos
- **FR39:** Sistema mantém versionamento de POPs com histórico de alterações
- **FR40:** Profissional pode exportar POP em PDF

### 7. Controle Financeiro

- **FR41:** Profissional pode registrar e acompanhar status de pagamento por cliente
- **FR42:** Profissional pode configurar recorrência de cobrança (mensal, anual, avulso) por cliente
- **FR43:** Profissional pode definir datas de início e fim de contrato por cliente
- **FR44:** Profissional pode gerar contratos a partir de modelos pré-preenchidos com dados do cliente
- **FR45:** Sistema emite alertas de renovação e vencimento de contrato

### 8. Portal de Acesso Externo

- **FR46:** Profissional pode cadastrar usuários com acesso externo (familiar, médico, paciente)
- **FR47:** Profissional pode configurar quais categorias de dados cada usuário externo pode visualizar por paciente
- **FR48:** Usuário externo pode visualizar relatórios, medições, exames e plano nutricional do paciente conforme permissões concedidas
- **FR49:** Sistema coleta consentimento LGPD do responsável legal ao cadastrar paciente menor de idade

### 9. Dashboard e Organização

- **FR50:** Profissional visualiza dashboard com agenda do dia organizada por prioridade e tipo
- **FR51:** Sistema exibe alertas regulatórios com countdown de vencimento no dashboard
- **FR52:** Profissional visualiza pendências financeiras no dashboard
- **FR53:** Dashboard apresenta informações separadas por tópico (pacientes versus financeiro)
- **FR54:** Sistema gera briefing com avisos da semana para o profissional se organizar

### 10. Onboarding e Configuração

- **FR55:** Sistema guia novo profissional por wizard de configuração inicial adaptado ao tipo de trabalho selecionado
- **FR56:** Sistema sugere portarias aplicáveis baseado no estado e tipo de estabelecimento cadastrado

### 11. Administração da Plataforma

- **FR57:** Admin pode gerenciar tenants (profissionais) da plataforma
- **FR58:** Admin pode configurar planos de assinatura, limites e add-ons
- **FR59:** Admin pode visualizar métricas da plataforma (assinantes, conversão, churn)
- **FR60:** Admin pode gerenciar catálogo de dados compartilhados (portarias, tabela TACO, templates)

### 12. Segurança e Privacidade

- **FR61:** Sistema isola completamente os dados entre profissionais — nenhum tenant acessa dados de outro
- **FR62:** Sistema registra log de auditoria de todas as ações em dados de pacientes
- **FR63:** Sistema coleta e registra consentimento digital do paciente/responsável para uso de dados
- **FR64:** Sistema permite ao profissional gerar relatório de dados pessoais de um paciente para atendimento de direitos LGPD
- **FR65:** Profissional pode exportar todos os seus dados da plataforma em formato aberto a qualquer momento (Data Portability)
- **FR66:** Sistema envia notificações push/email ao profissional sobre eventos relevantes (agenda do dia, alertas regulatórios, pendências financeiras, atualizações de portarias)
- **FR67:** Profissional pode encerrar sessão (logout) e sistema invalida tokens de acesso
- **FR68:** Profissional pode recuperar acesso à conta via email (reset de senha / Magic Link)
- **FR69:** Profissional pode solicitar exclusão completa da sua conta e dados pessoais conforme LGPD Art. 18, respeitando obrigações legais de retenção
- **FR70:** Sistema preserva checklists preenchidos em visitas como registros imutáveis (evidência legal) — edições geram nova versão, não substituem o original

## Requisitos Não-Funcionais

### Performance

| Critério | Meta | Contexto |
|---|---|---|
| Carregamento de telas | < 2 segundos | Qualquer tela navegável com conexão 4G |
| Geração de relatório de visita | < 5 segundos | Dossiê completo com checklist + até 10 fotos |
| Recálculo em cascata (preço de ingrediente) | < 10 segundos para até 100 fichas afetadas | Propagação de alteração de custo |
| Geração de PDF (ficha técnica / relatório) | < 5 segundos | Documento com tabelas e imagens |
| Busca de ingredientes na tabela TACO | < 1 segundo | Autocomplete durante cadastro de receita |
| Dashboard load | < 3 segundos | Incluindo agenda, alertas e pendências financeiras |
| Importação CSV | < 30 segundos para até 500 registros | Clientes + estabelecimentos + pacientes |
| Usuários simultâneos | 500 profissionais concorrentes sem degradação | Meta para os primeiros 12 meses |

### Segurança

| Critério | Meta | Contexto |
|---|---|---|
| Criptografia em repouso | AES-256 para todos os dados de pacientes | Requisito LGPD para dados sensíveis de saúde |
| Criptografia em trânsito | TLS 1.2+ em todas as conexões | Sem exceção |
| Expiração de token | Access token 15min + refresh token 7 dias | Supabase Auth JWT |
| Tentativas de login | CAPTCHA após 3 falhas, rate limit 20 req/min por IP, atraso exponencial (1s→2s→4s→8s), notificação por email após 5 falhas, Magic Link como fallback. **Nunca bloquear a conta** |
| Rate limiting API | Leitura: 100 req/min, Escrita: 30 req/min, Upload: 10 req/min por usuário | Proteção contra abuso |
| Isolamento multi-tenant | Zero vazamento cross-tenant verificado por testes automatizados a cada deploy | RLS + testes de regressão |
| Log de auditoria | Retenção 12 meses, campos sensíveis mascarados | Compliance e investigação |
| Scan de vulnerabilidades | Executado automaticamente no CI/CD a cada merge | npm audit / Snyk equivalente |
| Pen-test | Antes do lançamento e anualmente | Contratação externa |

### Escalabilidade

| Critério | Meta | Contexto |
|---|---|---|
| Crescimento horizontal | De 50 para 5.000 profissionais sem redesign de infraestrutura | Containers stateless + auto-scaling |
| Storage | Suportar crescimento de 15% ao mês em fotos/documentos | Monitoramento proativo |
| Banco de dados | 100 tenants × 1.000 pacientes cada sem degradação de queries | Benchmark a ser validado no mês 1 |
| Filas assíncronas | Processamento de 1.000 jobs/hora (PDF, email, sync) | Geração de relatórios e notificações |
| Auto-scaling | Escalar containers automaticamente com base em CPU/memória > 70% | Kubernetes HPA |

### Disponibilidade e Confiabilidade

| Critério | Meta | Contexto |
|---|---|---|
| Uptime mensal | 99.5% (MVP) → 99.9% (Etapa 2) | Máximo ~3.6h de downtime/mês no MVP |
| Deploy | Zero-downtime (rolling update) | Profissionais podem estar usando durante deploy |
| Backup de dados | Automático diário, retenção 30 dias, testado mensalmente | Restauração verificável |
| Recuperação de desastre | RTO < 4 horas, RPO < 1 hora | Tempo para restaurar serviço e perda máxima de dados |
| Retenção de dados pós-contrato | 5 anos após encerramento | Práticas de saúde e obrigações legais |

### Acessibilidade

| Critério | Meta | Contexto |
|---|---|---|
| WCAG | Nível AA para fluxos principais | Portal externo usado por gestores e familiares de diversas idades |
| Contraste | Mínimo 4.5:1 para texto, 3:1 para elementos gráficos | Legibilidade em dispositivos variados |
| Navegação por teclado | Todos os fluxos principais acessíveis sem mouse | Profissionais com limitações motoras |
| Responsividade | Funcional em telas de 375px (mobile) até 1920px (desktop) | Web responsiva como plataforma única no MVP |
| Tamanho de fonte | Mínimo 16px para corpo de texto, redimensionável | Conforto de leitura em campo |

### Integração

| Critério | Meta | Contexto |
|---|---|---|
| Supabase Auth | Disponibilidade vinculada ao SLA do Supabase (99.9%) | Dependência crítica |
| Email transacional | Entrega em < 60 segundos, taxa de bounce < 2% | Relatórios e alertas |
| Tabela TACO | Dados pré-carregados, atualização manual pelo admin | Sem dependência de API externa |
| Gateway de pagamento (Etapa 2) | Abstração via Strategy Pattern, failover entre provedores | Preparação arquitetural no MVP |
| API pública | Versionada, documentada, rate-limited | Preparação para integrações futuras |
