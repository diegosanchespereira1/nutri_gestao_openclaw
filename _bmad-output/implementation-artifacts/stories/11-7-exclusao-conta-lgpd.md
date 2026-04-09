# Story 11.7: Pedido de Exclusão de Conta e Dados (LGPD Art. 18)

## Contexto

Stories 11.1–11.6 implementaram segurança, LGPD compliance, auditoria, consentimentos e notificações. Story 11.7 implementa o **direito ao esquecimento** (Right to be Forgotten) — LGPD Art. 18 — que garante ao titular o direito de solicitar a exclusão completa de sua conta e dados pessoais.

O diferencial da Story 11.7 é a **gestão de retenção legal**: embora o usuário possa solicitar exclusão imediata, dados de saúde (pacientes, visitas técnicas, relatórios) DEVEM ser retidos por **5 anos** conforme obrigações legais. A story implementa:

1. **Request de Exclusão:** Profissional solicita exclusão via modal com confirmação dupla
2. **Período de Retenção:** Dados são soft-deleted (status='deleted') por 5 anos
3. **Auditoria:** Tentativa de acesso a conta deletada é registada
4. **Notificação:** Email de confirmação com link para cancelar request
5. **LGPD Compliance:** Relatório de retenção, períodos de espera, documentação

## Objetivo

Após Story 11.7, o profissional será capaz de:
- Acessar uma página "Deletar Minha Conta" em `/app/configuracoes/deletar-conta/`
- Clicar "Solicitar Exclusão" e confirmar via dupla verificação:
  - Confirmação textual: "Entendo que meus dados serão retidos por 5 anos conforme lei"
  - Email de confirmação com link (válido por 24h)
- Receber email explicando:
  - O que será deletado imediatamente (dados do profissional)
  - O que será retido por 5 anos (dados de pacientes por obrigações legais)
  - Como cancelar a solicitação (link no email válido por 24h)
- Visualizar status da exclusão (pendente, confirmado, completado)
- Sistema cumprir LGPD Art. 18 com retenção legal documentada

## Stack & Convenções

- **Framework:** Next.js 15 App Router, TypeScript strict
- **Styling:** Tailwind CSS + shadcn/ui (Base UI)
- **Auth:** @supabase/ssr (server-side session)
- **Database:** Supabase PostgreSQL com RLS
- **Email:** Resend (já implementado)
- **Rota do módulo:** `app/(app)/configuracoes/deletar-conta/`
- **Background Jobs:** Supabase pg_notify ou cron (PostgreSQL)

## Requisitos Funcionais

- **FR69:** Profissional pode solicitar exclusão completa da sua conta e dados pessoais conforme LGPD Art. 18, respeitando obrigações legais de retenção
- **LGPD Art. 18:** Direito ao esquecimento com documentação de retenção legal
- **Retenção Legal:** Dados de saúde (pacientes, visitas) retidos por 5 anos mesmo após exclusão
- **Confirmação Dupla:** Textual + email para evitar exclusão acidental
- **Cancelamento:** Possibilidade de cancelar request dentro de 24h
- **Auditoria:** Tentativas de acesso a conta deletada são registadas
- **Email:** Confirmação de solicitação com timeline clara
- **Soft-delete:** Nenhuma exclusão irreversível antes do período de retenção expirar
- **Isolamento Tenant:** Um tenant não acessa dados de outro mesmo após exclusão

## Critérios de Aceitação

### 1. Interface de Solicitação

**Given** profissional autenticado acessa `/app/configuracoes/deletar-conta/`  
**When** página carrega  
**Then** exibe:

- **Aviso vermelho:** "Esta ação é irreversível. Seus dados serão deletados após período de retenção legal."
- **Timeline clara:**
  - ✓ Imediato: Email deletado, senha resetada, login impossível
  - ⏳ 24 horas: Janela para cancelar (email com link)
  - ⏳ 5 anos: Dados de pacientes retidos por obrigações legais (soft-deleted)
  - ✓ Após 5 anos: Limpeza automática de dados antigos
