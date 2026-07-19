# Plano de Auditoria de Performance e Confiabilidade — NutriGestão

**Data:** 17/07/2026 · **Versão do app:** 1.2.24
**Infra:** VPS 4GB RAM / 2 vCPU (Docker Swarm + Traefik) · Supabase Cloud · Next.js standalone

## 1. Sintomas relatados

- Queries lentas em geral; demora para salvar checklist e alterações de dados de clientes.
- Usuários **não conseguem editar** dados de clientes e pacientes.
- Upload de fotos falha e chega a **derrubar o servidor** (indisponibilidade).
- Não se sabe se a causa é upload, VPS ou banco.

## 2. Achados preliminares (auditoria inicial do código — 17/07)

Estes achados já direcionam as hipóteses. Evidências no código:

| # | Achado | Evidência | Severidade |
|---|--------|-----------|------------|
| A1 | Container da app limitado a **512MB RAM / 1 CPU**, apesar da VPS ter 4GB/2vCPU | `docker-compose-prd.yml` → `limits: memory: 512M, cpus: 1.00` | 🔴 Crítica |
| A2 | `bodySizeLimit: "210mb"` em Server Actions — um único upload grande é **bufferizado inteiro em memória** | `next.config.ts`; `lib/server/checklist-fill-photos-core.ts:370` (`Buffer.from(await file.arrayBuffer())`) | 🔴 Crítica |
| A3 | Combinação A1+A2: 1–2 uploads simultâneos podem estourar 512MB → **OOM kill → container reinicia → "servidor indisponível"** | Hipótese principal da indisponibilidade | 🔴 Crítica |
| A4 | Upload passa pela VPS antes de ir ao Supabase Storage (**duplo salto de rede**: cliente → VPS → Cloud) em vez de upload direto com signed URL | `lib/server/checklist-fill-photos-core.ts`, `lib/patients/photo-sync.ts`, etc. | 🟠 Alta |
| A5 | Histórico de **RLS com recursão e políticas corrigidas repetidamente** para edição de clientes/pacientes por membros do workspace | Migrações recentes: `team_members_insert_gestao_no_recursion`, `allow_workspace_team_update_clients`, `workspace_team_edit_patients_delete_gestao`, `perf_alerts_initplan_visit_fks` | 🔴 Crítica (provável causa do "não consigo editar") |
| A6 | 176 migrações; políticas RLS complexas reavaliadas por linha (initplan) — custo alto em queries de listagem | `supabase/migrations/` | 🟠 Alta |
| A7 | `saveFillItemResponse` / `saveFillResponsesBatch` disparam múltiplos `revalidatePath` por salvamento (até 5+ caminhos) | `lib/actions/checklist-fill.ts:905-919, 1544-1552` | 🟠 Alta |
| A8 | Toda página HTML servida com `no-store` — **zero cache** de páginas; cada navegação re-renderiza no servidor com round-trips ao Supabase Cloud | `next.config.ts` headers | 🟠 Alta |
| A9 | Latência VPS ↔ Supabase Cloud: cada server action faz várias queries **sequenciais**; se região do projeto Supabase ≠ região da VPS, cada query soma 50–200ms | A confirmar na Fase 0 | 🟠 Alta |
| A10 | Réplica única + geração de PDF (pdf-lib/exceljs) e conversão HEIC no mesmo processo do app — picos de CPU/RAM degradam todos os usuários | `package.json`, rotas dossier-pdf | 🟡 Média |
| A11 | Healthcheck renderiza `/login` (página completa) a cada 90s | `docker-compose-prd.yml` | 🟢 Baixa |
| A12 | Arquivo `lib/actions/checklist-fill.ts` com 2.382 linhas — candidato a refatoração para manutenibilidade | — | 🟡 Média |

## 3. Hipóteses priorizadas

1. **Indisponibilidade** = OOM do container (A1+A2+A3), agravado por upload de fotos grandes (celular, HEIC) e PDF/dossiê.
2. **"Não consigo editar cliente/paciente"** = política RLS negando `UPDATE` para membros não-owner do workspace (A5). Erro provavelmente silencioso (0 rows updated) ou erro de permissão engolido pela UI.
3. **Lentidão generalizada** = soma de: RLS caro por linha (A6), latência sequencial ao Supabase Cloud (A9), revalidações em cascata (A7), zero cache (A8), e CPU limitada a 1 core (A1).

