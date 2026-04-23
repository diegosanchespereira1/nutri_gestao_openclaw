---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['_bmad-output/planning-artifacts/prd.md', '_bmad-output/brainstorming/brainstorming-session-2026-03-30-001.md']
workflowType: 'architecture'
project_name: 'Nutricao_stratosTech'
user_name: 'Diego'
date: '2026-03-30'
lastStep: 8
status: complete
completedAt: '2026-03-31'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Análise de Contexto do Projeto

### Visão Geral de Requisitos

**Requisitos Funcionais (70 FRs em 12 áreas):**

| Área | FRs | Complexidade Arquitetural |
|---|---|---|
| Auth e Perfil | FR1-FR5 | Baixa — Supabase Auth nativo |
| Clientes/Estabelecimentos/Pacientes | FR6-FR11 | Média — hierarquia 3 níveis, import CSV |
| Checklists Regulatórios | FR12-FR16 | Alta — templates dinâmicos, versionamento, notificação |
| Visitas e Dossiê | FR17-FR25 | Alta — fotos vinculadas, dossiê automático, PDF, email |
| Ficha Técnica | FR26-FR36 | Alta — cascata de custos, TACO, cálculos nutricionais |
| POPs | FR37-FR40 | Média — templates, versionamento, PDF |
| Financeiro | FR41-FR45 | Média — controle de status, contratos, alertas |
| Portal Externo | FR46-FR49 | Média — permissões granulares, LGPD menores |
| Dashboard | FR50-FR54 | Média — agregação multi-fonte, alertas countdown |
| Onboarding | FR55-FR56 | Baixa — wizard, sugestão de portarias |
| Admin SaaS | FR57-FR60 | Média — gestão multi-tenant, métricas |
| Segurança/Privacidade | FR61-FR70 | Alta — RLS, auditoria, imutabilidade, LGPD |

**Requisitos Não-Funcionais que Dirigem Arquitetura:**
- Performance: 8 critérios mensuráveis (telas < 2s, cascata < 10s, PDF < 5s)
- Segurança: 9 critérios (AES-256, JWT 15min, CAPTCHA sem lockout, scan CI/CD)
- Escalabilidade: 5 critérios (50→5.000 profissionais, 1.000 jobs/hora)
- Disponibilidade: 5 critérios (99.5% uptime, zero-downtime deploy, RTO < 4h)
- Acessibilidade: 5 critérios (WCAG AA, responsivo 375px-1920px)
- Integração: 5 critérios (Supabase SLA, email < 60s, TACO pré-carregada)

**Escala e Complexidade:**
- Domínio primário: Full-stack web SaaS (Healthcare/Nutrição)
- Complexidade: Alta
- Componentes arquiteturais estimados: ~15-20
- Plataforma MVP: Web responsiva (sem mobile nativo, sem offline)

### Restrições Técnicas e Dependências

- **Supabase** como plataforma obrigatória (Auth, DB, Storage, Realtime, Edge Functions)
- **Timeline de 2 meses** para MVP — impacta escolhas de complexidade arquitetural
- **LGPD** para dados sensíveis de saúde — criptografia, auditoria, consentimento desde dia 1
- **Portarias sanitárias** — lançamento apenas SP, expansão sem mudança de código
- **Tabela TACO** — dados nutricionais pré-carregados no banco
- **Revisão jurídica LGPD** como dependência externa pré-lançamento

### Concerns Cross-Cutting Identificados

| Concern | Impacto | Módulos Afetados |
|---|---|---|
| Isolamento multi-tenant (RLS) | Toda query no banco | Todos |
| Log de auditoria | Mutações em dados de pacientes, clientes (carteira) e campos sensíveis; `actor_user_id` quando a sessão está disponível no trigger | Visitas, Pacientes, Clientes, Portal Externo, Ficha Técnica |
| Geração de PDF | Múltiplos tipos de documento | Visitas, Ficha Técnica, POPs, Contratos |
| Notificações (email/push) | Eventos em múltiplos domínios | Alertas, Visitas, Financeiro, Admin |
| LGPD compliance | Todo dado pessoal/saúde | Pacientes, Portal Externo, Onboarding |
| Versionamento de documentos | Registros imutáveis + evolução | Checklists preenchidos, POPs |
| Cálculos nutricionais (TACO) | Ficha técnica + receitas | Ficha Técnica, Escalonamento |