- **Botão:** "Solicitar Exclusão da Conta"

**And** clica no botão  
**Then** modal de confirmação dupla:

```
Tem a certeza? Esta ação é irreversível.

[Checkbox] Entendo que meus dados serão retidos por 5 anos conforme lei
[Texto input] Digite sua senha para confirmar
[Botão: Cancelar] [Botão: Confirmar Exclusão]
```

**And** após confirmar:
- Email sent: "Solicitação de Exclusão de Conta Recebida"
- Conteúdo do email:
  ```
  Recebemos sua solicitação de exclusão de conta.

  Status: Pendente de Confirmação por Email
  
  ⏱️ TIMELINE:
  - Agora: Sua conta permanece ativa durante 24 horas
  - Próximas 24 horas: Você pode CANCELAR a solicitação clicando aqui: [LINK]
  - Após 24 horas: Sua conta será desativada
  - Próximos 5 anos: Seus dados de saúde (pacientes, visitas, relatórios) 
    serão retidos conforme obrigações legais
  
  ℹ️ O que será deletado imediatamente:
  - Sua conta de login
  - Seus dados de profissional (CRN, email, telefone)
  - Suas preferências e configurações
  
  ℹ️ O que será retido por 5 anos:
  - Dados de pacientes (obrigação legal de saúde)
  - Relatórios e visitas técnicas (auditoria, compliance)
  - Log de auditoria (segurança e investigação)
  
  Dúvidas? Contate suporte@nutrigestao.com
  ```

### 2. Status de Exclusão

**Given** profissional com exclusão pendente  
**When** acessa `/app/configuracoes/deletar-conta/`  
**Then** exibe status atual:

| Estado | Exibição | Ações |
|--------|----------|-------|
| Nenhuma solicitação | Botão "Solicitar Exclusão" | Solicitar |
| Pendente (< 24h) | "Exclusão pendente - Confirme no email enviado" + countdown | Cancelar solicitação (clique em link do email) |
| Confirmado (24h–5 anos) | "Sua conta será deletada em [data]" | Contatar suporte para restaurar |
| Deletado (> 5 anos) | "Conta deletada" | — |

### 3. Cancelamento de Solicitação

**Given** profissional recebe email com exclusão pendente  
**When** clica "Cancelar exclusão" (link válido por 24h)  
**Then** request é cancelado  
**And** email sent: "Solicitação de Exclusão Cancelada"

**And** status volta para "Nenhuma solicitação"

### 4. Bloqueio de Acesso Após Confirmação

**Given** exclusão confirmada (passadas 24h)  
**When** profissional tenta fazer login  
**Then** mensagem: "Sua conta foi marcada para exclusão e está desativada"

**And** nenhuma API permite acesso:
```
SELECT * FROM users WHERE id = '...' AND deleted_at IS NOT NULL;
-- Retorna erro 403 Forbidden
```

### 5. Retenção Legal & Soft-delete

**Given** exclusão confirmada  
**When** 5 anos passam  
**Then** cron job automático executa:

```sql
UPDATE patients SET deleted_at = NOW() WHERE user_id = '...' AND deleted_at IS NOT NULL;
UPDATE visits SET deleted_at = NOW() WHERE user_id = '...' AND deleted_at IS NOT NULL;
UPDATE reports SET deleted_at = NOW() WHERE user_id = '...' AND deleted_at IS NOT NULL;
-- Mas audit_log é MANTIDO (nunca deletado, apenas mascarado)
```

### 6. Auditoria & Compliance

**Given** qualquer operação de exclusão  
**When** executada  
**Then** audit_log registra:

```json
{
  "operation": "ACCOUNT_DELETION_REQUESTED",
  "table_name": "users",
  "record_id": "user_id",
  "user_id": "user_id",
  "old_values": { "deleted_at": null },
  "new_values": { "deleted_at": "2026-04-10T...", "deletion_confirmed_at": null },
  "change_reason": "User requested account deletion per LGPD Art. 18",
  "timestamp": "2026-04-10T..."
}
```

