# Checklist de Deploy para Produção — NutriGestão SaaS
**Data:** 9 de Abril de 2026  
**Status:** Preparação para produção  
**Responsável:** DevOps/Tech Lead

---

## 🚀 PRÉ-DEPLOY CRÍTICO (Executar antes de qualquer push)

### 1️⃣ Build e Testes

```bash
# [ ] Executar build
npm run build
# Esperado: ✓ Ready in X.XXs

# [ ] Executar testes unitários
npm run test
# Esperado: ✓ All tests passed

# [ ] Executar testes RLS (segurança multi-tenant)
npm run test:rls
# Esperado: ✓ RLS policies validated

# [ ] Verificar vulnerabilidades
npm audit --omit=dev
# Esperado: found 0 vulnerabilities
```

**Status:** ⏳ PENDENTE

---

### 2️⃣ Verificações de Segurança

```bash
# [ ] Verificar CSP headers
curl -I https://nutrigestao-staging.app | grep "Content-Security-Policy"
# Esperado: script-src 'self' (sem 'unsafe-inline')

# [ ] Verificar HSTS header
curl -I https://nutrigestao-staging.app | grep "Strict-Transport-Security"
# Esperado: max-age=31536000; includeSubDomains

# [ ] Verificar X-Frame-Options
curl -I https://nutrigestao-staging.app | grep "X-Frame-Options"
# Esperado: DENY

# [ ] Verificar sem secrets em .env
git log --all --diff-filter=A --name-only -- '*.env'
# Esperado: (sem resultados de secrets)

# [ ] Verificar service role não está no cliente
grep -r "SUPABASE_SERVICE_ROLE" app/ components/
# Esperado: (sem resultados)
```

**Status:** ⏳ PENDENTE

---

### 3️⃣ Testes Funcionais de Segurança

#### Rate Limiting
```bash
# [ ] Simular 6 tentativas de login rápidas
for i in {1..6}; do
  curl -X POST https://nutrigestao.app/api/auth/callback \
    -H "x-forwarded-for: 192.168.1.1" \
    -d "code=test_code_$i"
done
# Esperado: 6ª tentativa retorna 429 (Too Many Requests)
```

#### HTML Sanitization
```bash
# [ ] Injetar XSS em template de contrato
# Payload: <img src=x onerror="alert('XSS')">
# Resultado esperado: Script removido, apenas texto renderizado
```

**Status:** ⏳ PENDENTE

---

## 🔧 CONFIGURAÇÃO DE PRODUÇÃO

### 4️⃣ Variáveis de Ambiente

```bash
# [ ] Verificar .env.production exists
cat .env.production

# [ ] Variáveis obrigatórias configuradas:
[ ] NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
[ ] NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
[ ] UPSTASH_REDIS_REST_URL=https://...
[ ] UPSTASH_REDIS_REST_TOKEN=...
[ ] (Outras variáveis conforme .env.example)

# [ ] Nenhum SECRET em .env.production (apenas público)
# [ ] SUPABASE_SERVICE_ROLE_KEY está APENAS em CI/CD secrets, nunca em código
```

**Status:** ⏳ PENDENTE

---

### 5️⃣ Banco de Dados

```bash
# [ ] Todas as migrações aplicadas
supabase migration list
# Esperado: Todas as 45 migrações em "Success"

# [ ] RLS ativado em todas as tabelas
# (Verificação já feita na auditoria: 40/40 ✅)

# [ ] Backups configurados em Supabase Dashboard
# Verificar: Database → Backups → Automated backups ON

# [ ] Replicação configurada (se redundância desejada)
```

**Status:** ⏳ PENDENTE

---

### 6️⃣ Supabase Configuration

```bash
# [ ] Site URL configurado em Dashboard
# Auth → Providers → Email → Site URL = https://nutrigestao.app

# [ ] Redirect URLs configuradas
# Auth → Providers → Email → Redirect URLs:
  - https://nutrigestao.app/auth/callback
  - https://nutrigestao.app/auth/confirm
  - https://nutrigestao.app/auth/reset-password

# [ ] Email provider configurado (SendGrid/Resend)
# Verificar tokens de autenticação

# [ ] Service Role ativado APENAS em servidor (Vercel)
# SUPABASE_SERVICE_ROLE_KEY em Vercel Secrets

# [ ] Rate limiting Redis endpoint testado
# Teste: redis-cli -u $UPSTASH_REDIS_REST_URL ping
```

**Status:** ⏳ PENDENTE

---

## 📊 MONITORAMENTO E OBSERVABILIDADE

