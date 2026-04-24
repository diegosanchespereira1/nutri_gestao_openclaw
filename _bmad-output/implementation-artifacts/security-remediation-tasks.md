# Tarefas de execução — segurança (NutriGestão)

**Objetivo:** visibilidade única de tudo o que falta (e do que já foi feito) em segurança — alinhado à skill `nutrigestao-security` e auditorias OWASP/LGPD.

**Última revisão do documento:** consolidar com código atual (`proxy.ts`, `lib/auth-paths.ts`, `next.config.ts`, migrações).

---

## Painel de visibilidade (estado)

| ID | Título | Prioridade | Estado | Notas |
|----|--------|------------|--------|--------|
| SEC-01 | Open redirect (`next` no login) | Bloqueante | **Feito** | `lib/auth/safe-next-path.ts` + login + callback |
| SEC-02 | RLS `scheduled_visits` UPDATE | Bloqueante | **Feito** | Migração `20260411120000_scheduled_visits_update_rls_target.sql` — aplicar em remoto |
| SEC-03 | Headers + CSP base | Bloqueante | **Feito** | `next.config.ts` |
| SEC-04 | Rate limiting | Alta | **Backlog** | Login, recuperação, import, APIs |
| SEC-05 | Middleware: prefixos `(app)` | Alta | **Parcial** | Inclui vários; faltam novos módulos — ver **SEC-12** |
| SEC-06 | Palavra-passe ≥12 + registo neutro | Média | **Feito** | UI + nota `.env.example`; confirmar Dashboard Supabase |
| SEC-07 | `getUser` + Zod (import) | Média | **Parcial** | Import validado; alargar Zod a outras actions (backlog) |
| SEC-08 | MFA QR sem `dangerouslySetInnerHTML` | Média | **Feito** | `mfa-totp-qr.tsx` |
| SEC-09 | Logging / auditoria estruturada | Média | **Backlog** | `audit_log` existe; integrar mutações sensíveis + sem PII em logs |
| SEC-10 | CI + Dependabot + Node runtime | Média | **Feito** | `.github/workflows/ci.yml`, Dependabot, Node 24 / `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` |
| SEC-11 | LGPD operacional (produto/legal) | Contínua | **Backlog** | DPO, incidentes, DSAR, retenção |
| SEC-12 | Prefixos middleware em falta | Alta | **Backlog** | Ver secção dedicada |
| SEC-13 | HTML contratos — anti-XSS | Alta | **Backlog** | `contract-generator-dialog` + `generateContractHtml` |
| SEC-14 | `npm audit` — dependências transitivas | Média | **Backlog** | `hono` / `@hono/node-server` (moderate); `npm audit fix` + testes |
| SEC-15 | Rotas `(portal)` — modelo de acesso | Média | **Backlog** | Confirmar público vs autenticado vs convidado |
| SEC-16 | CSP com nonces (fase 2) | Baixa | **Backlog** | Reduzir `unsafe-inline` / `unsafe-eval` |
| SEC-17 | Documentação entrypoint auth | Baixa | **Backlog** | Next 16: `proxy.ts` em vez de `middleware.ts` na raiz |
| SEC-18 | PDFs sem expor URL do Supabase | Média | **Feito** | Proxy `GET /api/checklists/dossier-pdf/[jobId]` + redação de URLs em texto dos PDFs (`lib/pdf/redact-storage-urls.ts`) |

**Legenda de prioridade:** Bloqueante → Alta → Média → Baixa → Contínua.

### SEC-18 — Detalhe (hardening de superfície)

- **Problema:** URLs assinadas do Storage (`*.supabase.co`) na barra de endereço e em atributos `href` revelam o host do projeto (reconhecimento) e tokens temporários em histórico/partilhas de ecrã.
- **Solução implementada:** o browser passa a usar apenas caminhos na origem da app (`/api/checklists/dossier-pdf/...`); o servidor faz `storage.download` com a sessão do utilizador. Texto livre (notas, anotações, corpo POP) é filtrado para substituir padrões `*.supabase.co` por marcador neutro antes de desenhar no PDF.
- **Manutenção:** novos fluxos que devolvam `createSignedUrl` ao cliente para ficheiros sensíveis devem seguir o mesmo padrão (rota proxy + auth).

