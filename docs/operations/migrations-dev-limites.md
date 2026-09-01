# Sequência de migrations em DEV — plano de limites por tenant

Runbook para aplicar as migrations do plano `docs/plano-limites-tenant-e-billing.md` no ambiente
**DEV / homolog** (`dbhmlnutricao.stratostech.com.br`). Criado em 2026-08-31.

---

## ⚠️ Antes de tudo: DEV está atrasado

Comparando os schemas expostos no PostgREST, **DEV tem 55 tabelas/views e PRD tem 61**. Faltam em DEV:

| Tabela ausente em DEV | Criada pela migration |
|---|---|
| `patient_child_assessments` | `20260613150000_patient_child_assessments.sql` |
| `checklist_pdf_settings` | `20260724100003_checklist_pdf_settings.sql` |
| `application_activity_log` | `20260817120000_checklist_workspace_drafts_and_audit.sql` |
| `account_closure_requests` | `20260830124000_account_closure_requests.sql` |
| `client_school_grades` | `20260830130000_client_school_grades.sql` |
| `establishment_custom_types` | `20260901120000_establishment_custom_types.sql` |

A mais antiga é de **junho de 2026**. Ou seja: o atraso não é de uma ou duas migrations — DEV pode estar
sem dezenas delas. Provável origem: o ambiente foi criado a partir do dump
`backups/cloud-to-selfhost-20260504` (maio) e nem todo push posterior chegou lá.

**Não dá para descobrir o estado real de DEV a partir do PostgREST** — o histórico fica em
`supabase_migrations.schema_migrations`, que não é exposto. A fonte autoritativa é o CLI:

```bash
# 1. Configurar a credencial (gitignored)
#    Supabase Studio DEV → Connect → Database → URI
cat > scripts/database/.env.dev <<'ENV'
SUPABASE_DB_URL_DEV="postgresql://postgres:SENHA@HOST:5432/postgres"
ENV

# 2. Ver o que está pendente, sem aplicar nada
supabase migration list --db-url "$SUPABASE_DB_URL_DEV"
./scripts/database/push-migrations-dev.sh --dry-run
```

**Rode isso primeiro.** Se a lista de pendentes for grande, aplicar as migrations antigas é um trabalho
próprio — e testar as novas num DEV desatualizado dá falsa confiança, porque duas das tabelas ausentes
(`patient_child_assessments` e `client_school_grades`) fazem parte do inventário de cópia da Fase 6.

---

## Pré-condição obrigatória

Antes de qualquer migration deste plano, em **cada** ambiente:

```bash
psql "$SUPABASE_DB_URL_DEV" -f supabase/scripts/precheck_limites_migration.sql
```

Os blocos **1, 2 e 4** têm de vir vazios. O bloco 3 (documento de cliente repetido) é **informativo**:
em produção devolve 3 grupos, e isso é uso legítimo — a mesma empresa com várias unidades sob um CNPJ.
Não existe índice único em `clients`, então o bloco 3 não bloqueia nada.

---

## As 6 migrations, na ordem

Aplicam-se em sequência. `supabase db push` respeita a ordem do timestamp no nome.

### 1. `20261001120000_profiles_tenant_document.sql`
Adiciona `profiles.document_kind` e `document_id` (CPF ou CNPJ do tenant), com check de formato e
**índice único global**.
**Falha se**: houver documento de tenant repetido (bloco 1 do pré-check).
**Confere depois**:
```sql
select count(*) from information_schema.columns
 where table_name = 'profiles' and column_name in ('document_kind','document_id');  -- 2
```

### 2. `20261001121000_tenant_limits.sql`
Cria `tenant_limits`, as policies, o trigger que gera a linha a cada novo `profile` e o **backfill com
tudo desligado** para quem já existe.
**Confere depois** — o número tem de bater:
```sql
select (select count(*) from public.profiles)       as profiles,
       (select count(*) from public.tenant_limits)  as limites;
-- e nenhum tenant antigo pode ter ficado limitado:
select count(*) from public.tenant_limits where clients_limit_enabled or patients_limit_enabled;  -- 0
```

