# Story 11.6: Notificações Push/Email Transversais

## Contexto

Stories 11.1–11.5 implementaram segurança, LGPD compliance, e auditoria. Story 11.6 implementa o sistema de notificações transversais (cross-cutting) que alimenta a jornada crítica do usuário: o **dashboard matinal com alertas contextualizados**.

A jornada ideal do PRD é: Maria acorda, recebe notificação push matinal com resumo: "Bom dia Maria! Hoje: 2 visitas técnicas, 1 consulta particular. Atenção: checklist vence em 3 dias. Pagamento pendente há 10 dias."

Story 11.6 cria:
1. **Event Pipeline:** Sistema de eventos internos (visit_scheduled, financial_alert, portaria_updated, etc.)
2. **Notification Service:** Compila dados de múltiplas tabelas (visitas, alertas, consentimentos) em mensagens contextualizadas
3. **Multi-channel Delivery:** Push (web) + Email para profissionais
4. **Preference Management:** Profissional controla quais notificações recebe e como
5. **Audit Trail:** Todas as notificações registadas em `audit_log` com evidence para compliance

## Objetivo

Após Story 11.6, o profissional será capaz de:
- Receber **notificações push** (browser/web) e **email** sobre eventos relevantes
- Ver um **Centro de Notificações** com histórico (últimas 30 dias)
- **Gerenciar preferências:** escolher quais tipos de notificação receber
- Consentir/revogar notificações (LGPD Art. 7 — informação clara)
- Profissional recebe sumário diário composto por:
  - **Agenda:** Visitas técnicas, consultas particulares agendadas para hoje
  - **Alertas regulatórios:** Portarias atualizadas, checklists vencendo
  - **Pendências financeiras:** Pagamentos vencidos, próximos a vencer
  - **Atualizações de dados:** Pacientes novos, consentimentos revogados

## Stack & Convenções

- **Framework:** Next.js 15 App Router, TypeScript strict
- **Styling:** Tailwind CSS + shadcn/ui (Base UI)
- **Auth:** @supabase/ssr (server-side session)
- **Database:** Supabase PostgreSQL com RLS
- **Email:** Resend (já implementado em 4.9 e 11.4)
- **Push Notifications:** Firebase Cloud Messaging (FCM) para web
- **Message Queue:** Async processing via pg_notify ou Inngest (background jobs)
- **Rota do módulo:**
  - `app/(app)/notificacoes/` — Centro de Notificações
  - `app/(app)/configuracoes/notificacoes/` — Preferências

## Requisitos Funcionais

- **FR66:** Sistema envia notificações push/email ao profissional sobre eventos relevantes (agenda do dia, alertas regulatórios, pendências financeiras, atualizações de portarias)
- **FR16 (reuse):** Sistema notifica profissionais quando um checklist regulatório é atualizado (portarias)
- **Rastreabilidade:** Todas as notificações registadas em `audit_log` com:
  - `operation: 'NOTIFICATION_SENT' | 'NOTIFICATION_OPENED' | 'NOTIFICATION_PREFERENCE_CHANGED'`
  - `channel: 'push' | 'email'`
  - `event_type: 'visit_scheduled' | 'financial_alert' | 'portaria_update' | ...`
  - `user_id`, `professional_id` (tenant isolation)
- **Consentimento:** Profissional pode revogar notificações por tipo (LGPD)
- **Preference Engine:** Suportar 3 níveis de preferência:
  - 1 = Receber (ativo)
  - 0 = Não receber (revogado)
  - -1 = Notifique-me apenas em caso de urgência (conditional)
- **Garantias de Entrega:** Retry logic para emails falhados (até 3 tentativas)
- **Rate Limiting:** Máximo 1 notificação push por tipo por hora por usuário (evitar spam)
- **Isolamento Multi-tenant:** Cada profissional vê apenas notificações relacionadas aos seus dados

## Critérios de Aceitação

### 1. Estrutura de Dados — Notificações

**Given** banco de dados vazio  
**When** migração executada  
**Then** tabelas criadas:

#### Tabela: `notifications`
```sql
- id UUID (primary key)
- user_id UUID (foreign key → auth.users, multi-tenant)
- event_type VARCHAR (visit_scheduled, financial_alert, portaria_update, consent_revoked, etc.)
- channel VARCHAR ('push' | 'email' | 'both')
- title VARCHAR
- body TEXT
- data JSONB (contexto: patient_id, visit_id, amount, etc.)
- read_at TIMESTAMP (null = não lido)
- created_at TIMESTAMP (default now())
- sent_at TIMESTAMP (null = ainda não entregue)
- status VARCHAR ('pending' | 'sent' | 'failed')
- error_message TEXT (se failed)
- RLS: Apenas profissional acessa próprias notificações
```