## 4. Fases do plano

### Fase 0 — Diagnóstico em produção (1 dia; VOCÊ roda, eu analiso)

Objetivo: confirmar hipóteses com dados reais antes de tocar em código.

**Na VPS** — rodar `scripts/perf/diagnostico-vps.sh` (criado junto com este plano) e colar a saída. Ele coleta:

- `docker stats` (RAM/CPU do container vs limite), OOM kills (`docker events`/`dmesg`), restarts do serviço.
- Logs recentes do container (erros, timeouts, 502/504 do Traefik).
- Latência VPS → Supabase Cloud (`curl -w` para o endpoint REST do projeto).
- Carga geral da VPS (load average, memória, disco, swap).

**No painel do Supabase Cloud** (Dashboard → Reports / Database):

- [ ] Região do projeto (comparar com região da VPS).
- [ ] Query performance / `pg_stat_statements`: top 10 queries por tempo total e por chamadas.
- [ ] Uso de CPU/RAM/IO do banco e plano contratado (Micro? Small?) — banco subdimensionado também explica lentidão.
- [ ] Logs do PostgREST/Storage com erros 5xx no período das falhas de upload.
- [ ] Advisors → Performance (índices ausentes, RLS initplan).

**Reproduzir o bug de edição** (com usuário afetado): tentar editar cliente/paciente com DevTools aberto → anotar status HTTP e resposta. Se 200 com 0 linhas afetadas → RLS.

**Critério de saída:** causa raiz da indisponibilidade confirmada + top queries lentas identificadas + erro de edição classificado (RLS vs bug de UI).

### Fase 1 — Auditoria de código por área (2–3 dias; eu executo)

Revisão sistemática, arquivo a arquivo, das áreas críticas. Para cada item: achado → impacto → correção proposta → esforço.

**1.1 Uploads (fotos de checklist, pacientes, logos, assinaturas, exames, receitas)**
- [ ] Mapear todos os fluxos de upload (11 arquivos identificados) e tamanho máximo real aceito.
- [ ] Verificar compressão/resize no cliente antes do envio (heic-to já existe; conferir se comprime ou só converte).
- [ ] Avaliar migração para **signed upload URLs** (upload direto browser → Supabase Storage, sem passar pela VPS).
- [ ] Reduzir `bodySizeLimit` para valor compatível com 512MB–1GB de RAM (ex.: 25mb) após mover uploads grandes para URL assinada.
- [ ] Conferir `PHOTO_UPLOAD_LIMIT_6MB.md` vs comportamento real do código.

**1.2 Checklists (salvar item, batch, autosave, save-beacon, dossiê PDF)**
- [ ] Auditar `saveFillItemResponse` e `saveFillResponsesBatch`: nº de queries por salvamento, transações, retries.
- [ ] Racionalizar `revalidatePath`/`revalidateTag` (debounce; revalidar só no fim da sessão de preenchimento).
- [ ] Avaliar mover geração de dossiê PDF para fila/worker separado (já existe `[jobId]` — conferir se roda inline).
- [ ] Rodar benchmark existente (`docs/performance-checklist-save-benchmark.md`) como baseline.

**1.3 Clientes e Pacientes (CRUD)**
- [ ] Auditar `lib/actions/clients.ts` e ações de pacientes: tratamento de erro do Supabase (erro RLS não pode ser engolido).
- [ ] Testar matriz de permissões: owner / gestão / membro comum × criar / editar / excluir, contra as políticas atuais.
- [ ] Verificar se a UI reporta falha quando o `UPDATE` retorna 0 linhas.

**1.4 Server actions e data fetching global (61 arquivos com `use server`)**
- [ ] Identificar queries sequenciais paralelizáveis (`Promise.all`).
- [ ] Identificar N+1 (loops com query por item).
- [ ] Verificar uso de `select('*')` vs colunas necessárias; payloads grandes.
- [ ] Revisar `get-server-user.ts`: quantas chamadas a `auth.getUser()` por request (cada uma é round-trip ao Cloud).