**Mapa de segurança neste documento:** decisões núcleo de **Authentication & Security** e **API security** estão em *Core Architectural Decisions* (gravada abaixo, após o starter). O detalhe de **ameaças e abuso** (DDoS/WAF, injeção, push, supply chain, pentest, resposta a incidente) está na secção **Segurança, abuso e ameaças** mais abaixo. As duas leituras são complementares; evitar duplicar tabelas.

### Profissional responsável pela carteira (cliente e paciente)

- Opcionalmente, cada **cliente** e cada **paciente** pode referenciar um `team_members.id` do mesmo workspace (`responsible_team_member_id`), com validação em trigger antes de gravar.
- É **independente** da atribuição operacional em **visitas agendadas** (`scheduled_visits.assigned_team_member_id`): a visita descreve quem executa aquele evento; o campo na carteira descreve quem é o responsável de continuidade do atendimento.
- A **área Equipe** lista, por membro, os clientes e pacientes em que esse membro está definido como responsável.
- **Auditoria:** mutações em `clients` geram linhas em `audit_log` com payload focado; mutações em `patients` continuam a usar o trigger genérico (com mascaramento). A coluna `audit_log.actor_user_id` regista o utilizador da sessão quando `auth.uid()` está disponível no trigger (`SECURITY DEFINER`); `audit_log.user_id` mantém-se como chave de tenant (titular).

## Preferências Técnicas (Confirmadas)

| Decisão | Escolha |
|---|---|
| Linguagem | TypeScript |
| Framework web | Next.js (App Router) |
| Lógica server-side leve | Supabase Edge Functions |
| Estilo | Tailwind CSS (preferência; Play CDN apenas se protótipo sem build — produção: Tailwind via PostCSS no Next) |
| Experiência da equipe | Alta — detalhes técnicos explícitos nas próximas seções |

## Avaliação de Starter Template

### Domínio Tecnológico Primário

Full-stack web SaaS: **Next.js + TypeScript + Tailwind + Supabase** (Auth, Postgres, RLS, Storage, Realtime, Edge Functions).

### Edge Functions: escalável para SaaS?

**Sim, para a maior parte do tráfego típico de SaaS B2B** — autenticação via JWT já validada no Postgres/RLS, webhooks, orquestração, transformações leves, chamadas a APIs externas (email, filas). O modelo é **stateless + isolates**: novas requisições recebem workers novos; escala horizontal é o padrão da plataforma.

**Limites oficiais relevantes** (documentação Supabase, consulta 2026):

| Limite | Valor | Implicação |
|---|---|---|
| Memória por worker | 256 MB | Evitar buffers enormes em memória |
| CPU time por requisição | **2 s** (tempo efetivo de CPU; I/O assíncrono não conta igual) | Loops pesados, renderização PDF complexa ou imagens grandes podem estourar |
| Duração (wall clock) | 150 s (free) / **400 s** (paid) | Tempo total do isolate; útil para fluxos com muita espera de I/O |
| Tamanho do bundle | 20 MB após bundle | Dependências nativas pesadas são problema |
| Chamadas aninhadas | ~5.000 req/min | Raramente gargalo em MVP |

**Onde Edge Functions não bastam sozinhas:**

- **PDF pesado** (relatórios com muitas imagens, fontes custom, layout complexo): CPU 2s e ausência de libs nativas (ex.: `sharp`) favorecem **worker dedicado** (Node em K8s, Cloud Run, ou microserviço na fila).
- **Filas de alto volume** com ack/retry sofisticado: Edge pode **publicar na fila**; o **consumer** pode ser serviço Node + RabbitMQ/Redis (como no PRD).

**Padrão recomendado para este produto:** Edge Functions para **entrada rápida, auth, webhooks, enfileiramento**; **workers** (fila) para **PDF, emails em massa, jobs longos**. Isso mantém SaaS escalável e alinhado ao PRD (fila + microserviços).

### Starter Considerado

- **Next.js oficial** via `create-next-app@latest` — mantido pela Vercel, App Router, TypeScript e Tailwind como padrão atual.
- Integração Supabase: pacote **`@supabase/ssr`** para cookies/sessão no App Router (evita vazar service role no client).

### Starter Selecionado: `create-next-app` (Next.js + TS + Tailwind)

**Racional:** Alinha com React + Next.js escolhidos; TypeScript e Tailwind pedidos; base sólida para PWA/offline futuro (Etapa 2); SEO e rotas server-side úteis para marketing e áreas logadas.

**Comando de inicialização (recomendado, não interativo):**