---

## SEC-12 — Completar `PROTECTED_PREFIXES` (middleware)

| Campo | Valor |
|--------|--------|
| Prioridade | **Alta** |
| OWASP | A01 |

**Contexto:** O ficheiro de sessão é `proxy.ts` (Next.js 16); a lógica está em `lib/supabase/middleware.ts`. `lib/auth-paths.ts` define `PROTECTED_PREFIXES`.

**Prefixos a acrescentar (auditoria 2026):**

- `/notificacoes`
- `/auditoria` (cobre `/auditoria/dsar`)
- `/financeiro`
- `/configuracoes` (cobre `deletar-conta`, `notificacoes` sob configuracoes, etc.)

**Critérios de aceitação:**

- [ ] Utilizador anónimo acede a qualquer URL acima → redirect `/login?next=...`
- [ ] Revisão rápida de `app/(app)/` e novas rotas sempre que se mergeie feature nova
- [ ] **Opcional:** comentário no topo de `auth-paths.ts`: “lista deve cobrir todos os segmentos de `app/(app)` exceto se deliberadamente públicos”

**Não incluir sem decisão de produto:** `(portal)/portal` — tratar em **SEC-15**.

---

## SEC-13 — Sanitizar HTML de contratos (pré-visualização)

| Campo | Valor |
|--------|--------|
| Prioridade | **Alta** |
| OWASP | A08 / XSS |

**Contexto:** `components/financeiro/contract-generator-dialog.tsx` usa `dangerouslySetInnerHTML` com HTML devolvido por `generateContractHtml`.

**Descrição:** Sanitizar no **servidor** antes de enviar ao cliente (ex.: **DOMPurify** com lista de tags permitidas, ou gerar apenas texto/markdown seguro). Garantir escape de variáveis injectadas nos templates.

**Critérios de aceitação:**

- [ ] HTML mostrado na pré-visualização não executa scripts nem `javascript:` URLs
- [ ] Fluxo “Imprimir / PDF” continua funcional
- [ ] Teste manual com payload `<script>` no nome do cliente (se aplicável) não dispara XSS

---

## SEC-14 — Supply chain: `npm audit` e transitivas

| Campo | Valor |
|--------|--------|
| Prioridade | **Média** |
| OWASP | A03 / A06 |

**Descrição:** Correr `npm audit` / `npm audit fix`; validar que `hono` e `@hono/node-server` sobem para versões sem advisory ou documentar excepção (origem: dependência transitiva — ex. tooling).

**Critérios de aceitação:**

- [ ] `npm audit --omit=dev` sem vulnerabilidades **high/critical** (política da equipa)
- [ ] CI alinhado com essa política (ajustar `--audit-level` só se justificado e documentado)

---

## SEC-15 — Portal externo `(portal)`

| Campo | Valor |
|--------|--------|
| Prioridade | **Média** |
| OWASP | A01 |

**Descrição:** Documentar e implementar: quem pode aceder a `/portal`, com que credenciais (Supabase Auth vs token externo), e se deve constar de `PROTECTED_PREFIXES` ou regras separadas.

**Critérios de aceitação:**

- [ ] Decisão registada (README interno ou ADR curto)
- [ ] Comportamento do middleware alinhado à decisão

---

## SEC-16 — CSP endurecida (nonces)

| Campo | Valor |
|--------|--------|
| Prioridade | **Baixa** |
| OWASP | A02 / A08 |

**Descrição:** Reduzir `unsafe-inline` / `unsafe-eval` na CSP com nonces do Next.js App Router (iterativo; pode partir por rota).

---

## SEC-17 — Documentação `proxy.ts` vs middleware