#### Tabela: `notification_preferences`
```sql
- id UUID (primary key)
- user_id UUID (foreign key → auth.users, multi-tenant)
- event_type VARCHAR (visit_scheduled, financial_alert, portaria_update, consent_revoked, etc.)
- enabled BOOLEAN (default true)
- push_enabled BOOLEAN (default true)
- email_enabled BOOLEAN (default true)
- urgency_level INT (1 = normal, 2 = urgente, 3 = crítico)
- quiet_hours_start TIME (ex: 22:00)
- quiet_hours_end TIME (ex: 08:00)
- created_at TIMESTAMP
- updated_at TIMESTAMP
- RLS: Apenas proprietário acessa/edita
- Constraint: unique(user_id, event_type)
```

#### Tabela: `fcm_tokens` (Firebase Cloud Messaging)
```sql
- id UUID (primary key)
- user_id UUID (foreign key → auth.users)
- token TEXT (JWT token from Firebase)
- device_name VARCHAR (ex: "Chrome Desktop")
- created_at TIMESTAMP
- last_used_at TIMESTAMP
- RLS: Apenas proprietário
```

**And** RLS policies garantem isolamento multi-tenant:
```sql
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
```

### 2. Event Types & Triggers

**Given** notificação_preferences e sistema de eventos  
**When** evento ocorre na plataforma  
**Then** trigger automático dispara notificação:

| Event Type | Trigger | Fields | Example |
|------------|---------|--------|---------|
| `visit_scheduled` | Nova visita criada em `visits.scheduled_at` | `{ visit_id, establishment, date, time }` | "Visita agendada para Escola A — 30/03/2026 às 10h" |
| `visit_reminder` | 24h antes de visita | `{ visit_id, establishment, date }` | "Lembrete: Visita em Escola A amanhã às 10h" |
| `financial_alert` | Pagamento vence em 5 dias / vencido | `{ client_id, amount, due_date }` | "Atenção: Pagamento de Escola A vence em 5 dias (R$800)" |
| `portaria_updated` | Portaria atualizada pelo admin (10-6) | `{ portaria_id, state, category, new_items }` | "Portaria RDC/ANVISA atualizada — novo item obrigatório" |
| `checklist_expiring` | Checklist vence em 3 dias | `{ checklist_id, establishment, due_date }` | "Checklist de Escola A vence em 3 dias" |
| `consent_revoked` | Paciente revoga consentimento (11-3) | `{ patient_id, consent_type }` | "Paciente João revogou consentimento para uso de dados" |
| `patient_new` | Novo paciente adicionado | `{ patient_id, name, establishment }` | "Novo paciente adicionado: Maria Silva (Escola A)" |
| `dsar_request_completed` | DSAR de paciente completado (11-4) | `{ patient_id, format }` | "DSAR de João está pronto para download" |

### 3. Notificação Matinal — Agregação de Eventos

**Given** profissional com notificações enabled  
**When** 08:00 AM seu horário local  
**Then** sistema compila sumário diário:

```
Bom dia Maria! Aqui está seu resumo de hoje (30/03/2026):

📅 AGENDA (2 eventos)
- 10:00: Visita técnica — Escola A
- 14:30: Consulta particular — João Silva

⚠️ ALERTAS (2 itens)
- Checklist de Escola B vence em 3 dias
- Portaria RDC/ANVISA foi atualizada

💰 FINANCEIRO (1 item)
- Pagamento de Escola A vencido há 10 dias (R$800)

Todas as notificações individuais continuam sendo entregues em tempo real.
```

**And** sumário é enviado via push + email

### 4. Centro de Notificações UI

**Given** profissional autenticado acessa `/app/notificacoes/`  
**When** página carrega  
**Then** exibe:

- **Filtros:** Type (visit, financial, portaria, etc.), Read/Unread, Last 7/14/30 days
- **Lista paginada:** Últimas 30 dias, mais recentes primeiro
- **Card por notificação:**
  - Ícone por tipo (📅 visita, 💰 financeiro, ⚠️ alerta, etc.)
  - Título + corpo (truncado em 2 linhas)
  - Data + hora
  - Badge de "Nova" se não lido
  - Botão "Marcar como lido"
  - Botão "Ver detalhes" → modal/drawer com contexto completo
- **Ações em massa:** Marcar tudo como lido, limpar histórico

### 5. Preferências de Notificação

**Given** profissional acessa `/app/configuracoes/notificacoes/`  
**When** página carrega  
**Then** exibe tabela:

| Event Type | Push | Email | Quiet Hours | Urgency | Ação |
|------------|------|-------|-------------|---------|------|
| Visita agendada | ✓ | ✓ | 22h–8h | Normal | Editar |
| Alerta regulatório | ✓ | ✓ | Não | Crítico | Editar |
| Pendência financeira | ✓ | ✓ | Não | Urgente | Editar |
| Novo paciente | ☐ | ✓ | — | Normal | Editar |
| Consentimento revogado | ✓ | ☐ | Não | Crítico | Editar |

