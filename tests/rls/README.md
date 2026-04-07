# Testes de Isolamento RLS Multi-Tenant

Story 11.1 — Verifica que nenhum tenant acede a dados de outro em todas as tabelas críticas do NutriGestão.

## Credenciais dos Utilizadores de Teste

Após executar os testes, os seguintes utilizadores ficam disponíveis na instância Supabase local para inspeção manual:

| Tenant | Email | Password |
|--------|-------|----------|
| Tenant A | `tenant_a_rls@nutrigestao.test` | `RlsTest@TenantA2026!` |
| Tenant B | `tenant_b_rls@nutrigestao.test` | `RlsTest@TenantB2026!` |

Para inspecionar os dados: aceda ao **Supabase Studio** em `http://localhost:54323` e autentique com as credenciais acima.

## Pré-requisitos

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e a correr
2. [Supabase CLI](https://supabase.com/docs/guides/cli) instalado
3. Node.js ≥ 22

## Configuração inicial

```bash
# 1. Iniciar Supabase local
npx supabase start

# 2. Copiar e preencher as variáveis de ambiente
cp .env.test.example .env.test
```

### Preencher `.env.test`

Após `npx supabase start`, o CLI mostra as credenciais locais:

```
API URL: http://127.0.0.1:54321
anon key: eyJhbGci...
service_role key: eyJhbGci...
```

Cole esses valores no `.env.test`:

```env
SUPABASE_TEST_URL=http://127.0.0.1:54321
SUPABASE_TEST_ANON_KEY=eyJhbGci...  (anon key)
SUPABASE_TEST_SERVICE_ROLE_KEY=eyJhbGci...  (service_role key)
```

Os emails/passwords dos utilizadores de teste já têm valores padrão e não precisam de ser alterados.

## Executar os testes

```bash
# Executar uma vez (modo CI)
npm run test:rls

# Executar em modo watch (desenvolvimento)
npm run test:rls:watch
```

## O que é testado

### Tabelas cobertas (16)
| Tabela | Testes |
|--------|--------|
| `clients` | SELECT, INSERT cross-tenant, UPDATE, DELETE |
| `establishments` | SELECT por ID |
| `patients` | SELECT, UPDATE cross-tenant |
| `technical_recipes` | SELECT por ID |
| `professional_raw_materials` | SELECT por ID |
| `pop_templates` | SELECT por ID |
| `establishment_pops` | SELECT por ID |
| `client_contracts` | SELECT, INSERT, UPDATE, DELETE cross-tenant |
| `contract_templates` | SELECT tenant-owned + visibilidade de globais |
| `external_portal_users` | SELECT, UPDATE cross-tenant |
| `patient_parental_consents` | SELECT + INSERT cross-tenant |
| `external_access_permissions` | SELECT cross-tenant |

### Tipos de ataques simulados

- **SELECT directo por UUID**: tenant A com UUID de registo de tenant B → retorna `[]`
- **SELECT com filtro `owner_user_id` errado**: RLS bloqueia mesmo com filtro explícito
- **SELECT via FK de outro tenant**: `patients.client_id = <id_de_B>` → retorna `[]`
- **INSERT com `owner_user_id` errado**: RLS `WITH CHECK` rejeita
- **UPDATE de registo alheio**: 0 rows affected
- **DELETE de registo alheio**: 0 rows affected
- **Contagem total**: lista completa nunca contém IDs do outro tenant

## Estrutura de ficheiros

```
tests/rls/
├── README.md                    ← este ficheiro
├── fixtures/
│   └── seed.ts                  ← cria tenants e dados de seed
├── helpers/
│   └── supabase.ts              ← factory de clientes autenticados
└── isolation.test.ts            ← 50+ testes de isolamento
```

## CI/CD

O workflow `.github/workflows/rls-tests.yml` executa automaticamente em:
- Push para `main`/`master` que altere migrações SQL ou testes RLS
- Pull Requests com as mesmas alterações

O CI inicia um Supabase local no GitHub Actions, extrai as credenciais geradas, e corre a suíte completa.

## Limpar dados de teste

Os dados de seed são removidos automaticamente no `afterAll` de cada execução. Os **utilizadores de teste são mantidos** para inspeção manual (conforme configuração intencional).

Para remover os utilizadores manualmente via Supabase Studio:
1. Aceder a `http://localhost:54323`
2. Ir a **Authentication → Users**
3. Eliminar `tenant_a_rls@nutrigestao.test` e `tenant_b_rls@nutrigestao.test`
