# Checklist de Segurança Aprofundado — NutriGestão

## Vetores de Ataque Específicos para este Projeto

### 1. Cross-tenant Data Leak (mais crítico)
**Cenário:** Profissional A acessa dados do Profissional B.

**Como verificar:**
- Toda query deve ter `.eq('user_id', user.id)` OU estar protegida por RLS
- RLS com `auth.uid() = user_id` faz isso automaticamente no PostgreSQL
- Server Actions: verificar se o user_id vem de `auth.getUser()`, nunca do body da requisição

**Padrão INSEGURO:**
```typescript
// ❌ user_id vem do cliente — pode ser manipulado
const { userId } = await req.json()
const { data } = await supabase.from('patients').select('*').eq('user_id', userId)
```

**Padrão SEGURO:**
```typescript
// ✅ user_id vem do token JWT verificado pelo servidor
const { data: { user } } = await supabase.auth.getUser()
const { data } = await supabase.from('patients').select('*')
// RLS automaticamente filtra por auth.uid() = user_id
```

### 2. Insecure Direct Object Reference (IDOR)
**Cenário:** Profissional A acessa `/app/pacientes/[id]` de um paciente do Profissional B.

**Como verificar:**
- Toda busca por ID específico deve verificar ownership
- RLS resolve isso automaticamente se configurado corretamente
- Verificar: se RLS está ativo, a query retorna null (não erro) para IDs de outros tenants

**Padrão SEGURO:**
```typescript
// RLS garante que só retorna se auth.uid() = user_id
const { data: patient } = await supabase
  .from('patients')
  .select('*')
  .eq('id', patientId)
  .single()

if (!patient) notFound() // RLS filtrou = não existe para este tenant
```

### 3. Mass Assignment
**Cenário:** Cliente envia `user_id` no body e sobrescreve o tenant.

**Como verificar:**
- Nunca incluir `user_id` nos dados do formulário/body
- O `user_id` SEMPRE vem de `auth.getUser()` no servidor

**Padrão INSEGURO:**
```typescript
// ❌ user_id pode vir do FormData manipulado
const data = Object.fromEntries(formData)
await supabase.from('clients').insert(data) // data pode ter user_id injetado
```

**Padrão SEGURO:**
```typescript
// ✅ user_id explicitamente do token
const { data: { user } } = await supabase.auth.getUser()
const name = formData.get('name') as string // só o que você precisa
await supabase.from('clients').insert({ name, user_id: user.id })
```

### 4. Storage Path Traversal
**Cenário:** Upload com path `../../outro-tenant/arquivo.pdf`.

**Como verificar:**
- Path de Storage sempre prefixado com `user.id`
- Nunca usar path vindo do cliente diretamente

**Padrão SEGURO:**
```typescript
const path = `${user.id}/${visitId}/${Date.now()}.jpg`
```

## Verificação de RLS em SQL

Para cada tabela nova, verificar que tem:

```sql
-- 1. RLS ativado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'nome_tabela';
-- rowsecurity deve ser 't'

-- 2. Policies existentes
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'nome_tabela';
-- Deve ter: SELECT, INSERT, UPDATE, DELETE
```

## LGPD — Dados de Categoria Especial

Dados que exigem tratamento especial:
- Diagnósticos nutricionais
- Antropometria (peso, altura, IMC, circunferências)
- Exames laboratoriais
- Histórico de doenças
- Informações sobre alimentação e comportamento alimentar
- Dados de menores (exige consentimento dos pais/responsáveis)

Para cada dado desta categoria, verificar:
1. Consentimento coletado antes da inserção
2. Log de auditoria na tabela ou trigger
3. Mascaramento em logs do sistema
4. Política de retenção definida (5 anos pós-contrato conforme PRD)

## Cabeçalhos de Segurança (Next.js)

Verificar em `next.config.ts` se estão configurados:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
