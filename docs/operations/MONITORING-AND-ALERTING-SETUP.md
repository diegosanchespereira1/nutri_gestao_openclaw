# Monitoramento e Alertas — NutriGestão SaaS Production
**Data:** 10 de Abril de 2026  
**Status:** Pronto para configurar

---

## 🎯 Visão Geral

Sistema completo de monitoramento e alerting para NutriGestão em produção, cobrindo:
- **Performance:** Velocidade de resposta, uso de recursos
- **Segurança:** CSP violations, rate limit hits, auth failures
- **Disponibilidade:** Uptime, database connection, API health
- **Compliance:** LGPD audit logs, data access logs
- **Negócio:** Usuários ativos, erros críticos, conversões

---

## 🔧 Ferramentas Recomendadas

### 1. Error Tracking — **Sentry** ✅

**Porquê:** Rastrear exceções em produção em tempo real.

**Setup:**

```bash
# 1. Criar conta em https://sentry.io
# 2. Criar projeto Next.js
# 3. Copiar SENTRY_DSN

# 4. Instalar SDK
npm install @sentry/nextjs
npm install --save-exact @sentry/cli

# 5. Configurar em next.config.ts (já parcialmente em _security-audit-report.md)
# TODO: Arquivo sentry.client.config.ts + sentry.server.config.ts

# 6. Adicionar env vars
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_AUTH_TOKEN=sntrys_xxxxx (para releases)

# 7. Testar
# Simular erro: throw new Error("Test error")
# Verificar aparece em Sentry Dashboard em 5 segundos
```

**Alertas Sentry:**
- ✅ Erro crítico (5xx) → Slack #security
- ✅ Taxa de erro > 1% → Email
- ✅ Performance regression > 20% → Slack #perf

---

### 2. Logs & Analytics — **Vercel Analytics** ✅ (Automático)

**Já incluído no Vercel:**

```
Vercel Dashboard → Projeto NutriGestão → Analytics
```

**Métricos visíveis:**
- Response time (p50, p95, p99)
- Page views, unique visitors
- Browser/Device breakdown
- Geo location heatmap

**Setup:** Nenhum — automático!

---

### 3. Uptime Monitoring — **Pingdom** ou **StatusPage**

**Porquê:** Monitorar se o site está online 24/7.

**Setup Pingdom:**

```bash
# 1. Criar conta https://www.pingdom.com
# 2. Criar check para https://nutrigestao.app
# 3. Configurar alertas:
   - Down: SMS + Email + Slack
   - Slow (> 2s): Slack #perf

# 4. Frequência: A cada 1 minuto
# 5. Localizações: 5+ cidades globais
```

**Setup StatusPage.io** (opcional):

```
# Status page pública em status.nutrigestao.app
# Mostra situação do serviço aos clientes
```

---

### 4. Database Monitoring — **Supabase Dashboard** ✅

**Já incluído no Supabase:**

```
Supabase Dashboard → Projeto → Database → Monitoring
```

**Métricas automáticas:**
- Conexões ativas
- Query performance
- Tamanho do banco
- Backups automáticos

**Setup:**
```bash
# Alertas no Supabase Dashboard:
# 1. Ir para Settings → Alerts
# 2. Ativar:
   - Database CPU > 80%
   - Database connections > 90
   - Backup failures
```

---

### 5. Rate Limiting Monitoring — **Upstash Dashboard**

**Já integrado no código:**

```
Upstash Dashboard → Redis Console
```

**Monitoramento:**
```bash
# 1. Ver hits no Redis
# 2. Monitorar latência
# 3. Verificar se quota está OK

# Limites (consultar Upstash):
# - 10K requisições/dia (grátis)
# - $ por milhão extras
```

**Alert no Slack:**
```
Se rate limit hits > 100/min:
1. Possível ataque em andamento
2. Verificar logs de auth
3. Escalar para segurança
```

---

### 6. Security & CSP Violations — **Custom Endpoint** ✅

**Já implementado:**

```
POST /api/security/csp-report
```

**Monitoramento:**
```bash
# 1. Ir para Vercel Logs → Filter: "/api/security/csp-report"
# 2. Cada CSP violation registada
# 3. Se houver violations:
   - Investigar fonte do erro
   - Pode indicar XSS attempt
```

**Alert:**
```
CSP violations > 5 por hora:
Slack #security → "Possível ataque XSS detectado"
```

---

## 📊 Dashboards Recomendados

### Dashboard 1: Operações (Vercel + Supabase)

```
Vercel Dashboard:
├── Build times
├── Deployments (histórico)
├── Request latency (p50/p95/p99)
├── Error rate
└── Traffic (requests/min)

Supabase Dashboard:
├── Database connections
├── Query performance
├── Storage usage
├── Auth logins
└── API calls
```

### Dashboard 2: Segurança (Sentry + Custom)

```
Sentry Dashboard:
├── Error timeline
├── Top errors
├── Performance metrics
└── Release health

Custom (Vercel Logs):
├── CSP violations
├── Rate limit hits (429s)
├── Auth failures
└── LGPD audit logs
```

### Dashboard 3: Negócio (Analytics)

```
Vercel Analytics:
├── Unique users (DAU)
├── Page views
├── Most accessed pages
├── Geographic distribution
└── Device breakdown
```

---

## 🔔 Plano de Alertas

### Severidade 1 — Crítica (Notificar imediatamente)