### 7️⃣ Logging e Alertas

```bash
# [ ] CSP violations logging ativado
# Endpoint: POST /api/security/csp-report
# Teste: curl -X POST https://nutrigestao.app/api/security/csp-report \
#   -H "Content-Type: application/json" \
#   -d '{"csp-report":{"document-uri":"test"}}'

# [ ] Rate limit violations logging
# Verificar: Logs mostram 429 responses quando limite é atingido

# [ ] Audit log ativado para mutações de dados
# Verificar: Tabela `audit_log` registra todas as alterações

# [ ] Error tracking (Sentry/similar)
[ ] SENTRY_DSN configurado em produção
[ ] Sentry dashboard monitorando errors
```

**Status:** ⏳ PENDENTE

---

### 8️⃣ Alertas Críticos

```bash
# [ ] Alerta para:
[ ] CSP violations (qualquer violation = alerta)
[ ] Rate limit hits (pico de 429 responses)
[ ] Database connection failures
[ ] Auth failures (múltiplas tentativas falhadas)
[ ] API response time > 1000ms
[ ] Error rate > 1%

# [ ] Canal de alertas configurado
[ ] Slack webhook para #security
[ ] Email para security@nutrigestao.app
[ ] SMS para on-call engineer (opcional)
```

**Status:** ⏳ PENDENTE

---

## 📦 DEPLOYMENT

### 9️⃣ Plataforma de Hosting

**Suposição:** Vercel (recomendado para Next.js)

```bash
# [ ] Projeto conectado ao GitHub
# [ ] Build settings corretos:
  - Framework Preset: Next.js
  - Build Command: npm run build
  - Output Directory: .next

# [ ] Environment variables em Vercel Dashboard:
[ ] NEXT_PUBLIC_SUPABASE_URL
[ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
[ ] UPSTASH_REDIS_REST_URL
[ ] UPSTASH_REDIS_REST_TOKEN
[ ] SUPABASE_SERVICE_ROLE_KEY (⚠️ SENSITIVE)

# [ ] Domains configurado:
[ ] nutrigestao.app (domínio principal)
[ ] www.nutrigestao.app (redirecionador)

# [ ] HTTPS/TLS ativado (automático no Vercel)

# [ ] Auto-deploy ativado (push para main = deploy)
```

**Status:** ⏳ PENDENTE

---

### 🔟 Passos de Deploy

```bash
# 1. [ ] Fazer commit de todas as mudanças
git add .
git commit -m "Security: Fix critical vulnerabilities

- Remove unsafe CSP directives
- Patch Hono package vulnerabilities
- Implement HTML sanitization with DOMPurify
- Add rate limiting to auth endpoints
- Add file upload validation

Co-Authored-By: Security Agent <security@nutrigestao.app>"

# 2. [ ] Push para main branch
git push origin main
# Vercel irá fazer deploy automaticamente

# 3. [ ] Monitorar deploy em Vercel Dashboard
# Esperado: Build succeeds, deployment completes

# 4. [ ] Verificar produção após 5 minutos
curl https://nutrigestao.app
# Esperado: 200 OK, CSP headers presentes

# 5. [ ] Rodar smoke tests em produção
npm run test:smoke
# (se disponível)
```

**Status:** ⏳ PENDENTE

---

## 🔍 PÓS-DEPLOY VERIFICATION

### 1️1️⃣ Health Checks (Primeiros 30 minutos)

```bash
# [ ] Homepage carrega
curl -I https://nutrigestao.app
# Esperado: 200 OK

# [ ] Login page acessível
curl -I https://nutrigestao.app/auth/login
# Esperado: 200 OK

# [ ] API endpoints respondendo
curl https://nutrigestao.app/api/health
# Esperado: 200 OK (se disponível)

# [ ] Database conexão OK
# Verificar: Supabase Dashboard → Status page

# [ ] CSP headers corretos
curl -I https://nutrigestao.app | grep CSP
# Esperado: script-src 'self' (sem unsafe)

# [ ] Rate limiting funcional
# Simular múltiplas tentativas de login
# Esperado: 5ª tentativa = 429

# [ ] No errors em logs
# Verificar: Vercel Logs e Sentry dashboard
```

**Status:** ⏳ PENDENTE

---

### 1️2️⃣ Functional Tests (Primeira hora)