**And** cada linha clicável abre modal para:
- Enable/Disable checkbox (push, email)
- Slider para urgency (Normal / Urgente / Crítico)
- Time picker para quiet_hours_start/end (não enviar entre X:XX e Y:YY)

**And** mudança salva imediatamente (Server Action)

### 6. Entrega Push (Web/Firebase)

**Given** profissional com browser moderno  
**When** acessa plataforma pela primeira vez  
**Then** JS init Firebase e pede permissão:  
  "NutriGestão gostaria de enviar notificações"

**And** se permitir:
- Captura FCM token
- Armazena em `fcm_tokens` table
- Envia notificação test: "Notificações ativadas com sucesso!"

**And** para cada notificação:
- Verifica `notification_preferences` do usuário
- Se push_enabled = true e fora de quiet_hours
- Envia via Firebase Cloud Messaging
- Registar em `audit_log` com status = 'sent'

### 7. Entrega Email

**Given** notificação com email_enabled = true  
**When** fora de quiet_hours  
**Then** Server Action dispara:

```
POST /api/send-notification-email
{
  userId: "...",
  eventType: "visit_scheduled",
  title: "Visita agendada para Escola A",
  body: "30/03/2026 às 10:00",
  data: { visit_id, establishment_id, ... }
}
```

**And** email renderizado com template HTML + branding
**And** inclui link para Centro de Notificações
**And** se entrega falhar:
- Retry automaticamente em 5min, 15min, 1h
- Após 3 falhas, status = 'failed', error_message registado

### 8. Rate Limiting & Spam Prevention

**Given** notificação_preferences com enabled = true  
**When** mesmo tipo de notificação acionado múltiplas vezes  
**Then** aguarda 60min antes de enviar novamente ao mesmo usuário

**Exception:** Eventos críticos (pagamento vencido, consentimento revogado) ignoram rate limit

### 9. Consentimento & Revogação (LGPD)

**Given** profissional acessa `/app/configuracoes/notificacoes/`  
**When** desativa notificação de tipo X  
**Then** registro em `audit_log`:
```
{
  operation: 'NOTIFICATION_PREFERENCE_CHANGED',
  table_name: 'notification_preferences',
  record_id: preference_id,
  old_values: { event_type: 'visit_scheduled', push_enabled: true },
  new_values: { event_type: 'visit_scheduled', push_enabled: false },
  timestamp: now()
}
```

**And** profissional pode revogar em qualquer altura (revogação instantânea)

## Tarefas de Implementação

### Backend / Banco de Dados

- [ ] **Migração SQL:** Criar tabelas `notifications`, `notification_preferences`, `fcm_tokens`
  - RLS policies para isolamento multi-tenant
  - Indices em `(user_id, created_at)` para performance
  - Trigger para auto-registar em `audit_log`

- [ ] **Server Action:** `recordNotification(userId, eventType, title, body, data)`
  - Validar user_id contra auth (RLS)
  - Buscar preferências em `notification_preferences`
  - Se enabled, inserir em `notifications` com status = 'pending'
  - Retornar notificationId

- [ ] **Server Action:** `sendNotificationPush(notificationId)`
  - Buscar notification + user + preferência
  - Buscar FCM token em `fcm_tokens`
  - Enviar via Firebase Admin SDK
  - Atualizar `notifications.status`, `notifications.sent_at`
  - Registar em `audit_log`

- [ ] **Server Action:** `sendNotificationEmail(notificationId)`
  - Buscar notification + profissional email
  - Renderizar template HTML customizado
  - Enviar via Resend
  - Retry logic (3 tentativas com backoff exponencial)
  - Registar em `audit_log`

- [ ] **Server Action:** `updateNotificationPreference(eventType, { push_enabled, email_enabled, urgency_level, quiet_hours_start, quiet_hours_end })`
  - Validar user_id contra auth
  - Upsert em `notification_preferences`
  - Registar em `audit_log` com old_values/new_values

- [ ] **Server Action:** `markNotificationAsRead(notificationId)`
  - Atualizar `notifications.read_at = now()`
  - Registar em `audit_log`

- [ ] **Server Action:** `registerFcmToken(token, deviceName)`
  - Validar token format
  - Upsert em `fcm_tokens` (prevent duplicates)
  - Registar em `audit_log`

- [ ] **Database Function/Trigger:** Para cada event_type (visit_scheduled, financial_alert, etc.)
  - Trigger on `visits` table: on insert, call `recordNotification(...)`
  - Similar para `payments`, `portarias`, etc.