```
| Evento | Threshold | Canal | Ação |
|--------|-----------|-------|------|
| Error rate | > 5% | SMS + Slack | Escalar VP Eng |
| Database down | Any | SMS + Slack | Rollback ou failover |
| Auth failures | > 10/min | Slack | Investigar ataque |
| RLS bypass attempt | Any | Email + Slack | Alerta segurança |
| LGPD breach | Any | SMS + Email + Slack | Legal notification (72h ANPD) |
```

### Severidade 2 — Alta (Notificar em 1 hora)

```
| Evento | Threshold | Canal | Ação |
|--------|-----------|-------|------|
| Response time | > 2s p95 | Slack #perf | Investigar bottleneck |
| CSP violations | > 5/hora | Slack #security | Audit código |
| Rate limit hits | > 100/min | Slack #security | Possível DDoS |
| Database CPU | > 80% | Slack #perf | Scale up ou otimizar queries |
| Disk space | > 85% | Slack #ops | Cleanup ou scale |
```

### Severidade 3 — Média (Email diária)

```
| Evento | Threshold | Canal | Ação |
|--------|-----------|-------|------|
| Backup failed | Any | Email | Verificar próxima backup |
| Deploy time | > 15min | Slack #ops | Investigar build lento |
| 404 errors | > 100/dia | Email | Atualizar links |
| Unused storage | > 50% | Email | Cleanup antigos |
```

---

## 🛠️ Setup Passo a Passo

### Semana 1: Setup Básico

```
[ ] Dia 1 — Sentry
    - Criar conta
    - Instalar SDK
    - Configurar env vars
    - Testar com erro
    
[ ] Dia 2 — Alertas Sentry
    - Configurar Slack integration
    - Setup email alerts
    - Test notifications
    
[ ] Dia 3 — Uptime Monitoring
    - Criar conta Pingdom
    - Setup check para nutrigestao.app
    - Configurar SMS alerts
    
[ ] Dia 4 — Database Alerts
    - Ativar Supabase monitoring
    - Setup Supabase alerts
    - Configurar email
    
[ ] Dia 5 — Testes
    - Simular erro → verificar Sentry notificação
    - Simular downtime → verificar Pingdom alert
    - Simular rate limit hit → verificar Slack
```

### Semana 2: Dashboards & Otimização

```
[ ] Criar dashboards em Vercel
[ ] Criar dashboards em Supabase
[ ] Setup Slack integrations para todos
[ ] Configurar on-call rotation (PagerDuty)
[ ] Teste de incidente simulado
[ ] Documentação de runbooks
```

---

## 📋 Checklist de Alertas

### Antes de Lançar (Validação)

```
[ ] Sentry está capturando erros
[ ] Notificações Slack funcionam
[ ] Pingdom está monitorando uptime
[ ] Supabase alerts configurados
[ ] Rate limit tracking visível
[ ] CSP violation endpoint funcional
[ ] Equipa sabe como responder a alerta
```

### Diário (Primeira semana)

```
[ ] Verificar Sentry — nenhum erro crítico
[ ] Verificar analytics — tráfego normal
[ ] Verificar database — performance OK
[ ] Verificar logs — CSP violations = 0
[ ] Verificar uptime — 100%
```

### Semanal

```
[ ] Review de errors top 10
[ ] Performance review (p95 latência)
[ ] Security review (CSP violations)
[ ] Capacity review (database/storage)
[ ] LGPD audit log review
```

### Mensal

```
[ ] Relatório de uptime (meta: 99.9%)
[ ] Relatório de performance
[ ] Relatório de segurança
[ ] Custo de infraestrutura review
[ ] Processo de alertas — ainda eficaz?
```

---

## 💰 Estimativa de Custos

| Ferramenta | Plano | Custo/Mês | Justificativa |
|-----------|------|-----------|---------------|
| Sentry | Growth | $29 | Erro tracking, 5K events |
| Upstash Redis | Pro | $25 | Rate limiting (10K req/dia) |
| Pingdom | Starter | $10 | Uptime monitoring |
| StatusPage | Free | $0 | Status page pública |
| Vercel | Pro | $20 | Faster deployments |
| **Total** | | **~$84/mês** | ~$1000/ano |

---

## 📱 Contatos de Resposta

```
Segurança (Critical):
├── Security Lead: security@nutrigestao.app
├── VP Engineering: vp@nutrigestao.app
└── CEO (se breach): ceo@nutrigestao.app

Performance (High):
├── DevOps: devops@nutrigestao.app
└── Backend Lead: backend@nutrigestao.app

General (Medium):
├── Product: product@nutrigestao.app
└── Ops: ops@nutrigestao.app

On-Call Rotation (24/7):
├── Use PagerDuty ou Slack workflow
├── Escalar conforme severidade
└── SLA: 15min para crítica, 1h para alta
```

---

## 🚀 Próximos Passos

**Imediatamente após deploy:**

1. [ ] Sentry setup (2 horas)
2. [ ] Uptime monitoring (30 min)
3. [ ] Slack integrations (1 hora)
4. [ ] Testar tudo (1 hora)

**Próxima semana:**

1. [ ] Dashboards
2. [ ] On-call rotation
3. [ ] Runbooks de resposta
4. [ ] Teste de incidente

---

## 📞 Links Úteis

```
Sentry:       https://sentry.io/organizations/nutrigestao/
Vercel:       https://vercel.com/dashboard/nutrigestao
Supabase:     https://supabase.com/dashboard/nutrigestao
Upstash:      https://console.upstash.com/
Pingdom:      https://my.pingdom.com/
StatusPage:   https://status.nutrigestao.app/
```

---

**Responsável:** DevOps/Security  
**Aprovado por:** VP Engineering  
**Data de ativação:** 10 de Abril de 2026 (imediatamente após deploy)