```bash
# [ ] Usuário pode fazer login
[ ] Email/password login funciona
[ ] 2FA (TOTP) funciona
[ ] Magic link funciona

# [ ] CRUD operations funcionam
[ ] Criar paciente
[ ] Editar paciente
[ ] Deletar paciente

# [ ] Upload de arquivos funciona
[ ] Upload de foto de checklist
[ ] Validação de MIME type funciona

# [ ] Geração de contratos funciona
[ ] Gerar contrato funciona
[ ] Sanitização de HTML funciona (sem XSS)

# [ ] Rate limiting bloqueia abuso
[ ] 6ª tentativa de login = 429
```

**Status:** ⏳ PENDENTE

---

### 1️3️⃣ Security Verification (Antes de comunicado público)

```bash
# [ ] OWASP Top 10 2025 compliance
# Verificação rápida de:
[ ] A01: RLS ativado ✓
[ ] A02: CSP headers corretos ✓
[ ] A03: npm audit 0 vulnerabilities ✓
[ ] A05: TLS 1.2+ ✓
[ ] A07: Rate limiting ✓

# [ ] Penetration testing
[ ] Tentar IDOR (trocar IDs de outro usuário)
# Esperado: 403 Forbidden

[ ] Tentar SQL injection
# Esperado: Input sanitizado, query falha normalmente

[ ] Tentar XSS em input
# Esperado: Input escapado, nunca executa

[ ] Tentar brute force de login
# Esperado: Bloqueado após 5 tentativas

# [ ] Audit log verificado
# Supabase Database → audit_log table
# Esperado: Logs de todas as ações de usuário
```

**Status:** ⏳ PENDENTE

---

## 📋 DOCUMENTAÇÃO

### 1️4️⃣ Runbooks e Documentação

```bash
# [ ] Deployment runbook criado
# Documento: DEPLOYMENT-RUNBOOK.md
# Conteúdo:
  - Passo a passo de deploy
  - Rollback procedure
  - Monitoramento durante deploy
  - Rollback checklist

# [ ] Incident response plan
# Documento: INCIDENT-RESPONSE.md
# Conteúdo:
  - Como responder a segurança incidents
  - LGPD breach notification (72h ANPD)
  - Contato de resposta
  - Escalation procedure

# [ ] Architecture documentation atualizado
# Verificar: ARCHITECTURE.md reflete produção

# [ ] API documentation atualizado
# Verificar: README.md tem guias de setup
```

**Status:** ⏳ PENDENTE

---

### 1️5️⃣ Comunicação

```bash
# [ ] Stakeholders notificados
[ ] Product manager
[ ] Equipa de suporte
[ ] Clientes (opcional, se launch público)

# [ ] Status page atualizado
[ ] Indicar: "NutriGestão is LIVE 🎉"

# [ ] Documentação de usuário pronta
[ ] FAQ criado
[ ] Tutorial de login/primeiro uso
```

**Status:** ⏳ PENDENTE

---

## ⚠️ LISTA DE ITEMS EM BACKLOG (Não críticos para launch)

| Item | Prioridade | Deadline |
|------|-----------|----------|
| CAPTCHA após falhas de login | Média | Próximo sprint |
| Correlation IDs em logs | Média | Próximo sprint |
| Plano de incidente LGPD documentado | Alta | 2 semanas |
| DPO designado | Regulatório | 1 mês |
| CI/CD pipeline completo | Média | Próximo sprint |
| Dependabot automático | Baixa | Próximo mês |

---

## 🎯 RESUMO PRÉ-DEPLOY

### ✅ Já Completo
- [x] Código corrigido (todas as vulns críticas)
- [x] Testes de segurança passaram
- [x] npm audit = 0 vulnerabilities
- [x] Auditoria completa realizada

### ⏳ Pendente (Esta Semana)
- [ ] Build e testes finais
- [ ] Configuração de ambiente produção
- [ ] Setup de monitoring/alerting
- [ ] Verificação pós-deploy

### 📋 Checklist Resumido (20 min)

```bash
# 1. Testar build
npm run build && npm run test:rls

# 2. Verificar segurança
npm audit --omit=dev
curl -I https://staging.nutrigestao.app | grep CSP

# 3. Deploy
git push origin main
# Aguardar Vercel deploy (5-10 min)

# 4. Smoke tests
curl https://nutrigestao.app
# Login, CRUD, upload

# 5. Monitor
# Verificar Sentry/logs por 30 min
```

---

## 📞 Contatos de Emergência

```
Segurança:     security@nutrigestao.app
On-call:       devops@nutrigestao.app
Product:       product@nutrigestao.app
CEO:           ceo@nutrigestao.app
```

---

**Próximo passo:** Executar a seção "PRÉ-DEPLOY CRÍTICO" acima antes de qualquer push para produção.

**Estimated time to complete:** 2-3 horas

