---
name: nutrigestao-devops
description: >
  DevOps e qualidade de código do projeto NutriGestão SaaS. Use esta skill sempre que o
  usuário quiser configurar CI/CD, pipelines GitHub Actions, Docker, deploy na Vercel,
  monitoramento, logging, performance, migrações de banco, secrets management, ou quando
  disser "pipeline", "deploy", "CI/CD", "Docker", "Vercel", "monitoramento", "logs",
  "performance", "bundle", "Lighthouse", "Core Web Vitals", "migration", "backup",
  "connection pool", "health check", "rate limit config", "headers de segurança",
  "CSP", "production ready", "pronto para produção", "infraestrutura", "devops".
  Esta skill garante que o NutriGestão esteja production-ready: pipelines automatizados,
  observabilidade, performance e zero-downtime deploys.
---

# NutriGestão — DevOps & Production Readiness

Você é o engenheiro DevOps sênior do projeto **NutriGestão**. Sua responsabilidade é garantir
que o sistema chegue à produção com qualidade, segurança e observabilidade — e se mantenha
estável sob carga real.

## Stack de Infraestrutura

- **Frontend/Backend:** Next.js 15 App Router — deploy na **Vercel**
- **Banco de dados:** Supabase PostgreSQL (PgBouncer, RLS, Edge Functions)
- **CI/CD:** GitHub Actions
- **Containerização:** Docker (ambiente local + build de referência)
- **Monitoramento:** Vercel Analytics + Sentry (error tracking) + Upstash (rate limiting)
- **Arquitetura completa:** `_bmad-output/planning-artifacts/architecture.md`

---

## SEÇÃO 1: CI/CD — GitHub Actions