**And** quando email é confirmado:
```json
{
  "operation": "ACCOUNT_DELETION_CONFIRMED",
  "table_name": "users",
  "old_values": { "deletion_confirmed_at": null },
  "new_values": { "deletion_confirmed_at": "2026-04-11T..." },
  "change_reason": "User confirmed email for account deletion",
  "timestamp": "2026-04-11T..."
}
```

### 7. Isolamento Tenant

**Given** profissional A solicita exclusão  
**When** exclusão confirmada  
**Then** profissional B (outro tenant) vê:
- Nenhum acesso aos dados do profissional A
- Nenhuma visibilidade de que deletou conta
- Continuidade normal de seus próprios dados

### 8. Token de Cancelamento Seguro

**Given** email com link de cancelamento  
**When** profissional clica (dentro de 24h)  
**Then** token validado:
- Token contém: `user_id + timestamp + hash(secret)`
- Válido por: 24 horas apenas
- Uso único: Após usar, token é invalidado

## Tarefas de Implementação

### Backend / Banco de Dados

- [ ] **Alteração de schema na tabela `users`:**
  ```sql
  ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_confirmed_at TIMESTAMPTZ;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_confirmed_token VARCHAR UNIQUE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_confirmed_token_expires_at TIMESTAMPTZ;
  
  -- Índice para encontrar contas pendentes de confirmação
  CREATE INDEX idx_users_deletion_pending
    ON users(deleted_at)
    WHERE deleted_at IS NOT NULL AND deletion_confirmed_at IS NULL;
  ```

- [ ] **RLS Update:** Modificar policies existentes para excluir usuários deletados:
  ```sql
  -- Exemplo: quando um usuário tenta fazer query, validar que não está deleted_at
  CREATE POLICY "users_not_deleted" ON users
    FOR SELECT USING (auth.uid() = id AND deleted_at IS NULL);
  ```

- [ ] **Server Action:** `requestAccountDeletion(password: string)`
  - Validar senha atual
  - Inserir `deleted_at = NOW()`
  - Gerar token de confirmação seguro
  - Registar em `audit_log`
  - Enviar email com link

- [ ] **Server Action:** `confirmAccountDeletion(token: string)`
  - Validar token (não expirado, matches user)
  - Atualizar `deletion_confirmed_at = NOW()`
  - Invalidar token
  - Registar em `audit_log`
  - Desativar auth user (via Supabase Admin API)

- [ ] **Server Action:** `cancelAccountDeletion(token: string)`
  - Validar token
  - Restaurar `deleted_at = NULL`
  - Remover token
  - Registar em `audit_log`
  - Reativar auth user

- [ ] **Supabase Auth Update:**
  - Via `supabase.auth.admin.updateUserById()`: setar `user.confirmed_at = NULL` ou custom claim `deleted=true`
  - Isso bloqueia login sem deletar a conta da auth

- [ ] **Cron Job:** Limpeza de dados após 5 anos
  - Executar diariamente
  - Query users com `deletion_confirmed_at < NOW() - '5 years'::INTERVAL`
  - Soft-delete em cascata (patients, visits, reports, etc.)
  - Manter audit_log intacto

### Frontend

- [ ] **Componente:** `DeletionRequestModal`
  - Dupla confirmação (checkbox + password)
  - Loading state
  - Error handling

- [ ] **Componente:** `DeletionStatusCard`
  - Exibir status (nenhuma, pendente, confirmado, deletado)
  - Countdown se pendente
  - Timeline visual

- [ ] **Página:** `app/(app)/configuracoes/deletar-conta/page.tsx`
  - Layout com warning card
  - Timeline explicativa
  - Status atual
  - Botão de ação (Solicitar / Cancelar)

- [ ] **Componente:** `DeletionStatusBadge`
  - Exibir em dashboard/header se há solicitação pendente