| Campo | Valor |
|--------|--------|
| Prioridade | **Baixa** |

**Descrição:** Nota no README ou `CONTRIBUTING`: em Next 16 o ficheiro na raiz pode ser `proxy.ts`; novos contribuidores procuram `middleware.ts`.

---

# Tarefas históricas (detalhe — já na primeira vaga)

As secções **TASK-SEC-01 … SEC-11** abaixo mantêm critérios de aceitação; onde o **Painel** marca “Feito”, os checklists podem ser validados como concluídos.

---

## TASK-SEC-01 — Open redirect no login (`next`)

| Campo | Valor |
|--------|--------|
| Prioridade | Bloqueante |
| OWASP | A01 / phishing |

**Descrição:** Validar o parâmetro `next` no fluxo de login (e 2FA): apenas path relativo seguro, fallback `/inicio`.

**Critérios de aceitação:**

- [x] `/login?next=https://evil.com` não redireciona para fora do site após login
- [x] `/login?next=//evil.com` rejeitado
- [x] `/login?next=/visitas` funciona
- [x] MFA usa o mesmo destino seguro

---

## TASK-SEC-02 — RLS `scheduled_visits`: UPDATE alinhado ao INSERT

| Campo | Valor |
|--------|--------|
| Prioridade | Bloqueante |
| OWASP | A01 |

**Critérios de aceitação:**

- [ ] Migração aplicada em **todos** os ambientes (dev/staging/prod)
- [ ] UPDATE não permite apontar alvo para outro tenant

---

## TASK-SEC-03 — Headers de segurança (Next.js)

**Critérios de aceitação:**

- [x] Headers configurados em `next.config.ts`
- [x] HSTS só em produção

---

## TASK-SEC-04 — Rate limiting (borda + rotas sensíveis)

(Ver painel — Backlog.)

**Critérios de aceitação:**

- [ ] Limites login / recuperação / import / upload conforme PRD
- [ ] `429` sem fugas de informação
- [ ] `.env.example` atualizado

---

## TASK-SEC-05 — Middleware: rotas `(app)` protegidas

**Estado:** Parcial — completar com **SEC-12**.

---

## TASK-SEC-06 — Política de palavras-passe e enumeração no registo

**Critérios de aceitação:**

- [x] Mínimo 12 caracteres no cliente
- [ ] Dashboard Supabase com política alinhada (verificação manual)

---

## TASK-SEC-07 — Defesa em profundidade nas Server Actions

**Critérios de aceitação:**

- [x] `loadPatientById` com sessão explícita (implementação anterior)
- [x] Import com Zod
- [ ] Alargar Zod a outras actions de risco (backlog incremental)

---

## TASK-SEC-08 — MFA: QR sem HTML inseguro

**Critérios de aceitação:**

- [x] Componente dedicado sem `dangerouslySetInnerHTML` para o QR

---

## TASK-SEC-09 — Logging e auditoria (fase 1)

(Ver painel — Backlog.)

---

## TASK-SEC-10 — CI e Dependabot

**Critérios de aceitação:**

- [x] Workflow CI (lint, test, audit, build)
- [x] Dependabot npm
- [x] Node 24 + variável de migração JS Actions (changelog GitHub)

---

## TASK-SEC-11 — LGPD operacional

(Ver painel — Contínua.)

---

## Ordem sugerida (o que falta)

1. **SEC-12** (prefixos middleware) + **SEC-13** (HTML contratos) — maior impacto imediato.  
2. **SEC-04** (rate limit) + **SEC-14** (audit npm).  
3. **SEC-09** (auditoria aplicacional) + **SEC-15** (portal).  
4. **SEC-16**, **SEC-17**, **SEC-11** em paralelo / contínuo.

---

## Após conclusão do backlog crítico

- [ ] Reexecutar checklist da skill `nutrigestao-security` (fases 1–4).  
- [ ] Pentest externo antes de dados reais de pacientes em produção.