```bash
npx create-next-app@latest nutricao-web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

(Ajuste `nutricao-web` para o nome do repositório/pasta.)

**Decisões já embutidas pelo starter:**

| Área | Escolha |
|---|---|
| Linguagem & runtime | TypeScript, Node para build |
| Estilo | Tailwind CSS + PostCSS |
| Build | Turbopack (dev) / build otimizado Next |
| Estrutura | App Router, `src/app` |
| Qualidade | ESLint configurado |

**Próximo passo após clone:** `npm install @supabase/supabase-js @supabase/ssr` e configurar variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Nota:** A primeira story de implementação deve ser **bootstrap do repositório** com este comando + integração mínima Supabase (client + middleware de sessão).

**Tailwind vs Play CDN:** Em produção use **Tailwind via Next** (tree-shaking, purge, consistência). Play CDN é aceitável só para experimentos sem pipeline de build.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- PostgreSQL como única fonte de verdade relacional (Supabase); isolamento por **RLS** em todas as tabelas com dados de tenant.
- **Supabase Auth** como único IdP no MVP; microserviços/workers validam **JWT** Supabase.
- Padrão de acesso a dados: **PostgREST via cliente** + **RPC/SQL** versionados em migrations; **sem** expor `service_role` ao browser.
- **Jobs assíncronos** (PDF, email em massa): fila + worker Node **fora** da Edge Function quando CPU/tempo exceder limites Edge.

**Important Decisions (Shape Architecture):**
- API principal **REST implícita** (PostgREST + Edge Functions HTTP); GraphQL **fora** do MVP salvo necessidade futura.
- Frontend: **React Server Components por defeito**; Client Components só onde há estado/eventos; rotas em `src/app`.
- Validação: **Zod** (ou equivalente) partilhado entre server actions / rotas API e formulários.
- Fila: **RabbitMQ ou Redis (BullMQ)** — escolha final na story de infra de fila; PRD aceita equivalente.

**Deferred Decisions (Post-MVP):**
- **API pública versionada** para integrações terceiras (PRD menciona; não bloqueia MVP web).
- **API Gateway** dedicado se tráfego e políticas excederem Vercel middleware + limites Supabase.
- Cache distribuído (Redis) para leituras quentes — só após métricas; começar com caching HTTP/`fetch` e queries otimizadas.

### Data Architecture

| Decisão | Escolha | Nota |
|--------|---------|------|
| BD | PostgreSQL gerido (Supabase) | Versão da plataforma |
| Modelagem | Relacional, tenant + RLS com `auth.uid()` / claims | — |
| Migrations | Supabase CLI (`supabase/migrations`), SQL idempotente | Review em PR |
| Validação | Zod + constraints DB | Menos bugs cross-layer |
| Dados TACO | Tabelas de referência + seed/migration | Sem API externa no runtime |
| Caching | `fetch` / revalidate; Realtime Supabase onde fizer sentido | Redis adiar |

### Authentication & Security

*Ver também: **Segurança, abuso e ameaças (alinhamento explícito)** neste documento — vetores DDoS, injeção, push, supply chain, pentest e resposta a incidente.*

| Decisão | Escolha | Nota |
|--------|---------|------|
| Auth | Supabase Auth (email/senha, Magic Link, OAuth, 2FA conforme PRD) | Provedor único MVP |
| Sessão web | Cookies via `@supabase/ssr` + middleware refresh | App Router |
| Tokens | Access ~15 min + refresh ~7 dias (alinhar dashboard Supabase ao PRD) | NFR PRD |
| Autorização | RLS; papéis (nutri, admin SaaS, portal externo) em claims ou tabelas | Defesa em profundidade |
| Criptografia | TLS; repouso na plataforma; segredos em env / Supabase Secrets | NFR PRD |
| API security | Rate limit (PRD: leitura/escrita/upload); CSP e headers no Next | Ver secção ameaças |
| Auditoria | Tabelas de audit log / camada app em mutações sensíveis | LGPD |

### API & Communication Patterns

| Decisão | Escolha | Racional |
|--------|---------|----------|
| Estilo | REST (PostgREST) + Edge Functions para webhooks/orquestração | Alinhado Supabase |
| Erros | `{ code, message, details? }` + request id em logs | DX e suporte |
| Serviço a serviço | Workers na fila; **service role** só em ambiente seguro, nunca no client | PRD |
| Email/WhatsApp | Adaptador; fila para envio assíncrono | NFR latência |

### Frontend Architecture

| Decisão | Escolha | Racional |
|--------|---------|----------|
| State | Servidor primeiro; **TanStack Query** opcional para listagens/dashboard pesados | Escalável |
| Componentes | UI por feature; Tailwind + primitives (ex. shadcn se adotado) | FR-heavy |
| Routing | App Router; layouts por área (admin, app, portal) | PRD |
| Performance | `next/image`; lazy; streaming onde útil | NFR < 2s |

### Infrastructure & Deployment

| Decisão | Escolha | Racional |
|--------|---------|----------|
| Hosting app | Vercel (ou host compatível com Next) | Padrão Next |
| Backend dados | Supabase Cloud (dev/staging/prod) | PRD |
| CI/CD | Lint, testes, migrações em staging antes de prod | Deploy NFR |
| Observabilidade | Logs Vercel + Supabase; alertas auth e picos | PRD |
| Scaling | Front horizontal automático; Postgres no plano Supabase; workers da fila à parte | SaaS |

### Decision Impact Analysis

**Implementation Sequence:** (1) Next + Supabase client/middleware + env. (2) Esquema + RLS. (3) Auth e rotas protegidas. (4) Features CRUD. (5) Fila + worker PDF/email. (6) Hardening e testes RLS.

**Cross-Component Dependencies:** RLS/Storage alinhados aos papéis da UI; Edge com DB = JWT ou service role mínimo; jobs longos sempre via fila.

## Segurança, abuso e ameaças (alinhamento explícito)

**Referência cruzada:** Complementa **Authentication & Security** e **API security** em *Core Architectural Decisions* acima (JWT, RLS, CSP, rate limits). **Aqui:** vetores e controlos de **ameaça** (DDoS, injeção, push, supply chain, pentest). O PRD cobre NFRs (AES-256, scan CI/CD, pen-test).

### Borda e disponibilidade (DDoS / volumetria)

- **Rate limiting por utilizador** (PRD: leitura/escrita/upload) mitiga abuso de conta; **não** substitui defesa contra **ataque volumétrico** na borda.
- **CDN / WAF** na frente do domínio público (ex.: Cloudflare ou equivalente): regras base, challenge sob picos, bloqueio de padrões óbvios; alinhar com o host da app (ex. Vercel) e quotas **Supabase**.
- **Circuitos e filas**: operações pesadas (PDF, email) já desenhadas como assíncronas evitam que picos de tráfego derrubem o Postgres; monitorizar fila e latência p95.
- **Plano de degradação**: priorizar leituras críticas vs. escritas em incidente; comunicação de status (status page interno/externo conforme maturidade).

### Aplicação — injeção e execução indesejada

- **SQL injection**: PostgREST + cliente Supabase parametrizado; proibir SQL dinâmico concatenado em migrations ad-hoc fora de revisão.
- **XSS**: `Content-Security-Policy` restritiva no Next (headers); evitar `dangerouslySetInnerHTML`; sanitizar qualquer rich text ou HTML vindo de utilizadores/templates.
- **Template / PDF / email**: motores de template (PDF, e-mail HTML) são vetores de **template injection** — dados escapados, sem `eval` de conteúdo utilizador; gerar PDF em **worker** com bibliotecas auditadas.
- **SSRF**: se workers ou Edge chamam URLs **fornecidas pelo cliente**, usar allowlist de domínios, bloquear IPs internos/metadata, timeouts curtos.
- **Deserialização**: evitar padrões inseguros em workers Node; validar payloads de fila com schema (ex. Zod) antes de processar.

### Notificações push (Web Push / FCM — Etapa 2 / FR66)

- **Autenticação** no registo de subscription: só utilizadores válidos associam endpoint ao seu contexto (tenant).
- **Payload mínimo**: preferir IDs e tipo de evento; detalhes carregados após fetch autenticado — reduz **push payload injection** e vazamento em transitório.
- **Chaves VAPID / FCM**: rotação documentada; secrets apenas em backend; nunca no bundle cliente além do que a API pública exige.
- **Renderização no cliente**: tratar texto de notificação como dado não confiável até validado contra estado do servidor.

### Supply chain, CI e segredos

- **Dependências**: lockfile fixo; Renovate/Dependabot ou revisão periódica; alinhar ao NFR de scan em CI/CD do PRD.
- **Secrets**: apenas env / Supabase Secrets / vault do CI; nunca em repositório; rotação em incidente.
- **SAST/DAST** (evolução pós-MVP ou antes do go-live comercial): incorporar no pipeline quando o repositório estabilizar.

### Verificação independente e resposta

- **Pentest** (ou avaliação de segurança externa) **pré-lançamento** comercial — já referido no PRD como risco/mitigação; escopo mínimo: auth multi-tenant, RLS, upload Storage, portal externo, exportação de dados.
- **Bug bounty** opcional após estabilização do produto.
- **Resposta a incidente (LGPD + saúde)**: contacto DPO, registo de incidente, comunicação a titulares/autoridade quando aplicável; runbook interno (quem suspende chaves, quem revoga sessões).

### Cross-cutting

- As mesmas políticas de **papel (role)** devem refletir-se em **RLS**, **Storage policies** e **UI** (sem confiar só no front).
- **Edge Functions** com `service_role`: escopo mínimo, auditoria de invocação, nunca expor ao browser.

## Implementation Patterns & Consistency Rules

Objetivo: reduzir divergência entre agentes/developers no mesmo repositório (Next + Supabase).

### Pattern Categories Defined

**Pontos críticos de conflito:** convenções DB vs TS, formato JSON PostgREST, organização de pastas, tratamento de erros, datas e testes.

### Naming Patterns

**Base de dados (Postgres):**
- Tabelas e colunas: **`snake_case`**, plural para entidades (`patients`, `visit_photos`).
- Chaves estrangeiras: `{tabela_singular}_id` (ex. `patient_id`).
- Índices: `idx_{tabela}_{colunas}` (ex. `idx_visits_tenant_id_started_at`).

**API (PostgREST / Edge):**
- Recursos refletem tabelas; IDs em path: `/rest/v1/...` via cliente — não inventar URLs REST paralelas sem necessidade.
- Query params: nomes alinhados às colunas DB (`snake_case`) no cliente Supabase.

**Código (TypeScript / React):**
- Componentes React: **PascalCase** (`VisitCard.tsx`).
- Ficheiros de página/route Next: convenção do framework (`page.tsx`, `layout.tsx`).
- Funções e variáveis: **camelCase** (`loadVisits`, `tenantId`).
- Constantes: **SCREAMING_SNAKE** só para verdadeiros env literals (`MAX_UPLOAD_MB`).
- Ao mapear row → DTO no app, preferir tipo explícito; se usar camelCase no UI, converter **numa camada** (`lib/mappers/`), não misturar estilos no mesmo objeto sem regra.

### Structure Patterns

**Organização sugerida:**
- `src/app/(marketing|dashboard|portal|admin)/...` — rotas por área de produto.
- `src/components/ui/` — primitives partilhados; `src/components/{feature}/` — específicos.
- `src/lib/supabase/` — clients server/browser/middleware.
- `src/lib/validators/` — schemas Zod partilhados.
- `supabase/migrations/` — única fonte de verdade do schema; sem alterações manuais só em prod.

**Testes:** co-localizados `*.test.ts` ou `*.test.tsx` junto ao módulo, ou `__tests__/` na mesma feature — **um padrão por pasta**, não misturar no mesmo módulo.

### Format Patterns

**Respostas e erros (app Next / actions):**
- Sucesso: devolver dados tipados; evitar `{ data: T }` unless necessário para metadados paginação (`{ data, count }`).
- Erro para UI: `{ code: string, message: string, details?: unknown }`; log servidor com stack/correlation id, nunca expor stack ao cliente.

**Datas e JSON:**
- Armazenar em Postgres como **`timestamptz`**; serializar para cliente em **ISO 8601 UTC** (`toISOString()`).
- UI local: formatar com `Intl` ou lib acordada (definir timezone do tenant se surgir requisito).

**Null:** usar `null` em JSON/API; evitar `undefined` em payloads persistidos.

### Communication Patterns

**Eventos de domínio (fila / internos):** nome em **`past tense` ou `entity.verb`** em snake_case (`visit.completed`, `pdf_generation_requested`). Payload: JSON com `schema_version` + campos mínimos (ids); validar com Zod no consumer.

**Realtime Supabase:** nomes de canais explícitos `tenant:{id}:...`; não subscrever globais sem filtro.

### Process Patterns

**Loading:** nomes `isPending` / `isLoading` alinhados a TanStack Query se usado; skeletons por área, não spinners genéricos em todo o lado.

**Erros:** Error Boundaries em rotas de alto risco; mutações: toast ou inline field errors consistentes.

**Retry:** apenas para idempotentes ou com idempotency key; fila com backoff — não retry cego em 4xx de validação.

### Enforcement Guidelines

**Todos os agentes DEVEM:**
- Respeitar **RLS** — nunca contornar com service role no código que corre no browser.
- Passar alterações de schema **apenas** por migrations versionadas.
- Usar **Zod** (ou schema acordado) na fronteira servidor para input externo.
- Seguir **snake_case** no DB e **camelCase** no TS com conversão explícita quando necessário.

**Verificação:** CI com lint, typecheck, testes; PRs que toquem em RLS exigem teste ou checklist de políticas.

### Pattern Examples

**Bom:** `const { data } = await supabase.from('visit_photos').select('*').eq('tenant_id', tenantId)` com política RLS ativa.

**Evitar:** tabela `VisitPhotos` ou coluna `userId` na BD; service role no `useEffect`; SQL raw concatenado com input de utilizador.

## Project Structure & Boundaries

Estrutura alinhada a **Next.js (App Router) + Supabase** no repositório do produto. Segmentos de rota em **inglês** no código (`/visits`); copy/UI pode ser PT-BR. Ajustar nomes se o repositório for só `web/` na raiz (sem `apps/`).

### Complete Project Directory Structure

```
Nutricao_stratosTech/                    # ou nome final do mono/repo
├── README.md
├── package.json                         # opcional: workspaces root
├── pnpm-workspace.yaml                  # se monorepo (pnpm); ou npm workspaces
├── .env.example                         # variáveis documentadas (sem segredos)
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci-web.yml                   # lint, typecheck, test, build apps/web
│       └── ci-supabase.yml              # opcional: validate migrations
├── apps/
│   └── web/                             # aplicação Next principal
│       ├── package.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── postcss.config.mjs
│       ├── public/
│       │   └── assets/                  # estáticos públicos
│       ├── src/
│       │   ├── app/
│       │   │   ├── globals.css
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx             # landing / redirect
│       │   │   ├── (auth)/
│       │   │   │   ├── login/
│       │   │   │   ├── signup/
│       │   │   │   └── reset-password/
│       │   │   ├── (dashboard)/         # área autenticada nutricionista
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── dashboard/       # FR50–FR54
│       │   │   │   ├── clients/       # FR6–FR8 (clientes)
│       │   │   │   ├── establishments/# FR9–FR11
│       │   │   │   ├── patients/      # FR10–FR11
│       │   │   │   ├── checklists/    # FR12–FR16
│       │   │   │   ├── visits/        # FR17–FR25
│       │   │   │   ├── technical-sheets/ # FR26–FR36 (ficha técnica)
│       │   │   │   ├── pops/          # FR37–FR40
│       │   │   │   ├── finance/       # FR41–FR45
│       │   │   │   └── onboarding/    # FR55–FR56
│       │   │   ├── (portal)/          # FR46–FR49 (paciente/responsável)
│       │   │   │   └── layout.tsx
│       │   │   ├── (admin)/           # FR57–FR60 (admin SaaS)
│       │   │   │   └── layout.tsx
│       │   │   └── api/               # Route Handlers leves (webhooks, health)
│       │   ├── components/
│       │   │   ├── ui/                # primitives (button, input…)
│       │   │   ├── auth/
│       │   │   ├── checklists/
│       │   │   ├── visits/
│       │   │   ├── technical-sheets/
│       │   │   ├── portal/
│       │   │   └── admin/
│       │   ├── lib/
│       │   │   ├── supabase/
│       │   │   │   ├── client.ts      # browser
│       │   │   │   ├── server.ts      # server component / RSC
│       │   │   │   └── middleware.ts  # padrão refresh sessão
│       │   │   ├── validators/        # Zod schemas
│       │   │   ├── mappers/           # row DB ↔ UI types
│       │   │   └── errors.ts
│       │   └── middleware.ts          # Next middleware (auth)
│       └── e2e/                       # Playwright (opcional pasta aqui)
├── supabase/
│   ├── config.toml
│   ├── migrations/                    # SQL versionado
│   ├── seed.sql                       # opcional
│   └── functions/                     # Edge Functions (Deno)
│       └── _shared/                   # helpers partilhados entre functions
├── workers/                           # consumidores fila (PDF, email)
│   ├── package.json
│   ├── src/
│   │   ├── index.ts                   # entry consumer
│   │   ├── jobs/
│   │   │   ├── pdf.ts
│   │   └── lib/
│   │       └── supabase-service.ts    # service role só aqui
│   └── Dockerfile                     # opcional deploy worker
├── _bmad-output/                      # artefactos BMAD (já existente)
└── docs/                              # opcional ADR, runbooks
```

### Architectural Boundaries

**API boundaries**
- **Browser → Next:** apenas `anon` key + cookies de sessão Supabase; sem secrets.
- **Next Server (RSC / Server Actions / Route Handlers):** `createServerClient`, operações que precisam de contexto de utilizador.
- **PostgREST (Supabase):** todas as leituras/escritas tenant-scoped via RLS; sem bypass no client.
- **Edge Functions:** webhooks externos, orquestração, enqueue; JWT validado ou secret de webhook.
- **workers/:** service role, fila, PDF/email; **nunca** exposto à internet sem controlo de rede/secret.

**Component boundaries**
- `components/ui`: sem lógica de domínio; props estáveis.
- `components/{feature}`: pode chamar hooks e Supabase browser client onde apropriado; mutações sensíveis preferir Server Actions.
- Layouts `(dashboard)` vs `(portal)` vs `(admin)` isolam shells e guards de navegação.

**Data boundaries**
- Schema e políticas: **só** `supabase/migrations/`.
- Storage: buckets com policies alinhadas a `tenant_id` / papel.
- Realtime: canais por tenant; subscrições criadas/destruídas com o lifecycle da página.

### Requirements to Structure Mapping

| Área FR (PRD) | Rotas / pastas principais |
|---------------|---------------------------|
| FR1–FR5 Auth e perfil | `(auth)/`, `lib/supabase/`, `middleware.ts`, `components/auth/` |
| FR6–FR11 Clientes, estabelecimentos, pacientes | `(dashboard)/clients`, `establishments`, `patients` |
| FR12–FR16 Checklists | `(dashboard)/checklists`, `components/checklists/` |
| FR17–FR25 Visitas e dossiê | `(dashboard)/visits`, Storage uploads, `workers` (PDF), Edge (enqueue) |
| FR26–FR36 Ficha técnica | `(dashboard)/technical-sheets`, TACO via DB |
| FR37–FR40 POPs | `(dashboard)/pops`, `workers` (PDF) |
| FR41–FR45 Financeiro | `(dashboard)/finance` |
| FR46–FR49 Portal externo | `(portal)/` |
| FR50–FR54 Dashboard | `(dashboard)/dashboard` |
| FR55–FR56 Onboarding | `(dashboard)/onboarding` |
| FR57–FR60 Admin SaaS | `(admin)/` |
| FR61–FR70 Segurança/LGPD | RLS migrations, audit tables, `lib/validators`, secção arquitetura ameaças |

### Integration Points

**Interno:** Next Server Actions ↔ Supabase client server; Edge ↔ DB (service ou user JWT); Edge/worker ↔ fila (Redis/Rabbit); worker ↔ Storage (upload PDF gerado).

**Externo:** SMTP/WhatsApp providers; futuro WhatsApp Business API; CAPTCHA se aplicável.

**Fluxo de dados (exemplo visita → PDF):** UI grava em Postgres/Storage → evento `pdf_generation_requested` na fila → worker gera PDF → grava Storage + atualiza row `visits` → opcional Realtime para UI.

### File Organization Patterns

- **Config:** raiz `apps/web` para Next/Tailwind; `supabase/config.toml` para projeto Supabase CLI.
- **Testes:** unitários junto a `lib/` e `components/`; e2e em `apps/web/e2e` ou `e2e/` na raiz.
- **Assets:** `public/` para estáticos; ficheiros sensíveis apenas Storage com URL assinada.

### Development Workflow Integration

- **Dev:** `pnpm dev` (ou npm) em `apps/web`; `supabase start` local para Postgres/Auth/Storage.
- **Build:** output Next em CI; migrations aplicadas em staging antes de produção.
- **Deploy:** app → Vercel (ou equivalente); Supabase projeto cloud; workers → container/VM com acesso à fila e secrets.

## Architecture Validation Results

### Coherence Validation

**Decision compatibility:** Next.js App Router + `@supabase/ssr` + Postgres/RLS + Edge Functions + workers com fila é coerente. Não há conflito entre “dados no Supabase” e “PDF na worker”: limites de CPU na Edge estão explicitamente contornados com fila + Node. Tailwind e padrões TS/BDD alinham com o starter.

**Pattern consistency:** `snake_case` na BD e camelCase no TS com conversão documentada suporta o JSON do PostgREST. Erros e datas têm formato definido; eventos de fila com schema_version suportam evolução.

**Structure alignment:** Árvore `apps/web` + `supabase/` + `workers/` suporta os limites definidos (service role só em worker/Edge controlados). Route groups `(dashboard)` / `(portal)` / `(admin)` correspondem aos agrupamentos de FRs.

### Requirements Coverage Validation

**Functional requirements:** As 12 áreas de FRs (70 FRs) estão mapeadas na tabela *Requirements to Structure Mapping*. FR61–FR70 têm suporte em RLS, validators, secção de ameaças e auditoria descrita nas decisões núcleo. FR66 (push) está referenciado na secção de segurança push (Etapa 2).

**Non-functional requirements:** Performance (telas, cascata, PDF) endereçada por RSC, workers, fila e metas explícitas no PRD. Segurança (JWT, CAPTCHA, rate limit, CSP, pentest) nas decisões + bloco de ameaças. Escalabilidade: horizontal front, plano Supabase, workers. Disponibilidade e CI alinhados a pipelines descritos. LGPD: RLS, auditoria, runbook de incidente.

### Implementation Readiness Validation

**Decision completeness:** Decisões críticas documentadas; versões de runtime seguem `create-next-app@latest` e pacotes Supabase via `@latest` no bootstrap (fixar no lockfile na primeira story). Tecnologia de fila (Redis/BullMQ vs RabbitMQ) permanece **decisão de story** — aceitável, não bloqueia schema inicial.

**Structure completeness:** Árvore e integrações estão específicas o suficiente para agentes começarem; pastas podem ser achatadas se o repo for single-app na raiz.

**Pattern completeness:** Naming, formatos, processos e anti-patterns cobrem os conflitos mais comuns entre agentes.

### Gap Analysis Results

| Prioridade | Lacuna | Mitigação |
|------------|--------|-----------|
| Importante | Escolha concreta **Redis+BullMQ vs RabbitMQ** | Story “infra fila” no primeiro sprint de assíncronos |
| Importante | Biblioteca/stack exato de **PDF** no worker | Spike curto antes de FRs de dossiê/POP em volume |
| Importante | **Rate limiting** onde aplicar (Edge vs Next vs provedor) | Definir na story de hardening; PRD já fixa números-alvo |
| Nice-to-have | **Slugs de URL em PT** vs inglês no código | Decisão de produto/SEO; i18n routing se necessário |
| Nice-to-have | Pasta `docs/adr/` para decisões locais | Após primeira divergência real em implementação |

### Validation Issues Addressed

Nenhum bloqueador crítico identificado. Riscos residuais são de **execução** (políticas RLS complexas, testes de isolamento tenant), não de incoerência do documento.

### Architecture Completeness Checklist

- [x] Contexto e restrições analisados
- [x] Decisões núcleo e stack documentadas
- [x] Segurança operacional e ameaças explícitas
- [x] Padrões de implementação para agentes
- [x] Estrutura de repositório e limites
- [x] Cobertura FR/NFR validada
- [x] Lacunas conhecidas listadas

### Architecture Readiness Assessment

**Overall status:** **READY FOR IMPLEMENTATION** (com lacunas operacionais a fechar em stories).

**Confidence level:** **Alta** para direção técnica; **média-alta** até existir primeiro deploy com RLS + worker validados em staging.

**Key strengths:** Supabase como spine único; separação clara browser/server/worker; mapeamento FR → pastas; alinhamento PRD (PDF assíncrono, multi-tenant).

**Areas for future enhancement:** API pública versionada, gateway dedicado, cache Redis distribuído, SAST/DAST completos (já mencionados como adiados/evolutivos).

### Implementation Handoff

**Para agentes / equipe:** seguir este documento para decisões arquiteturais; respeitar limites (`service_role`); migrations só em `supabase/migrations/`.

**Primeira prioridade de implementação:** `npx create-next-app@latest` (conforme starter) + `npm/pnpm install @supabase/supabase-js @supabase/ssr` + middleware de sessão + projeto Supabase ligado + primeira migration com `tenant` base e RLS stub.

---

## Workflow Architecture — Concluído

Documento de arquitetura **completo e validado** (`status: complete`). Próxima fase típica no BMad: **UX design** (`bmad-create-ux-design`) se ainda não existir especificação de UI detalhada, ou **epics/stories** + **dev** (`bmad-create-epics-and-stories`, `bmad-dev-story` / `bmad-quick-dev`) para implementação. Para orientação interativa: skill **`bmad-help`** com a pergunta “o que fazer a seguir?”.