- [ ] **Email Template:** `account-deletion-confirmation.ts`
  - HTML renderizado
  - Links seguros com tokens
  - Timeline clara
  - Contato de suporte

### Segurança & Compliance

- [ ] **RLS:** Validar que contas deletadas não permitem acesso
- [ ] **Token Security:** Tokens de confirmação são únicos, com hash, com expiração
- [ ] **Email Verification:** Link no email é o ÚNICO meio de confirmar
- [ ] **Password Verification:** Solicitar senha para iniciar process (defesa contra phishing)
- [ ] **LGPD:** Timeline de retenção documentada em UI
- [ ] **Audit Trail:** Todas as operações de deletion registadas
- [ ] **Isolamento:** Validar que user_id é sempre do auth.uid()

## Arquivos a Criar/Modificar

### Migrações
- `supabase/migrations/20260410150000_account_deletion.sql`

### Tipos TypeScript
- `lib/types/deletion.ts` — DeletionStatus, DeletionRequest types

### Server Actions
- `lib/actions/account-deletion.ts` — Request, confirm, cancel operations

### Componentes
- `components/settings/deletion-request-modal.tsx`
- `components/settings/deletion-status-card.tsx`
- `components/settings/deletion-status-badge.tsx`

### Páginas
- `app/(app)/configuracoes/deletar-conta/page.tsx`

### Email
- `lib/email/templates/account-deletion-confirmation.ts`

### Cron/Background
- `lib/cron/cleanup-deleted-accounts.ts` (to be called via Supabase Edge Function or external scheduler)

### Atualizações a Arquivos Existentes
- `middleware.ts` — Adicionar check: `if (user.deleted_at) return unauthorized`
- `app/(app)/layout.tsx` — Adicionar badge se exclusão pendente
- Environment: `SUPABASE_SERVICE_ROLE_KEY` (para admin API)

## Definição de Pronto (DoD)

- [ ] Código TypeScript sem erros (`npx tsc --noEmit`)
- [ ] RLS: Conta deletada bloqueia completamente (SELECT, INSERT, UPDATE, DELETE)
- [ ] Dupla confirmação funciona (modal + email)
- [ ] Token de confirmação é seguro (único, expiração, hash)
- [ ] Cancelamento dentro de 24h funciona
- [ ] Email enviado corretamente com timeline clara
- [ ] Auditoria: Todas as operações registadas em `audit_log`
- [ ] Soft-delete: Dados de pacientes retidos (status='deleted' após 5 anos)
- [ ] Isolamento tenant: Um tenant não vê dados de outro deletado
- [ ] Sprint status atualizado para `done`
- [ ] Documentação de retenção legal anexada ao PR

---

## Notas de Implementação

### Timeline Crítica
- **T+0:** User solicita exclusão, email enviado
- **T+24h:** Janela para cancelar (sem confirmação, ainda consegue reverter)
- **T+24h+:** Conta desativada, auth blocked, dados soft-deleted
- **T+5 anos:** Limpeza automática final de dados de saúde
- **Sempre:** Audit log é mantido, nunca deletado (mascarado se necessário)

### Considerações de UX
- Modal de confirmação DEVE ser simples e claro
- Email DEVE ter link de cancelamento bem visível
- Status DEVE mostrar exatamente quanto tempo falta
- Mensagens de erro DEVEM ser em português BR claro

### Considerações de Segurança
- Nunca deletar irreversivelmente antes de 5 anos
- Sempre verificar `deleted_at IS NOT NULL` em queries sensíveis
- Tokens de confirmação são one-time-use
- Audit log é imutável (never delete, only mask)

### Considerações LGPD
- Story 11.7 implementa LGPD Art. 18 (Right to be Forgotten)
- Retenção legal de 5 anos é conforme práticas de saúde brasileiras
- Documentação clara de timeline é obrigatória
- Direito de cancelar dentro de 24h é melhor prática
