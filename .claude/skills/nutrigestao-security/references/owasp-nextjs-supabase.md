# OWASP Top 10 2025 — Mapeado para Next.js + Supabase

## A01:2025 — Broken Access Control

O risco #1 há vários anos. Para o NutriGestão, manifesta-se como:

### Cross-Tenant Data Leak (IDOR multi-tenant)

**Como acontece:**
1. Profissional A está logado (JWT com user_id = "aaa")
2. Profissional A altera o ID na URL: `/app/pacientes/[id-de-paciente-do-B]`
3. Se a query não filtra por user_id ou RLS não está ativo, A vê dados de B

**Verificação em código:**
```typescript
// ❌ VULNERÁVEL — busca por ID sem verificar tenant
const { data } = await supabase
  .from('patients')
  .select('*')
  .eq('id', params.id)
  .single()

// ✅ SEGURO — RLS garante que auth.uid() = user_id é verificado automaticamente
// Mas SÓ se a policy de SELECT existir e estiver correta
const { data } = await supabase
  .from('patients')
  .select('*')
  .eq('id', params.id)
  .single()
// Se RLS está ativo, patient retorna null se não pertence ao tenant
if (!data) notFound()
```

**A defesa é RLS no PostgreSQL, não lógica de aplicação.** Se alguém esquecer o `.eq('user_id', ...)` no código, o RLS pega. É defense-in-depth.

### Mass Assignment

**Como acontece:**
```typescript
// ❌ VULNERÁVEL
const body = Object.fromEntries(formData) // pode ter user_id injetado
await supabase.from('patients').insert(body)
```

**Fix:**
```typescript
// ✅ SEGURO — extrair apenas campos permitidos
const name = formData.get('name') as string
const { data: { user } } = await supabase.auth.getUser()
await supabase.from('patients').insert({
  name,
  user_id: user!.id // vem do token, nunca do form
})
```

### Privilege Escalation

**Como acontece:**
- Usuário normal acessa `/admin/tenants` diretamente
- Middleware não cobre a rota ou verifica papel

**Verificação:**
```typescript
// middleware.ts deve bloquear rotas admin
if (pathname.startsWith('/admin')) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/app/dashboard', request.url))
  }
}
```

---

## A02:2025 — Security Misconfiguration

### Headers de Segurança (next.config.ts)

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'nonce-{NONCE}'", // nonce gerado por request
      "style-src 'self' 'unsafe-inline'", // Tailwind precisa
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
]

const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  // Desabilitar source maps em produção
  productionBrowserSourceMaps: false,
}
```

### Supabase Misconfiguration

Verificar no dashboard Supabase:
1. **Auth > URL Configuration:** Site URL correto, redirect URLs whitelist explícito
2. **Auth > Email:** Confirmação de email ativa
3. **Auth > Rate Limits:** Ativas
4. **Database > Extensions:** Apenas as necessárias habilitadas
5. **API > Settings:** Anon key rotacionada se vazada, service_role NUNCA no client

---

## A03:2025 — Software Supply Chain Failures (NOVO)

### Cenários de Ataque

1. **Typosquatting:** `npm install supabse-js` (typo) instala pacote malicioso
2. **Dependency confusion:** Pacote privado com mesmo nome de um público
3. **Comprometimento de mantenedor:** Pacote legítimo recebe update malicioso

### Defesas

```bash
# 1. Lockfile sempre commitado e verificado
# Verificar que package-lock.json está no git
git ls-files package-lock.json

# 2. Audit regular
npm audit --omit=dev

# 3. Verificar integridade
npm ci  # usa lockfile exato, falha se inconsistente

# 4. No CI/CD
# .github/workflows/ci.yml
# - run: npm ci
# - run: npm audit --audit-level=high
```

---

## A04:2025 — Insecure Design

### Rate Limiting (conforme PRD NFR13)

```typescript
// lib/rate-limit.ts — usando @upstash/ratelimit
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export const rateLimiters = {
  read: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100/min
    analytics: true,
    prefix: 'rl:read',
  }),
  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'), // 30/min
    analytics: true,
    prefix: 'rl:write',
  }),
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10/min
    analytics: true,
    prefix: 'rl:upload',
  }),
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5/min
    analytics: true,
    prefix: 'rl:auth',
  }),
  resetPassword: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'), // 3/hora
    analytics: true,
    prefix: 'rl:reset',
  }),
}

// Uso em Server Action
export async function createPatient(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { success } = await rateLimiters.write.limit(user.id)
  if (!success) {
    return { error: 'Muitas requisições. Aguarde um momento.' }
  }
  // ... resto da lógica
}
```

### Validação com Zod (obrigatória server-side)

```typescript
// lib/validators/patient.ts
import { z } from 'zod'

