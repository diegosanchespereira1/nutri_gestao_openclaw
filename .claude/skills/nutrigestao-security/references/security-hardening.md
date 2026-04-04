# Security Hardening — Implementação Prática

## 1. Rate Limiting com Upstash (Recomendado)

### Setup

```bash
npm install @upstash/ratelimit @upstash/redis
```

### Variáveis de Ambiente

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

### Middleware Rate Limiter Global

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

// Limiters por tipo de operação (conforme NFR13 do PRD)
export const rateLimiters = {
  // API de leitura: 100 req/min por usuário
  read: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'rl:read',
  }),

  // API de escrita: 30 req/min por usuário
  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'rl:write',
  }),

  // Upload: 10 req/min por usuário
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'rl:upload',
  }),

  // Auth: 5 tentativas/min por IP
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'rl:auth',
  }),

  // Reset password: 3/hora por email
  resetPassword: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'rl:reset',
  }),

  // Signup: 3/hora por IP (prevenir spam de contas)
  signup: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'rl:signup',
  }),
}

// Helper para extrair identifier
export function getIdentifier(request: Request, userId?: string): string {
  if (userId) return userId
  // Fallback para IP (Vercel)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown'
  return ip
}
```

### Rate Limit no Middleware

```typescript
// middleware.ts (adicionar ao middleware existente)
import { rateLimiters, getIdentifier } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limit global para rotas de auth
  if (pathname.startsWith('/auth/')) {
    const ip = getIdentifier(request)
    const { success, limit, reset, remaining } = await rateLimiters.auth.limit(ip)

    if (!success) {
      return new NextResponse('Muitas tentativas. Aguarde.', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      })
    }
  }

  // ... resto do middleware (auth session refresh, etc.)
}
```

### Rate Limit em Server Actions

```typescript
// Wrapper reutilizável
export async function withRateLimit<T>(
  userId: string,
  type: keyof typeof rateLimiters,
  action: () => Promise<T>
): Promise<T | { error: string }> {
  const { success } = await rateLimiters[type].limit(userId)
  if (!success) {
    return { error: 'Limite de requisições atingido. Aguarde um momento.' }
  }
  return action()
}

// Uso:
export async function createPatient(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  return withRateLimit(user.id, 'write', async () => {
    // ... lógica de criação
  })
}
```

---

## 2. Security Headers (next.config.ts)

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'nonce-{NONCE}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://*.supabase.co;
  font-src 'self';
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
`.replace(/\n/g, '')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()',
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  // Desabilitar source maps em produção
  productionBrowserSourceMaps: false,

  // Restringir domínios de imagens
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },
}

export default nextConfig
```

### CSP com Nonce (Middleware)

```typescript
// middleware.ts — gerar nonce por request
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export function middleware(request: NextRequest) {
  const nonce = crypto.randomBytes(16).toString('base64')
  const csp = ContentSecurityPolicy.replace(/{NONCE}/g, nonce)

  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('x-nonce', nonce) // para uso em components

  return response
}
```

---

## 3. Validação de Input com Zod

### Schemas Reutilizáveis

```typescript
// lib/validators/shared.ts
import { z } from 'zod'

// Tipos base seguros
export const uuidSchema = z.string().uuid('ID inválido')
export const emailSchema = z.string().email('Email inválido').max(255)
export const phoneSchema = z.string().regex(/^\+?\d{10,15}$/, 'Telefone inválido').optional()
export const cpfSchema = z.string().regex(/^\d{11}$/, 'CPF inválido')

// Prevenir XSS em strings de texto livre
export const safeTextSchema = z.string()
  .max(5000, 'Texto muito longo')
  .transform(val => val.replace(/<[^>]*>/g, '')) // strip HTML tags

// Prevenir path traversal em nomes de arquivo
export const safeFilenameSchema = z.string()
  .max(255)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Nome de arquivo inválido')
  .refine(val => !val.includes('..'), 'Nome de arquivo inválido')

// Paginação segura
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(0).max(10000).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})
```

### Padrão de Validação em Server Action

```typescript
// lib/validators/patient.ts
export const createPatientSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  cpf: cpfSchema.optional(),
  birth_date: z.string().date(),
  phone: phoneSchema,
  notes: safeTextSchema.optional(),
  establishment_id: uuidSchema.optional(),
})

// Server Action com validação completa
export async function createPatient(formData: FormData) {
  // 1. Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 2. Rate limit
  const { success } = await rateLimiters.write.limit(user.id)
  if (!success) return { error: 'Limite atingido. Aguarde.' }

  // 3. Validação
  const raw = Object.fromEntries(formData)
  const parsed = createPatientSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // 4. Operação (user_id vem do token, NUNCA do form)
  const { error } = await supabase
    .from('patients')
    .insert({ ...parsed.data, user_id: user.id })

  if (error) return { error: translateSupabaseError(error) }

  // 5. Auditoria (se dados sensíveis)
  await logAudit(supabase, user.id, 'create', 'patients', null, parsed.data)

  revalidatePath('/app/pacientes')
  redirect('/app/pacientes')
}
```

---

## 4. Log de Auditoria

### Tabela

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_audit_log.sql
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete')),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_date ON audit_log(created_at);

-- RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Profissional vê seus próprios logs
CREATE POLICY "Users see own audit" ON audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Inserção só via Server Action (bloqueado no client)
CREATE POLICY "Server inserts audit" ON audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE audit_log IS 'LGPD: registro de todas as operações em dados de pacientes';
```