**1.5 Cache e renderização**
- [ ] Reavaliar `no-store` global (necessário só para Capacitor WebView? aplicar por rota).
- [ ] Identificar páginas que podem usar cache de dados (`unstable_cache`/tags — `cache-tags.ts` já existe, medir cobertura).
- [ ] Bundle: páginas pesadas, imports desnecessários no server.

### Fase 2 — Banco de dados (2 dias; eu preparo, validamos juntos)

- [ ] `EXPLAIN (ANALYZE, BUFFERS)` nas top queries da Fase 0.
- [ ] Auditoria completa de políticas RLS: recursão, subqueries por linha, `(select auth.uid())` (initplan) — a migração `perf_alerts_initplan_visit_fks` sugere que o padrão antigo ainda existe em outras tabelas.
- [ ] Índices: FKs sem índice, índices para filtros de listagem (workspace_owner_id, client_id, etc.).
- [ ] Consolidar políticas de `clients`/`patients`/`team_members` numa matriz única documentada + testes RLS (`test:rls` já existe — cobrir os casos que falham em produção).
- [ ] Avaliar upgrade do plano do banco no Supabase Cloud se CPU/IO estiverem saturados.

### Fase 3 — Infraestrutura (1 dia)

- [ ] Subir limite do container: **2 CPU / 2–3GB RAM** (a VPS comporta; hoje usa 1/8 da RAM disponível).
- [ ] Avaliar 2 réplicas com `start-first` (zero-downtime em deploy e resiliência a OOM).
- [ ] Healthcheck para endpoint leve (ex.: `/api/app-version`) em vez de `/login`.
- [ ] Traefik: timeouts de request para uploads; buffering.
- [ ] Confirmar região VPS × região Supabase; se distantes, considerar migrar projeto ou VPS.
- [ ] Monitoramento mínimo: alertas de OOM/restart/5xx (doc `MONITORING-AND-ALERTING-SETUP.md` — verificar se está ativo).

### Fase 4 — Correções priorizadas

Ordenadas por impacto/esforço. Lista final sai das Fases 0–3, mas os prováveis quick wins são:

1. **Aumentar limites do container** (30 min, resolve indisponibilidade imediata) — Fase 3.
2. **Corrigir RLS de edição de clientes/pacientes + expor erro na UI** (crítico funcional).
3. **Compressão de imagem no cliente + limite efetivo de upload + signed URLs** (elimina OOM de vez).
4. **Reduzir `bodySizeLimit`** após item 3.
5. Índices e reescrita das políticas RLS mais caras.
6. Paralelizar queries e reduzir revalidações no fluxo de checklist.
7. Cache por rota onde seguro; healthcheck leve; 2ª réplica.
8. Refatorações estruturais (checklist-fill.ts, worker de PDF) — última onda.

Cada correção segue o ciclo: branch → implementação → testes (unit + RLS + e2e quando aplicável) → benchmark before/after → deploy → validação em produção.

### Fase 5 — Validação e prevenção de regressão

- [ ] Benchmark before/after (script existente) para checklist e upload.
- [ ] Testes RLS cobrindo a matriz completa de permissões de edição.
- [ ] Teste de carga leve (k6/autocannon) nos fluxos críticos: login, listagem de clientes, salvar checklist, upload.
- [ ] Alertas: OOM, restart, latência p95, 5xx.
- [ ] Documentar budget de performance (ex.: salvar item < 800ms p95; upload 5MB < 10s).

## 5. Cronograma sugerido

| Fase | Duração | Dependência |
|------|---------|-------------|
| 0 — Diagnóstico produção | 1 dia | Você rodar o script na VPS + dados do painel Supabase |
| 1 — Auditoria de código | 2–3 dias | — (já iniciada) |
| 2 — Banco de dados | 2 dias | Fase 0 (top queries) |
| 3 — Infra | 1 dia | Fase 0 |
| 4 — Correções | 1–2 semanas | Fases 0–3 |
| 5 — Validação | contínua | Fase 4 |

## 6. Resultados da Fase 0 (17/07/2026 — diagnóstico em produção)