export const createPatientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
  cpf: z.string().regex(/^\d{11}$/, 'CPF inválido').optional(),
  birth_date: z.string().date('Data de nascimento inválida'),
  establishment_id: z.string().uuid('Estabelecimento inválido').optional(),
})

// Na Server Action
export async function createPatient(formData: FormData) {
  const raw = Object.fromEntries(formData)
  const parsed = createPatientSchema.safeParse(raw)

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }
  // usar parsed.data (sanitizado) e nunca raw
}
```

---

## A05:2025 — Cryptographic Failures

### Nunca Loggar Dados Sensíveis

```typescript
// ❌ VULNERÁVEL
console.log('Paciente criado:', patient) // loga dados de saúde
console.log('Login tentativa:', { email, password }) // loga senha

// ✅ SEGURO
console.log('Paciente criado:', { id: patient.id }) // só o ID
console.log('Login tentativa:', { email, success: false }) // nunca a senha
```

### Verificar que Supabase Encrypta em Repouso

Supabase Cloud: encriptação em repouso está ativa por padrão (AES-256 no volume do PostgreSQL).
Verificar: Dashboard > Project Settings > Database

Para campo-level encryption adicional em dados de saúde críticos, considerar `pgcrypto`:
```sql
-- Opcional: encriptação por coluna para dados ultra-sensíveis
-- (considerar impacto em performance para queries)
UPDATE patients SET
  medical_notes = pgp_sym_encrypt(medical_notes_plain, current_setting('app.encryption_key'))
```

---

## A07:2025 — Identification and Authentication Failures

### Mensagens Genéricas (nunca revelar se email existe)

```typescript
// ❌ VULNERÁVEL
if (error.message.includes('User not found')) {
  return { error: 'Este email não está cadastrado' } // revela que email não existe
}

// ✅ SEGURO
return { error: 'Se este email estiver cadastrado, você receberá um link de recuperação.' }
```

### Proteger contra Credential Stuffing

```typescript
// Rate limit + CAPTCHA após 3 falhas
let loginAttempts = 0 // na prática, armazenar em Redis por IP

if (loginAttempts >= 3) {
  // Exigir CAPTCHA (hCaptcha, Turnstile, ou reCAPTCHA)
  const captchaValid = await verifyCaptcha(formData.get('captcha_token'))
  if (!captchaValid) {
    return { error: 'Verificação de segurança necessária', requireCaptcha: true }
  }
}
```

---

## A09:2025 — Security Logging and Monitoring Failures

### Estrutura de Log de Auditoria

```sql
-- supabase/migrations/audit_log.sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete'
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB, -- dados antes (para update/delete)
  new_data JSONB, -- dados depois (para create/update)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para queries de compliance
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- RLS: cada profissional vê só seus próprios logs
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own audit logs" ON audit_log
  FOR SELECT USING (auth.uid() = user_id);
-- INSERT: só via trigger/function server-side (SECURITY DEFINER)
```

### Mascaramento de PII em Logs

```typescript
function maskPII(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['cpf', 'phone', 'email', 'address', 'medical_notes']
  const masked = { ...data }
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***MASKED***'
    }
  }
  return masked
}
```

---

## A10:2025 — Mishandling of Exceptional Conditions (NOVO)

### Error Boundaries no Next.js

```typescript
// app/(app)/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // NUNCA mostrar error.message ao usuário em produção
  console.error('App error:', error.digest) // só o digest

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <h2 className="text-lg font-semibold">Algo deu errado</h2>
      <p className="text-muted-foreground mt-2">
        Estamos trabalhando para resolver. Tente novamente.
      </p>
      <button onClick={reset} className="mt-4">Tentar novamente</button>
    </div>
  )
}
```

### Tradução de Erros Supabase (nunca expor erros internos)

```typescript
// lib/errors.ts
export function translateSupabaseError(error: { code?: string; message?: string }): string {
  const errorMap: Record<string, string> = {
    '23505': 'Este registro já existe.',
    '23503': 'Não é possível: existem registros vinculados.',
    '23502': 'Campo obrigatório não preenchido.',
    '42501': 'Sem permissão para esta ação.',
    '42P01': 'Erro interno. Contate o suporte.',
    'PGRST116': 'Registro não encontrado.',
    'PGRST301': 'Erro interno. Contate o suporte.',
  }

  return errorMap[error.code ?? ''] ?? 'Erro inesperado. Tente novamente.'
  // NUNCA: return error.message (pode conter SQL, nomes de tabela, etc.)
}
```