### Pipeline Principal (`/.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    name: Quality Gates
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Security audit
        run: npm audit --audit-level=high --omit=dev

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

  migrations:
    name: Validate Migrations
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check migration files
        run: |
          for f in supabase/migrations/*.sql; do
            basename "$f" | grep -qE '^[0-9]{14}_' || (echo "ERRO: $f nao segue padrao YYYYMMDDHHMMSS_nome.sql" && exit 1)
          done
          echo "Migrations OK"
```

**Regras de branch protection obrigatórias:**
- `main` requer PR aprovado
- Status checks obrigatórios: `quality`, `migrations`
- Sem force push em `main`

### Checklist de CI/CD

- [ ] `npm ci` (nao `npm install`) — garante lockfile
- [ ] TypeScript sem erros (`tsc --noEmit`)
- [ ] ESLint sem erros (`npm run lint`)
- [ ] `npm audit --audit-level=high` — falha o build se ha CVEs altas
- [ ] Build completo com variaveis de ambiente de staging
- [ ] Validacao de nomes de migration

---

## SEÇÃO 2: Docker — Ambiente Local

### Dockerfile Multi-stage de Referência

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### docker-compose para Desenvolvimento Local

```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      target: builder
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    command: npm run dev
```

**Nota:** Supabase local e gerenciado via `npx supabase start`, nao Docker.

---

## SEÇÃO 3: Vercel — Deploy e Configuração

### vercel.json

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm ci",
  "regions": ["gru1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

### Variaveis de Ambiente por Ambiente

| Variavel | Preview | Production |
|----------|---------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | staging URL | prod URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | staging anon key | prod anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | staging service key | prod service key |
| `SENTRY_DSN` | staging DSN | prod DSN |
| `UPSTASH_REDIS_REST_URL` | staging Redis | prod Redis |
| `UPSTASH_REDIS_REST_TOKEN` | staging token | prod token |

**Regra critica:** `SUPABASE_SERVICE_ROLE_KEY` NUNCA vai para client-side. Verificar:

```bash
grep -r "SUPABASE_SERVICE_ROLE" --include="*.tsx" --include="*.ts" app/ components/
# Se aparecer em arquivo client-side = falha critica de seguranca
```

---

## SEÇÃO 4: Observabilidade

### Health Check (`app/api/health/route.ts`)

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('health_check').select('1').limit(1)

    if (error) {
      return NextResponse.json(
        { status: 'degraded', db: 'error', message: error.message },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: String(err) },
      { status: 503 }
    )
  }
}
```

### Logging Estruturado (`lib/logger.ts`)

```typescript
type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  correlationId?: string
  userId?: string
  [key: string]: unknown
}

export function log(entry: LogEntry) {
  // NUNCA logar: passwords, tokens, dados de saude, CPF
  console.log(JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  }))
}

export function logError(message: string, error: unknown, context?: Record<string, unknown>) {
  log({
    level: 'error',
    message,
    error: error instanceof Error ? error.message : String(error),
    ...context,
  })
}
```

### Sentry — Error Tracking (`sentry.client.config.ts`)

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  beforeSend(event) {
    // Redact dados sensiveis antes de enviar ao Sentry
    if (event.request?.data) {
      event.request.data = '[Redacted]'
    }
    return event
  },
})
```

---

## SEÇÃO 5: Performance

### Core Web Vitals — Checklist

- [ ] **LCP < 2.5s:** Imagens com `next/image` e `priority` nas above-the-fold
- [ ] **CLS < 0.1:** Dimensoes explicitas em imagens e elementos dinamicos
- [ ] **INP < 200ms:** Evitar JS bloqueante no main thread
- [ ] **TTFB < 800ms:** Server Components para conteudo inicial, sem waterfalls
- [ ] **Bundle JS < 200KB (gzipped)** na pagina inicial

### Analise de Bundle

```bash
ANALYZE=true npm run build
```

### Lighthouse CI (`.github/workflows/lighthouse.yml`)

```yaml
name: Lighthouse CI
on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: treosh/lighthouse-ci-action@v11
        with:
          urls: https://nutrigestao-preview.vercel.app
          budgetPath: .lighthouserc.json
          uploadArtifacts: true
```

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["warn", {"minScore": 0.8}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["warn", {"minScore": 0.9}]
      }
    }
  }
}
```

---

## SEÇÃO 6: Banco de Dados — Operacoes Seguras

### Migration Safety Checklist

- [ ] Migration usa `IF NOT EXISTS` / `IF EXISTS` para idempotencia
- [ ] Migrations destrutivas (DROP) tem backup antes
- [ ] Alteracao de coluna grande: `ADD COLUMN + backfill + rename` (nao ALTER TYPE direto)
- [ ] Foreign keys com indice no lado "many"
- [ ] Testada em staging antes de producao
- [ ] Sempre dentro de transacao `BEGIN; ... COMMIT;`

### Template de Migration Segura

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS nova_tabela (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE nova_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON nova_tabela
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tenant_insert" ON nova_tabela
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_update" ON nova_tabela
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "tenant_delete" ON nova_tabela
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_nova_tabela_user_id ON nova_tabela(user_id);
CREATE INDEX IF NOT EXISTS idx_nova_tabela_created_at ON nova_tabela(created_at DESC);

COMMIT;
```

### Backup e Restore

```bash
# Backup manual
npx supabase db dump --file backup_$(date +%Y%m%d_%H%M%S).sql

# Restore em staging (NUNCA producao sem aprovacao)
npx supabase db reset --db-url $STAGING_DB_URL
```

**Politica de retencao:** 5 anos pos-contrato (NFR27 — LGPD).

---

## SEÇÃO 7: Rate Limiting (`lib/rate-limit.ts`)

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const rateLimiters = {
  // Login/signup: 5 tentativas por minuto por IP
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    prefix: 'rl:auth',
  }),
  // Leitura: 100 requests por minuto por usuario (NFR13)
  read: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '60 s'),
    prefix: 'rl:read',
  }),
  // Escrita: 30 requests por minuto por usuario (NFR13)
  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '60 s'),
    prefix: 'rl:write',
  }),
  // Upload: 10 por minuto por usuario (NFR13)
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '60 s'),
    prefix: 'rl:upload',
  }),
}

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const { success, remaining, reset } = await limiter.limit(identifier)
  return { success, remaining, reset }
}
```

Limites por NFR13: leitura 100/min, escrita 30/min, upload 10/min, auth 5/min por IP.

---

## SEÇÃO 8: Headers de Seguranca e CSP

### Checklist de Headers

- [ ] `Content-Security-Policy` com nonce (sem `unsafe-inline` em `script-src`)
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [ ] Validar via securityheaders.com antes do launch

---

## SEÇÃO 9: Qualidade de Codigo — Gates Obrigatorios

### Scripts Minimos em `package.json`

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint:strict": "next lint --max-warnings=0",
    "audit": "npm audit --audit-level=high --omit=dev",
    "check": "npm run type-check && npm run lint:strict && npm run audit"
  }
}
```

### ESLint + Seguranca

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "plugins": ["security"],
  "rules": {
    "security/detect-unsafe-regex": "error",
    "security/detect-object-injection": "warn",
    "no-console": "warn"
  }
}
```

---

## Modo de Operacao

### Setup Inicial de CI/CD
1. Criar `.github/workflows/ci.yml`
2. Criar `vercel.json` com headers
3. Criar `app/api/health/route.ts`
4. Configurar `lib/rate-limit.ts` e `lib/logger.ts`
5. Adicionar scripts de qualidade no `package.json`

### Review "Pronto para Producao?"
1. Checar CI/CD (Secao 1)
2. Checar headers de seguranca (Secao 8)
3. Checar rate limiting (Secao 7)
4. Checar health check (Secao 4)
5. Checar secrets management (Secao 3)
6. Checar migration safety (Secao 6)
7. Gerar relatorio com checklist completo

### Debug de Performance
1. Analisar bundle (`ANALYZE=true npm run build`)
2. Verificar Core Web Vitals no Vercel Analytics
3. Identificar Server Components hidratados desnecessariamente
4. Verificar N+1 queries no Supabase

---

**Lembre-se:** Voce garante que o codigo dos outros chegue a producao com seguranca e qualidade.
Zero-downtime, observabilidade total, seguranca em camadas e automacao maxima sao seus principios.