### 3. `20261001122000_subscription_events_limit_types.sql`
Recria o CHECK de `event_type` com os tipos novos (`limits_changed`, `seats_changed`, `record_restored`…).
**Falha se**: já existir alguma linha com `event_type` fora da lista nova.

### 4. `20261001123000_tenant_scoped_document_uniqueness.sql`
Índices únicos **por tenant** em `patients (user_id, document_id)` e único parcial em
`team_members (member_user_id) where is_active`.
**Falha se**: blocos 2 ou 4 do pré-check devolverem linhas.

### 5. `20261002120000_tenant_limits_enforcement.sql`
O trigger `enforce_tenant_limit()` em `clients`, `patients`, `team_members` e na **reativação** de membro,
mais a função `tenant_has_free_patient_slot`.
**Confere depois** — os 4 triggers têm de existir:
```sql
select tgname from pg_trigger
 where tgname in ('clients_enforce_limit','patients_enforce_limit',
                  'team_members_enforce_limit','team_members_enforce_limit_on_reactivate');
```

### 6. `20261003120000_profiles_document_grants.sql`
Grant de UPDATE em `profiles (document_kind, document_id)` para `authenticated` — sem ele o onboarding e
o perfil falham com *permission denied for column document_kind*, porque `profiles` tem grants por
coluna desde `20260401120000_profiles_role.sql`. Cria também o trigger `profiles_document_guard`, que
impede membro de equipe de registar documento de tenant e grava a trilha em `subscription_events`.
**Depende de**: nº 1 (colunas) e nº 3 (tipo de evento `tenant_document_set`).
**Confere depois**:
```sql
select tgname from pg_trigger where tgname = 'profiles_document_guard';  -- 1 linha

select column_name from information_schema.column_privileges
 where table_name = 'profiles' and grantee = 'authenticated'
   and privilege_type = 'UPDATE'
   and column_name in ('document_kind','document_id');  -- 2 linhas
```

---

> **Não existe migration de unicidade de documento de CLIENTE.** A antiga `20261001124000_clients_document_uniqueness.sql` foi removida:
> um índice único em `clients (owner_user_id, document_id)` codificaria uma regra de negócio errada —
> a mesma empresa pode ter várias unidades sob um CNPJ só. No lugar dela ficou um aviso não bloqueante
> no formulário (`lib/clientes/duplicate-document.ts`). Nada a aplicar no banco.

---

## Sequência recomendada em DEV

```bash
# 0. Descobrir o atraso real
./scripts/database/push-migrations-dev.sh --dry-run

# 1. Pré-condições
psql "$SUPABASE_DB_URL_DEV" -f supabase/scripts/precheck_limites_migration.sql

# 2. Aplicar (inclui as migrations antigas pendentes)
./scripts/database/push-migrations-dev.sh

# 3. Verificações dos blocos acima

# 4. Suíte RLS contra o Supabase local (não contra DEV)
npx supabase start
npm run test:rls
```

Os testes de `tests/rls/` rodam contra **Supabase local**, não contra DEV — eles criam e apagam tenants.
Nunca apontar `.env.test` para DEV ou PRD.

---

## Depois de DEV, antes de PRD

1. Snapshot recente: `node scripts/database/backup-rest.mjs --env-file docker-compose-prd.env`
2. Pré-check em produção — bloco 3 tem de estar limpo (hoje **não está**)
3. Aplicar na mesma ordem
4. Conferir que nenhum tenant ficou com limite ligado por engano:
   ```sql
   select count(*) from public.tenant_limits
    where clients_limit_enabled or patients_limit_enabled or not team_members_enabled;  -- 0
   ```

Produção não tem workflow de migration — é aplicação manual. Ver `docs/operations/backup-pre-migracao.md`.