- [ ] **Cron Job ou Event Loop:** Sumário matinal
  - Executar 08:00 AM cada dia
  - Para cada profissional com notificações ativas:
    - Compilar eventos das últimas 24h
    - Renderizar sumário formatado
    - Disparar `sendNotificationPush()` + `sendNotificationEmail()`

### Frontend

- [ ] **Componentes:**
  - `components/notifications/notification-center.tsx` — Listagem paginada
  - `components/notifications/notification-card.tsx` — Card individual
  - `components/notifications/notification-detail-modal.tsx` — Detalhe completo
  - `components/notifications/preference-row.tsx` — Linha de preferência
  - `components/notifications/quiet-hours-input.tsx` — Time picker
  - `components/notifications/urgency-slider.tsx` — Slider de urgência

- [ ] **Páginas:**
  - `app/(app)/notificacoes/page.tsx` — Centro de Notificações
  - `app/(app)/configuracoes/notificacoes/page.tsx` — Preferências

- [ ] **Firebase Client SDK:**
  - `lib/firebase/init.ts` — Inicializar Firebase (config.js)
  - `lib/firebase/register-fcm.ts` — Pedir permissão + registar token
  - `lib/firebase/message-handler.ts` — Listener para mensagens recebidas

- [ ] **Notificações Toast/Browser:**
  - Capturar mensagens do Firebase
  - Exibir toast notification no browser (usando shadcn/toast)
  - Ao clicar, navegar para Centro de Notificações

### Segurança & Compliance

- [ ] **RLS:** Validar que profissional A não acessa notificações de profissional B
- [ ] **Rate Limiting:** Máx 1 notificação push por tipo por hora (implementar em Server Action)
- [ ] **LGPD:** Profissional pode revogar notificações a qualquer momento
- [ ] **Audit Trail:** Todas as operações (sent, read, preference_changed) registadas
- [ ] **Email Security:** Sanitizar `title` e `body` antes de renderizar em HTML
- [ ] **FCM Token Security:** Nunca expor token em logs; usar HTTPS sempre

## Arquivos a Criar/Modificar

### Novas Migrações
- `supabase/migrations/20260410_notifications.sql`

### Novos Tipos TypeScript
- `lib/types/notification.ts` — Notification, NotificationPreference, FcmToken types
- `lib/types/notification-event.ts` — EventType union, Event payload types

### Novos Server Actions
- `lib/actions/notification.ts` — recordNotification, sendPush, sendEmail, updatePreference, markAsRead, registerFcmToken

### Novos Componentes
- `components/notifications/notification-center.tsx`
- `components/notifications/notification-card.tsx`
- `components/notifications/notification-detail-modal.tsx`
- `components/notifications/preference-row.tsx`
- `components/notifications/quiet-hours-input.tsx`
- `components/notifications/urgency-slider.tsx`
- `components/notifications/fcm-initializer.tsx` — (mounted no layout root)

### Novas Páginas
- `app/(app)/notificacoes/page.tsx`
- `app/(app)/configuracoes/notificacoes/page.tsx`

### Firebase Config & Client
- `lib/firebase/init.ts`
- `lib/firebase/register-fcm.ts`
- `lib/firebase/message-handler.ts`
- `public/firebase-messaging-sw.js` — Service Worker para background messages

### Email Templates
- `lib/email/templates/notification-email.ts` — Template React/HTML

### API Routes (opcional, se não usar Server Actions)
- `app/api/notifications/send-push/route.ts`
- `app/api/notifications/send-email/route.ts`

### Atualizações a Arquivos Existentes
- `app/(app)/layout.tsx` — Mount FCMInitializer component
- `lib/actions/visitas.ts` — Add call to `recordNotification()` after visit creation
- `lib/actions/payments.ts` — Add call to `recordNotification()` for financial alerts
- `lib/actions/checklists.ts` — Add call to `recordNotification()` for checklist expiry
- Environment variables `.env.local`:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `FIREBASE_ADMIN_SDK_KEY` (server-side only)

## Definição de Pronto (DoD)

- [ ] Código TypeScript sem erros (`npm run type-check`)
- [ ] RLS validado: Nenhum tenant acessa dados de outro
- [ ] Todas as operações registadas em `audit_log` com `operation`, `table_name`, `record_id`, `old_values`, `new_values`
- [ ] Critérios de Aceitação (Given/When/Then) atendidos
- [ ] Firebase Cloud Messaging integrado e testado (notificações chegam)
- [ ] Email templates renderizam corretamente em Resend preview
- [ ] Rate limiting funciona (máx 1 notificação por tipo por hora)
- [ ] Preferências de usuário respeitadas (push_enabled, email_enabled, quiet_hours)
- [ ] Notificação matinal compila corretamente (sumário de 24h)
- [ ] Centro de Notificações carrega rápido (< 2s com pagination)
- [ ] Sprint status atualizado para `done`
- [ ] Documentação de eventos atualizada em `README.md` ou wiki