### Helper TypeScript

```typescript
// lib/audit.ts
import { SupabaseClient } from '@supabase/supabase-js'

const SENSITIVE_FIELDS = ['cpf', 'phone', 'email', 'medical_notes', 'address']

function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  if (!data) return data
  const masked = { ...data }
  for (const field of SENSITIVE_FIELDS) {
    if (field in masked && masked[field]) {
      masked[field] = '***'
    }
  }
  return masked
}

export async function logAudit(
  supabase: SupabaseClient,
  userId: string,
  action: 'create' | 'read' | 'update' | 'delete',
  tableName: string,
  oldData?: Record<string, unknown> | null,
  newData?: Record<string, unknown> | null,
) {
  // Mascarar dados sensíveis nos logs
  const maskedOld = oldData ? maskSensitiveData(oldData) : null
  const maskedNew = newData ? maskSensitiveData(newData) : null

  await supabase.from('audit_log').insert({
    user_id: userId,
    action,
    table_name: tableName,
    old_data: maskedOld,
    new_data: maskedNew,
  }).then(({ error }) => {
    if (error) console.error('Audit log error:', { action, tableName, error: error.code })
    // Nunca falhar a operação principal por causa do audit log
  })
}
```

---

## 5. CAPTCHA após Falhas de Login

### Integração Cloudflare Turnstile (recomendado — gratuito)

```typescript
// lib/captcha.ts
export async function verifyCaptcha(token: string): Promise<boolean> {
  if (!process.env.TURNSTILE_SECRET_KEY) return true // skip em dev

  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    }
  )

  const data = await response.json()
  return data.success === true
}
```

---

## 6. Proteção de Upload

```typescript
// lib/upload.ts
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { valid: false, error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou PDF.' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Arquivo muito grande. Máximo: 10MB.' }
  }

  // Verificar magic bytes (não confiar só no Content-Type)
  // Para implementação completa, verificar os primeiros bytes do arquivo

  return { valid: true }
}

// Server Action para upload seguro
export async function uploadFile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  // Rate limit
  const { success } = await rateLimiters.upload.limit(user.id)
  if (!success) return { error: 'Muitos uploads. Aguarde.' }

  const file = formData.get('file') as File
  const validation = validateFile(file)
  if (!validation.valid) return { error: validation.error }

  // Path seguro com user_id como prefixo (Storage RLS)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const safeName = `${Date.now()}.${ext.replace(/[^a-z0-9]/g, '')}`
  const path = `${user.id}/${safeName}`

  const { error } = await supabase.storage
    .from('uploads')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) return { error: 'Erro no upload. Tente novamente.' }
  return { path }
}
```

---

## 7. Checklist de Pré-Produção

### Antes de cada deploy

- [ ] `npm audit --omit=dev` sem vulnerabilidades altas/críticas
- [ ] `npx tsc --noEmit` sem erros
- [ ] Contagem tabelas == contagem RLS
- [ ] Grep por `service_role` retorna zero em `app/`, `components/`, `lib/`
- [ ] Grep por `console.log` em produção: só `console.error` para erros
- [ ] `next.config.ts` com security headers
- [ ] `.env.example` atualizado, `.env` no `.gitignore`
- [ ] Migrations testadas em staging

### Antes do lançamento comercial

- [ ] Pentest externo completo (auth, RLS, Storage, portal)
- [ ] Revisão jurídica LGPD por advogado especialista
- [ ] Plano de resposta a incidentes documentado
- [ ] DPO designado e informações de contato publicadas
- [ ] Termos de uso e política de privacidade revisados
- [ ] Monitoramento e alertas configurados (Vercel, Supabase)
- [ ] Backup e recovery testados
- [ ] Rate limiting configurado e testado com carga

---

## 8. Monitoramento de Segurança Contínuo

### Métricas para Monitorar

| Métrica | Alerta se | Ação |
|---------|-----------|------|
| Falhas de auth/min | > 50/min | Possível credential stuffing → ativar CAPTCHA global |
| Rate limit hits/hora | > 1000/hora | Possível DDoS → verificar WAF |
| Erros 5xx/min | > 10/min | Problema de app → investigar |
| Queries lentas (p95) | > 5s | Possível abuso → revisar RLS performance |
| Storage usage growth | > 20%/semana | Possível upload abuse → verificar |
| Signup rate | > 100/dia inesperado | Possível bot → CAPTCHA em signup |

### Pipeline de CI/CD com Security Gates

```yaml
# .github/workflows/security.yml
name: Security Check
on: [pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: Audit dependencies
        run: npm audit --audit-level=high

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: ESLint security rules
        run: npx eslint --rule 'no-eval: error' --rule 'no-implied-eval: error' .

      - name: Check for secrets
        run: |
          if grep -rn "SUPABASE_SERVICE_ROLE" --include="*.ts" --include="*.tsx" app/ components/ lib/; then
            echo "CRITICAL: Service role key found in client code!"
            exit 1
          fi

      - name: Check RLS coverage
        run: |
          TABLES=$(grep -c "CREATE TABLE" supabase/migrations/*.sql 2>/dev/null || echo 0)
          RLS=$(grep -c "ENABLE ROW LEVEL SECURITY" supabase/migrations/*.sql 2>/dev/null || echo 0)
          echo "Tables: $TABLES, RLS: $RLS"
          if [ "$TABLES" != "$RLS" ]; then
            echo "WARNING: Not all tables have RLS enabled!"
            # exit 1  # Uncomment para bloquear merge
          fi
```