Infra real: VPS única "HMLStratosTech" **8GB RAM / 4 vCPU**, compartilhada com Odoo, n8n, MongoDB, MinIO, Prometheus/cAdvisor, Supabase self-hosted (usado só pelo ambiente dev). Produção: 2 stacks (`nutricao_nutricao_app` → nutricao.stratostech.com.br e `nutrigestao-app` → nutrigestao.app), ambos apontando ao **mesmo projeto Supabase Cloud (compute Nano)**, limite de 2GB/container (o repo diz 512M — desatualizado).

### Causas confirmadas

| # | Causa | Evidência | Sintoma que explica |
|---|-------|-----------|---------------------|
| F1 | **Falha de DNS/rede saindo da VPS para o Supabase Cloud**: `getaddrinfo EAI_AGAIN` e `ConnectTimeoutError` (10s) nos logs de produção | Logs `nutricao_nutricao_app` (99 erros/48h), `AUTH_MIDDLEWARE_TIMEOUT:get_user` | App "fora do ar" sem o container cair; uploads falhando; salvamentos travando |
| F2 | **OOM kill real**: task do `nutrigestao-app` morta com exit 137 (SIGKILL) há 3 dias | `docker service ps` | Indisponibilidade intermitente |
| F3 | **Rate limiter quebrado em produção**: `UPSTASH_REDIS_REST_URL/TOKEN` ausentes → toda chamada lança `Failed to parse URL from /pipeline` | 1.517 erros/48h no `nutrigestao-app`; `lib/rate-limit.ts:11-14` | Overhead por request, log spam e **rate limiting de auth inativo (risco de segurança)** |
| F4 | **cAdvisor consumindo 2,3GB RAM** (vazamento conhecido) + host com swap em uso (725MB) | `docker stats` | Pressão de memória no host → contribui para F2 |
| F5 | **Latência VPS → Supabase Cloud ~50–90ms/request** × queries sequenciais nas server actions | `curl -w` (5 amostras) | Lentidão geral de salvamentos e navegação |
| F6 | **Banco no compute Nano** (menor tier do Supabase Cloud, ~0,5GB RAM, CPU compartilhada) | Informado pelo usuário | Queries lentas, agravadas por RLS caro |

### Atualização 18/07 — causa raiz da indisponibilidade CONFIRMADA e mitigada

Diagnóstico de rede (`scripts/perf/diagnostico-rede-vps.sh`): conntrack em 0,05% do limite, 0 falhas de DNS em 90 consultas, latência estável ~50–65ms, 0 descartes. A rede nunca esteve mal configurada — as falhas eram **episódicas, causadas por pressão de memória do host**: o vazamento do cAdvisor (2,3GB) empurrava a VPS para swap, os stalls estouravam os timeouts de DNS/TCP do Node (`EAI_AGAIN`/`ConnectTimeout`) e o app ficava indisponível sem o container cair.

Mitigado em 17–18/07: cAdvisor limitado a 400MB (`docker service update --limit-memory`) e `vm.swappiness=10`. Resultado: **0 erros de rede nas 20h seguintes** nos dois apps de produção. Prevenção pendente: definir limites de memória para todos os stacks vizinhos (n8n, Odoo, MongoDB, Supabase dev, monitor) no Portainer.

### Correções imediatas (ordem de execução)

1. **DNS da VPS**: configurar resolvers confiáveis (`1.1.1.1`, `8.8.8.8`) no `/etc/docker/daemon.json` e/ou systemd-resolved. Elimina F1.
2. **Upstash**: definir `UPSTASH_REDIS_REST_URL/TOKEN` nos 2 stacks de produção (ou fail-open explícito quando ausentes). Elimina F3.
3. **cAdvisor**: limite de memória (ex.: 400M) + `--docker_only=true --housekeeping_interval=30s`. Mitiga F4/F2.
4. **Upgrade do compute Supabase**: Nano → Micro (mínimo). Mitiga F6.
5. Pendências de análise: prints do painel Supabase (CPU/RAM 7 dias, Advisors, top queries) e auditoria de código Fase 1 (uploads, RLS de edição de clientes/pacientes).

## 7. Riscos

- Mexer em RLS sem a matriz de testes completa pode abrir brecha de segurança ou quebrar outro perfil — toda mudança de política passa por `test:rls` antes do deploy.
- Aumentar limites do container mascara vazamento de memória se houver — monitorar `mem_avg` pós-mudança.
- `no-store` pode ser requisito real do Capacitor — remover só por rota, testando no Android.
