# Plano — Cadastro CPF/CNPJ, limites por tenant e cobrança por seat (Stripe)

> Status: proposta para implementação · Criado em 2026-08-31
> Contexto: início da comercialização do NutriGestão. Cada tenant passa a ter documento fiscal,
> limites explícitos de clientes/pacientes e controle de membros de equipe cobrados por seat.

---

## 1. Objetivo

1. Todo tenant tem **CPF ou CNPJ** registrado (profissional autônomo sem CNPJ é caso válido).
2. Todo tenant tem, **explicitamente gravado na sua própria linha** (nunca configuração global):
   - limite de **clientes** — habilitado/desabilitado + valor (padrão 25);
   - limite de **pacientes** — habilitado/desabilitado + valor (limite independente);
   - **cadastro de membros de equipe** — habilitado/desabilitado, com limite numérico ou "ilimitado".
3. Tudo isso é lido e editado pelo **painel do super_admin**.
4. Membros de equipe extras são **cobrados por seat** via **Stripe**.
5. Cadastro público (`/register`) reaberto, com CPF/CNPJ e escolha de plano.
6. **Membro de equipe pertence a um único tenant** — nunca a dois.
7. **Paciente pode existir em tenants diferentes** (é atendido por profissionais e instituições
   distintas). Ao cadastrar um CPF já conhecido, o novo tenant é avisado de que o cadastro existe e,
   **mediante autorização do titular**, recebe uma **cópia** dos dados. Depois disso as bases são
   independentes e isoladas — ver §9.
8. **Exame pertence ao paciente**, não ao cliente — ver §9.4.1.
9. **Nada de prontuário é apagado de fato antes de 20 anos do último registro**: excluir marca como
   inativo; o tenant **não reativa** (só o `super_admin`, com motivo e cota revalidada) e o expurgo só
   ocorre depois do prazo, por job auditado — ver §10.

---

## 2. Decisões já tomadas

| Decisão | Escolha |
|---|---|
| Escopo do limite | `clients` e `patients` com **limites separados e independentes** |
| Onde o CPF/CNPJ é coletado | Wizard do super_admin **+** onboarding **+** **cadastro público reaberto** |
| Cobrança de seats | **Integração com gateway — Stripe** |
| Tenants existentes na migração | Backfill com **limites desabilitados** (não quebra ninguém) |
| Membro de equipe | **Um único tenant** — índice único em `member_user_id` ativo (§4.4) |
| Paciente em vários tenants | **Permitido**; identidade única por CPF, e **cópia** dos dados para o novo tenant mediante autorização do titular (§9) |
| O que o novo tenant vê antes do aceite | **Só que o cadastro existe** — sem instituição, sem datas, sem dado clínico |
| Depois da cópia | **Bases isoladas**: sem leitura cruzada e sem sincronização — cada tenant edita a sua |
| Exclusão de paciente | **Lógica**: `deleted_at`; o **tenant nunca reativa**; só `super_admin` restaura, revalidando a cota (§10.2.1); `DELETE` real bloqueado por trigger |
| Auditoria de exclusão/restauração | **Comentário obrigatório** (≥10 caracteres) na exclusão, no pedido do tenant e na decisão do suporte (§10.2.2) |
| Prazo de guarda do prontuário | **20 anos após o último registro** (CFN 594/2017 art. 3º VI), em `retention_policies` |

---

## 3. Estado atual do código (levantamento)

O que **já existe** e será reaproveitado:

- **Tenant = linha de `public.profiles`** (`user_id` referencia `auth.users`). Não há tabela `tenants`.
- `public.subscription_plans` já tem `max_clients`, `max_patients`, `max_team_members`,
  `max_establishments`, `max_storage_mb` e feature flags — **mas nada disso é lido pelo app**.
  Hoje só aparece em `/admin/planos` como texto informativo. Limites **não são aplicados** em lugar nenhum.
- `public.tenant_feature_overrides` (por tenant, chave/valor booleano) — padrão de override por tenant já estabelecido.
- `public.subscription_events` — histórico imutável de eventos (`plan_changed`, `suspended`, `payment_received`…),
  com `check` no `event_type` que precisará de novos valores.
- `public.is_super_admin()` — helper SECURITY DEFINER usado nas RLS do painel.
- `profiles.enabled_modules` (JSONB) + `public.workspace_enabled_modules()` — **padrão de referência**
  de como uma capacidade por tenant é lida no middleware e nos guards.
- `lib/validators/br-document.ts` — `isValidCpf` / `isValidCnpj` / `onlyDigits` **já implementados e testados**.
  `lib/format/br-document.ts` formata para exibição.
- `getWorkspaceAccountOwnerId(supabase, userId)` — resolve o titular do workspace a partir de um membro da equipe.
  É a chave de contagem correta para os limites.
- Chaves de tenant nas tabelas alvo:
  - `clients.owner_user_id`
  - `patients.user_id` (paciente pode ser independente de cliente — `client_id` é nullable)
  - `team_members.owner_user_id` (+ `is_active`)
- Painel admin existente: `app/(admin)/admin/tenants/page.tsx`, `.../tenants/[id]/page.tsx`,
  `.../tenants/novo/page.tsx`, ações em `lib/actions/admin-platform.ts`,
  wizard em `components/admin/create-tenant-wizard.tsx` (4 passos: Identificação → Módulos → Plano → Acesso).
- `app/(auth)/register/page.tsx` hoje é só um `redirect("/login")` — cadastro público desativado.
- **Não existe nenhuma integração de pagamento** no projeto (nenhuma referência a Stripe/Asaas/MP).

Lacunas que este plano fecha: sem documento fiscal no tenant, sem limites aplicados,
sem UI de limites no painel, sem cadastro público, sem billing.

---

## 4. Fase 1 — Modelo de dados

### 4.1 `profiles`: documento fiscal

Migration `20261001120000_profiles_tenant_document.sql`:

```sql
alter table public.profiles
  add column if not exists document_kind text
    constraint profiles_document_kind_check check (document_kind in ('cpf', 'cnpj')),
  add column if not exists document_id text;   -- apenas dígitos, sem máscara

-- Coerência: ou os dois nulos, ou os dois preenchidos com o tamanho certo
alter table public.profiles
  add constraint profiles_document_pair_check check (
    (document_kind is null and document_id is null)
    or (document_kind = 'cpf'  and document_id ~ '^[0-9]{11}$')
    or (document_kind = 'cnpj' and document_id ~ '^[0-9]{14}$')
  );

-- Um documento não pode pertencer a dois tenants
create unique index if not exists profiles_document_id_uidx
  on public.profiles (document_id) where document_id is not null;
```

Decisões:
- Guardar **somente dígitos**; máscara é responsabilidade da UI (`lib/format/br-document.ts`).
- Coluna **nullable** por causa dos tenants já existentes; a obrigatoriedade é aplicada
  nos novos fluxos de cadastro (validação em Server Action), não por `NOT NULL`.
- Validação de dígito verificador continua no TypeScript (`isValidCpf`/`isValidCnpj`);
  o `check` no banco cobre só formato — evita reimplementar módulo 11 em PL/pgSQL.

### 4.2 `tenant_limits`: uma linha por tenant

Migration `20261001121000_tenant_limits.sql`. **Tabela dedicada** em vez de colunas em `profiles`, porque:
audita quem mudou o quê, não infla uma tabela já com ~25 colunas, e permite RLS própria (tenant lê, só admin escreve).

```sql
create table if not exists public.tenant_limits (
  tenant_user_id uuid primary key references auth.users (id) on delete cascade,

  -- Clientes
  clients_limit_enabled  boolean not null default true,
  clients_limit          integer not null default 25
    constraint tenant_limits_clients_limit_check check (clients_limit >= 0),

  -- Pacientes (limite independente)
  patients_limit_enabled boolean not null default true,
  patients_limit         integer not null default 25
    constraint tenant_limits_patients_limit_check check (patients_limit >= 0),

  -- Membros de equipe
  team_members_enabled   boolean not null default false,
  team_members_unlimited boolean not null default false,
  team_members_limit     integer not null default 0
    constraint tenant_limits_team_members_limit_check check (team_members_limit >= 0),

  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.tenant_limits enable row level security;

-- Tenant (e sua equipe) lê os próprios limites; super_admin gere tudo
create policy "tenant_limits_select_own_or_admin"
  on public.tenant_limits for select to authenticated
  using (tenant_user_id = public.workspace_account_owner_id() or public.is_super_admin());

create policy "tenant_limits_manage_super_admin"
  on public.tenant_limits for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

grant select on public.tenant_limits to authenticated;
```

> `public.workspace_account_owner_id()` já existe no projeto (SECURITY DEFINER, usado nas RLS de
> workspace) — a policy acima reaproveita esse helper, sem criar função nova.

**Garantia de que toda linha existe** — dois caminhos, para não depender de disciplina de código:

```sql
-- 1. Trigger em profiles: todo profile novo ganha limites explícitos
create or replace function public.profiles_ensure_tenant_limits()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.tenant_limits (tenant_user_id) values (new.user_id)
  on conflict (tenant_user_id) do nothing;
  return new;
end; $$;

create trigger profiles_create_tenant_limits
  after insert on public.profiles
  for each row execute function public.profiles_ensure_tenant_limits();
```

```sql
-- 2. Backfill dos tenants existentes: TUDO DESLIGADO (não quebrar quem já usa)
insert into public.tenant_limits (
  tenant_user_id, clients_limit_enabled, patients_limit_enabled,
  team_members_enabled, team_members_unlimited
)
select p.user_id, false, false, true, true
from public.profiles p
on conflict (tenant_user_id) do nothing;
```

Assim: **tenant novo nasce limitado (25/25, equipe desligada); tenant antigo continua ilimitado**
até o super_admin decidir o contrário.

Trigger de `updated_at` seguindo o padrão de `tenant_feature_overrides_touch_updated_at()`.

### 4.3 Novos `event_type` em `subscription_events`

Migration `20261001122000_subscription_events_limit_types.sql` — recriar o `check` incluindo:
`limits_changed`, `team_members_toggled`, `seats_changed`, `checkout_completed`,
`subscription_updated`, `subscription_canceled`, `payment_failed`.

Toda alteração de limite pelo painel grava um evento (`old_value`/`new_value` em JSON no `metadata`).

---

### 4.4 Fronteiras do tenant — o que é isolado e o que é compartilhado

Três regras distintas, que não devem ser confundidas:

| Entidade | Regra |
|---|---|
| **Membro de equipe** | Pertence a **exatamente um** tenant. Nunca a dois. |
| **Cliente** (`clients`) | Isolado por tenant. Sem visibilidade cruzada. |
| **Paciente** (`patients`) | Cada tenant tem **a sua linha** (conta no limite dele), mas a **pessoa** é a mesma na plataforma: o histórico pode ser compartilhado entre tenants **mediante consentimento do titular** — ver §9 (Fase 6). |

**Estado atual — já correto, e que este plano não pode quebrar:**

- `patients.user_id` é `NOT NULL`; as policies (`20260617120000_workspace_team_rls.sql`) usam
  `user_id = (select public.workspace_account_owner_id())` em SELECT, INSERT, UPDATE e DELETE.
- `clients.owner_user_id` segue o mesmo padrão.
- O isolamento por RLS **continua sendo o padrão**. O compartilhamento da Fase 6 **não** afrouxa nenhuma
  policy: ele acontece por funções `SECURITY DEFINER` que verificam a autorização antes de devolver dado.
  Nunca por policy aberta em `patients` — isso transformaria o isolamento em queijo suíço.

#### Membro de equipe: um tenant, e só um

`public.workspace_account_owner_id()` resolve o tenant da sessão assim:

```sql
select coalesce(
  (select tm.owner_user_id from public.team_members tm
    where tm.member_user_id = (select auth.uid()) and tm.is_active limit 1),
  (select auth.uid())
);
```

Hoje existe apenas o índice comum `team_members_member_user_id_idx` — **nada impede** o mesmo
`member_user_id` ativo em dois workspaces. Se isso acontecer, o `limit 1` escolhe um tenant **arbitrário**
e a sessão enxerga os dados do tenant errado. Com o cadastro público aberto, deixa de ser risco teórico.

```sql
-- Um usuário ativo pertence a um único workspace
create unique index if not exists team_members_member_user_id_uidx
  on public.team_members (member_user_id)
  where member_user_id is not null and is_active;
```

Complementos:
- `createTeamMemberAction` (`lib/actions/team-members.ts`) passa a recusar antes do insert, com mensagem
  clara: *"Este e-mail já está vinculado a outra conta do NutriGestão."*
- Antes de criar o índice, rodar a checagem de violações existentes:
  `select member_user_id, count(*) from public.team_members where member_user_id is not null and is_active group by 1 having count(*) > 1;`
- Um vínculo **inativo** em outro workspace é permitido pelo índice parcial — é o caso do profissional que
  saiu de uma clínica e entrou em outra. Reativar exige desativar o vínculo anterior.

#### Unicidade de documento: escopos diferentes

| Documento | Escopo | Motivo |
|---|---|---|
| `profiles.document_id` (o **tenant**) | **Global** | duas contas não podem ter o mesmo CNPJ/CPF |
| `clients.document_id` | **Sem unicidade** — só aviso | a mesma empresa pode ter **várias unidades** sob um único CNPJ de matriz |
| `patients.document_id` | **Por tenant** (`(user_id, document_id)`) | evita duplicar o paciente **dentro** do tenant; a mesma pessoa em tenants distintos é cenário legítimo |
| `persons.document_hash` (§9) | **Global** | é a identidade única da pessoa que costura os cadastros |

Nunca criar `unique (document_id)` simples em `patients` — quebraria o multi-tenant.

```sql
create unique index if not exists patients_user_document_uidx
  on public.patients (user_id, document_id) where document_id is not null;
```

> Antes de aplicar: limpar duplicatas pré-existentes
> (`select user_id, document_id, count(*) from public.patients where document_id is not null group by 1,2 having count(*) > 1`),
> senão a criação do índice falha.

##### Por que `clients` não tem índice único (decisão de 2026-08-31)

A proposta inicial era `clients (owner_user_id, document_id)`. O pré-check em produção encontrou 3 grupos
repetidos e a verificação com o negócio mostrou que **não são erro**: são unidades distintas da mesma
empresa — o caso mais claro é a *Cinpal*, com 3 plantas sob o CNPJ da matriz, cada uma com os seus
checklists e visitas. O índice único impediria cadastrar a *Planta 4*.

A regra correta não é "um cliente por documento", é "uma **unidade** por local" — e unidade é
`establishments`, não `clients`. Enquanto essa regra não existir, o comportamento é:

- **sem constraint** no banco, para os cadastros atuais e para os futuros;
- **aviso não bloqueante** nas actions de criar/editar cliente: quando o documento já existe na conta, a
  action devolve `warning` com a lista dos cadastros existentes e o formulário oferece
  *"Cadastrar mesmo assim"* (`confirm_duplicate_document=true`);
- lógica pura e testada em `lib/clientes/duplicate-document.ts`.

Grandfathering (`create unique index … where created_at >= '<data>'`) foi descartado: seria uma regra que
vale para uns cadastros e não para outros, com erro do banco só em alguns casos e sem explicação para quem
está a usar. O aviso cobre o objetivo real, que é detectar digitação repetida por engano.

#### Leitura cruzada pela plataforma

A policy `patients_select_admin` permite que `admin`/`super_admin` leiam **qualquer** paciente. É necessária
para suporte, mas é acesso a dado de saúde: manter no inventário LGPD, avaliar restringir só a `super_admin`
e registrar o acesso (já existe `admin_impersonation_log` como precedente).

---

## 5. Fase 2 — Aplicação dos limites (defesa em profundidade)

O app tem **muitos caminhos de inserção** (formulário, onboarding, importação CSV, portal externo).
Validar só na Server Action é insuficiente. Duas camadas:

### 5.1 Camada 1 — Trigger no banco (a garantia real)

Migration `20261002120000_tenant_limits_enforcement.sql`:

```sql
create or replace function public.enforce_tenant_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner   uuid;
  v_enabled boolean;
  v_limit   integer;
  v_count   integer;
begin
  if tg_table_name = 'clients' then
    v_owner := new.owner_user_id;
    select clients_limit_enabled, clients_limit into v_enabled, v_limit
      from public.tenant_limits where tenant_user_id = v_owner;
    if coalesce(v_enabled, false) then
      select count(*) into v_count from public.clients where owner_user_id = v_owner;
      if v_count >= v_limit then
        raise exception 'LIMITE_CLIENTES_ATINGIDO' using errcode = 'P0001';
      end if;
    end if;

  elsif tg_table_name = 'patients' then
    v_owner := new.user_id;
    -- idem com patients_limit_enabled / patients_limit → 'LIMITE_PACIENTES_ATINGIDO'

  elsif tg_table_name = 'team_members' then
    v_owner := new.owner_user_id;
    -- team_members_enabled = false        → 'EQUIPE_DESABILITADA'
    -- unlimited = false e count >= limit  → 'LIMITE_EQUIPE_ATINGIDO'
  end if;

  return new;
end; $$;

create trigger clients_enforce_limit      before insert on public.clients
  for each row execute function public.enforce_tenant_limit();
create trigger patients_enforce_limit     before insert on public.patients
  for each row execute function public.enforce_tenant_limit();
create trigger team_members_enforce_limit before insert on public.team_members
  for each row execute function public.enforce_tenant_limit();
```

Pontos de atenção:
- Contagem de `team_members` deve considerar apenas `is_active = true` (membro desativado não ocupa seat).
- **`BEFORE INSERT` não basta em `team_members`**: reativar um membro (`is_active` de `false` para `true`)
  ocupa um assento sem passar por `INSERT`. Sem isso, o tenant desativa um membro, cadastra outro e reativa
  o primeiro — dois assentos pelo preço de um. O trigger precisa rodar também em
  `BEFORE UPDATE ... when (old.is_active is false and new.is_active is true)`.
- Em `clients` e `patients` o `INSERT` cobre tudo, porque exclusão é definitiva (§10.2) — não existe
  reativação para escapar da cota.
- Concorrência: dois inserts simultâneos no limite podem passar. Aceitável (estouro de 1),
  ou usar `pg_advisory_xact_lock(hashtext(v_owner::text))` se quiser exatidão estrita.
- O `service_role` (criação de tenant pelo admin, webhooks) **também passa pelo trigger** —
  intencional; se precisar de bypass pontual, usar `set local app.bypass_tenant_limits = 'on'`
  e checar no início da função.

### 5.2 Camada 2 — Pré-checagem em TypeScript (a boa UX)

Novo módulo `lib/limits/tenant-limits.ts`:

```ts
export type TenantLimits = { /* espelha a linha de tenant_limits */ };
export type LimitKind = "clients" | "patients" | "team_members";

export async function loadTenantLimits(supabase, ownerUserId): Promise<TenantLimits>;
export async function checkTenantLimit(supabase, ownerUserId, kind): Promise<
  { ok: true } | { ok: false; reason: "disabled" | "reached"; used: number; limit: number }
>;
export function tenantLimitErrorMessage(kind, reason, limit): string; // strings pt-BR
export function mapPgLimitError(error): string | null; // 'LIMITE_CLIENTES_ATINGIDO' → mensagem
```

Pontos de integração (chamar `checkTenantLimit` antes do insert e `mapPgLimitError` no catch):

| Arquivo | Função |
|---|---|
| `lib/actions/clients.ts` | `createClientAction` |
| `lib/actions/patients.ts` | `createPatientAction` |
| `lib/actions/team-members.ts` | `createTeamMemberAction` |
| `lib/actions/onboarding.ts` | criação do primeiro cliente PF/PJ |
| `lib/actions/import.ts`, `import-child-assessments.ts` | importação em lote — validar o total **antes** de inserir e recusar o arquivo inteiro com mensagem clara |

Mensagens (pt-BR, seguindo o padrão do projeto):
- `"Você atingiu o limite de 25 clientes do seu plano. Fale com o suporte para ampliar."`
- `"Você atingiu o limite de 25 pacientes do seu plano."`
- `"O cadastro de membros de equipe não está habilitado para a sua conta."`
- `"Você atingiu o limite de N membros de equipe. Adicione mais assentos para continuar."`

### 5.3 UI para o tenant

- Botão "Novo cliente" / "Novo paciente" / "Novo membro" fica **desabilitado com tooltip explicativo**
  quando o limite está atingido (não deixar o usuário preencher o formulário para levar erro no fim).
- Badge de uso nas listagens: `18/25 clientes`. Componente novo `components/limits/limit-usage-badge.tsx`.
- Item de menu **Equipe** só aparece quando `team_members_enabled` — mesmo padrão de
  `lib/app-nav.ts` + `enabled_modules`. Guard de rota em `app/(app)/equipe/*` para acesso direto por URL.

---

## 6. Fase 3 — Painel do super_admin

### 6.1 Criação de tenant (`components/admin/create-tenant-wizard.tsx`)

- **Passo 1 (Identificação)**: adicionar seletor `CPF | CNPJ` + campo documento com máscara e validação
  client-side (`isValidCpf`/`isValidCnpj`) e server-side em `createTenantAsAdminAction`.
  Novo erro `?err=document` → *"CPF ou CNPJ inválido."* / `?err=document_exists`.
- **Novo passo "Limites"** (entre Plano e Acesso), com 3 blocos:
  - Clientes: switch *Aplicar limite* + input numérico (default 25, desabilitado quando o switch está off)
  - Pacientes: idem
  - Equipe: switch *Permitir cadastro de membros* → quando ligado, mostra *Assentos ilimitados* (switch)
    ou input de quantidade + preço por assento (informativo, vindo do Stripe)
- O resumo (`buildCreateTenantSummary` / `create-tenant-confirm-dialog.tsx`) passa a exibir os limites.
- `createTenantAsAdminAction` grava `profiles.document_*` e faz `upsert` em `tenant_limits`
  (a linha já existe pelo trigger) + evento `limits_changed`.
- Atualizar o rascunho de formulário em `lib/admin/tenant-create-form-draft.ts` para os novos campos.

### 6.2 Ficha do tenant (`app/(admin)/admin/tenants/[id]/page.tsx`)

Novo card **"Limites e assentos"**, no mesmo estilo dos cards existentes, com:
- documento fiscal (formatado) e botão de editar;
- uso atual vs. limite: `clientes 18/25`, `pacientes 40/25 ⚠`, `equipe 3/5`;
- formulário `action={updateTenantLimitsAction}` com os switches e inputs;
- aviso quando o uso atual **já excede** o limite que se está prestes a habilitar
  (não bloqueia o que existe — apenas impede novos cadastros).

Novas ações em `lib/actions/admin-platform.ts`:

```ts
export async function updateTenantLimitsAction(formData: FormData): Promise<void>;
export async function loadTenantLimitsWithUsage(tenantUserId: string): Promise<{
  limits: TenantLimits; usage: { clients: number; patients: number; teamMembers: number };
}>;
```

Todas passam por `requireSuperAdmin()` e gravam `subscription_events`.

### 6.3 Lista de tenants (`app/(admin)/admin/tenants/page.tsx`)

- Colunas novas: **Documento** e **Limites** (chips compactos: `C 18/25 · P 40/∞ · E 3/5`).
- Busca por CPF/CNPJ (comparando só dígitos).
- Filtro rápido: *"Tenants que atingiram algum limite"* — bom sinal de upsell.

---

## 7. Fase 4 — CPF/CNPJ e reabertura do cadastro público

`/register` volta a ser um formulário real. Escopo:

1. **Formulário** (`app/(auth)/register/page.tsx` + `components/auth/register-form.tsx`):
   nome/razão social, tipo de pessoa (CPF/CNPJ), documento, e-mail, telefone, senha (≥12 caracteres,
   mesma política do wizard admin), aceite dos Termos e da Política de Privacidade (LGPD — reaproveitar `lib/actions/consent.ts`).
2. **Server Action** `registerTenantAction` em `lib/actions/auth.ts`:
   - valida documento (dígito verificador) e unicidade contra `profiles.document_id`;
   - `supabase.auth.signUp` com `email_confirm` obrigatório e `raw_user_meta_data`
     contendo `full_name`, `document_kind`, `document_id`, `acquisition_source: 'self_service'`;
   - o trigger `handle_new_user()` (migration `20260331120000_profiles.sql`, ajustado) copia o documento
     do metadata para `profiles`, define `plan_slug` do plano de entrada e `trial_started_at`.
3. **Limites do auto-cadastro**: linha de `tenant_limits` criada pelo trigger com os defaults
   (25 clientes / 25 pacientes / equipe desligada). É exatamente o comportamento comercial desejado.
4. **Anti-abuso** (obrigatório num cadastro aberto): rate limit por IP na rota,
   Cloudflare Turnstile ou hCaptcha, e bloqueio de domínios descartáveis.
   Já existe `app/api/client-ip` e infra de CSP para apoiar isso.
5. **Onboarding** (`components/onboarding/onboarding-wizard.tsx`): se o documento já veio do cadastro,
   apenas exibir para confirmação; se veio de tenant antigo sem documento, **pedir** — é a via de backfill
   natural dos tenants existentes.
6. **Perfil** (`app/(app)/perfil`): documento visível, editável só pelo titular (não pela equipe),
   com auditoria em `subscription_events`.

#### Estado (T6 concluído; T7 é o `/register`)

Os itens 1 a 4 são o T7 e continuam pendentes. Os itens 5 e 6, mais o wizard do admin, foram entregues
no T6:

- `lib/tenant/tenant-document.ts` concentra a lógica pura — aceita CPF **ou** CNPJ, deduz o tipo pelo
  tamanho quando o formulário não manda, valida dígito verificador e traduz os erros do banco em
  mensagens de utilizador. Reaproveita `lib/validators/br-document.ts` sem tocar nele: o parser de
  cliente e o de paciente ficam como estavam.
- O par de campos vive num só componente (`components/tenant/tenant-document-fields.tsx`) usado no
  wizard, no onboarding e no perfil — controlado, porque o onboarding guarda o valor em estado e o
  envia por campos ocultos noutro passo (lá os nomes são `tenant_document_kind`/`tenant_document_id`,
  para não colidir com o `document_id` do primeiro **cliente**, que já existia naquele formulário).
- **Quem pode gravar**: só o titular. O grant de UPDATE é por papel (`authenticated`), não por linha,
  então a garantia é o trigger `profiles_document_guard` — sem ele um membro de equipe poderia ocupar
  um CNPJ no índice único **global** e bloquear a conta legítima.
- **Onde fica a auditoria**: no mesmo trigger, não na Server Action. `subscription_events` só aceita
  INSERT de super_admin (policy `subscription_events_insert_super_admin`), e quem preenche o documento
  no onboarding ou no perfil é o próprio tenant — a aplicação não conseguiria escrever o evento. O
  trigger é `security definer` e cobre os três caminhos de uma vez. Tipo de evento:
  `tenant_document_set`.
- **No wizard do admin** a checagem de duplicado acontece **antes** do `auth.admin.createUser`: se
  fosse só o índice único a barrar, sobraria um utilizador no Auth sem profile.

---

## 8. Fase 5 — Stripe (assinatura + seats)

### 8.1 Modelo

- **Plano base** = 1 assinatura Stripe por tenant.
- **Seats de equipe** = um `subscription_item` com preço *licensed* e `quantity` = número de assentos contratados.
- `tenant_limits.team_members_limit` passa a ser **derivado do Stripe** quando há assinatura ativa;
  o super_admin ainda pode sobrescrever manualmente (cortesia, contrato especial) — o override vence,
  e isso fica registrado em `subscription_events`.

### 8.2 Dados

Migration `20261003120000_stripe_billing.sql`:

```sql
alter table public.subscription_plans
  add column if not exists stripe_product_id     text,
  add column if not exists stripe_price_id       text,   -- assinatura base
  add column if not exists stripe_seat_price_id  text,   -- preço por assento adicional
  add column if not exists seat_price_cents      bigint not null default 0;

create table if not exists public.tenant_billing (
  tenant_user_id         uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  status                 text,        -- trialing|active|past_due|canceled|incomplete
  seats_quantity         integer not null default 0,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  updated_at             timestamptz not null default now()
);

-- Idempotência de webhook (Stripe reenvia eventos)
create table if not exists public.stripe_webhook_events (
  id           text primary key,      -- evt_...
  type         text not null,
  processed_at timestamptz not null default now(),
  payload      jsonb
);
```

RLS: `tenant_billing` legível pelo próprio tenant e pelo super_admin; escrita **apenas** por `service_role`.
`stripe_webhook_events` sem acesso para `authenticated`.

### 8.3 Código

- `lib/billing/stripe.ts` — client server-only (`STRIPE_SECRET_KEY`), nunca importado em Client Component.
- `lib/actions/billing.ts`:
  - `createCheckoutSessionAction` — assinatura do plano + N assentos; envia `customer_email`,
    `metadata.tenant_user_id` e o **tax id** do cliente (`br_cpf` / `br_cnpj`) a partir de `profiles.document_*`;
  - `createBillingPortalSessionAction` — autoatendimento (trocar cartão, cancelar);
  - `updateSeatsAction` — altera `quantity` do item de seats com proração.
- `app/api/stripe/webhook/route.ts` — `runtime = "nodejs"`, corpo **raw** para verificar assinatura
  (`stripe.webhooks.constructEvent`), gravação em `stripe_webhook_events` antes de processar.
  Eventos tratados:

  | Evento | Efeito |
  |---|---|
  | `checkout.session.completed` | cria `tenant_billing`, ativa plano |
  | `customer.subscription.created/updated` | atualiza status, `seats_quantity` → sincroniza `tenant_limits.team_members_limit` e `team_members_enabled` |
  | `customer.subscription.deleted` | `team_members_enabled = false`, plano volta para o de entrada |
  | `invoice.payment_failed` | evento + notificação; após a política de dunning, `profiles.is_suspended = true` |
  | `invoice.paid` | `subscription_events: payment_received` (aproveita `recordPaymentEventAction` existente) |

- Página do tenant `app/(app)/configuracoes/assinatura/page.tsx`: plano atual, assentos usados/contratados,
  botão *Gerenciar assinatura* (portal) e *Adicionar assento*.
- Ficha do tenant no admin: bloco com status do Stripe e link para o customer no dashboard.

### 8.4 Pontos a confirmar antes de codar

- **Meios de pagamento no Brasil**: cartão é a via confiável para assinatura recorrente.
  Pix e boleto têm regras próprias e disponibilidade que muda — confirmar na documentação atual do Stripe
  antes de prometer Pix recorrente ao cliente. Sugestão: lançar com cartão e avaliar Pix depois.
- Entidade/conta Stripe Brasil, tributação (nota fiscal de serviço é responsabilidade sua, o Stripe não emite NFS-e).
- Chaves: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  em `.env.example`, `.env.local`, `docker-compose-prd.env.example` e no Portainer.

---

## 9. Fase 6 — Identidade do paciente e cópia de cadastro entre tenants

> **Épico à parte.** As Fases 1–5 não dependem dela e podem ir a produção antes.

### 9.1 O problema e o modelo escolhido

O mesmo paciente pode ser atendido por profissionais e instituições diferentes que usam o NutriGestão.
Hoje cada tenant recomeça o cadastro do zero e o histórico se perde na troca.

**Modelo escolhido: cópia, não leitura compartilhada.** Quando o Tenant 2 cadastra um CPF que já existe na
plataforma, o sistema avisa que o cadastro existe e — com autorização — **copia** os dados do paciente para
a base do Tenant 2. A partir daí são **duas bases independentes**: cada tenant edita a sua, ninguém lê a do
outro, e o isolamento por RLS da §4.4 continua valendo integralmente.

Por que isso é melhor que a leitura compartilhada:

- Não existe leitura cruzada em runtime — **nenhuma policy de `patients` é afrouxada**, nenhuma função
  passa a devolver dado de outro tenant no dia a dia. A superfície de vazamento é um evento pontual e
  auditado, não um canal permanente.
- Cada tenant continua sendo controlador da sua própria base, com responsabilidade clara.
- Não há o problema de "quem manda no cadastro": não existe sobrescrita entre tenants.

O preço, que precisa estar claro para você e para o cliente:

- **A cópia é uma fotografia.** O que o Tenant 1 registrar depois **não** aparece no Tenant 2. Para
  atualizar, é uma nova solicitação de cópia (§9.7).
- **A cópia não se desfaz.** Revogar o consentimento depois não apaga o que já foi copiado — vira um
  pedido de exclusão dirigido ao Tenant 2, pelo fluxo de DSAR que já existe. Isso precisa estar escrito
  no texto do consentimento, sem eufemismo.

### 9.2 Decisões

| Questão | Decisão |
|---|---|
| Modelo | **Cópia para o novo tenant**; bases isoladas depois disso |
| Quem autoriza | **O paciente** (ou responsável legal) — não o tenant anterior |
| O que o Tenant 2 vê antes do aceite | **Apenas que existe** cadastro na plataforma — sem instituição, sem datas, sem dado clínico |
| Escopo da cópia | **Cadastro completo + histórico do paciente** (inventário em §9.4) |
| Depois da cópia | Bases independentes; sem sincronização automática; sem leitura cruzada |
| Limite de pacientes | A cópia cria **uma linha** em `patients` do Tenant 2 → **conta na cota dele** |

### 9.3 Modelo de dados

Migration `20261004120000_person_identity_and_record_copy.sql`.

```sql
-- Identidade da pessoa na plataforma. NADA clínico aqui.
create table if not exists public.persons (
  id            uuid primary key default gen_random_uuid(),
  document_hash text not null unique,   -- sha256(pepper || dígitos do CPF)
  created_at    timestamptz not null default now()
);

-- Cada linha de patients aponta para a pessoa (a linha continua sendo do tenant)
alter table public.patients
  add column if not exists person_id uuid references public.persons (id) on delete set null;
create index if not exists patients_person_id_idx on public.patients (person_id);

-- Autorização do titular para UMA cópia, de um tenant de origem para um de destino
create table if not exists public.patient_copy_authorizations (
  id                     uuid primary key default gen_random_uuid(),
  person_id              uuid not null references public.persons (id) on delete cascade,
  source_tenant_user_id  uuid not null references auth.users (id) on delete cascade,
  target_tenant_user_id  uuid not null references auth.users (id) on delete cascade,
  status                 text not null default 'pending'
    constraint patient_copy_authorizations_status_check
      check (status in ('pending','approved','denied','expired','executed')),
  token_hash             text,          -- link de aceite enviado ao titular
  expires_at             timestamptz,
  decided_at             timestamptz,
  executed_at            timestamptz,
  is_parental_consent    boolean not null default false,
  parental_consent_name  text,
  ip_address             inet,          -- rastreabilidade LGPD art. 32
  user_agent             text,
  created_at             timestamptz not null default now()
);

-- Registro do que foi efetivamente copiado (LGPD art. 37 + base para cópia incremental)
create table if not exists public.patient_copy_operations (
  id               uuid primary key default gen_random_uuid(),
  authorization_id uuid not null references public.patient_copy_authorizations (id) on delete cascade,
  table_name       text not null,
  source_row_id    uuid not null,
  target_row_id    uuid not null,
  copied_at        timestamptz not null default now(),
  constraint patient_copy_operations_unique unique (authorization_id, table_name, source_row_id)
);
```

- **`document_hash`, não CPF em claro.** O projeto já usa esse padrão em
  `20260724100002_document_hash.sql`. Vazamento de `persons` não vira lista de CPFs, e a busca
  determinística continua funcionando. O CPF em claro fica só na linha de `patients` de cada tenant.
- `persons`, `patient_copy_authorizations` e `patient_copy_operations` **não têm policy de leitura para
  `authenticated`** — todo acesso passa por função `SECURITY DEFINER`.
- Espelhar o aceite em `consent_records` com novo `consent_type = 'cross_tenant_record_copy'`
  (a tabela já guarda IP, user-agent, consentimento parental e revogação).

### 9.4 Inventário: o que é copiado

Levantado do código atual. **Confirmar antes de implementar** — a lista muda a cada migration nova.

| Tabela | Copia? | Observação |
|---|---|---|
| `patients` | ✅ | a linha raiz; `person_id` preservado, `user_id` = tenant de destino |
| `patient_nutrition_assessments` | ✅ | |
| `patient_adult_nutrition_assessments` | ✅ | |
| `patient_child_assessments` | ✅ | inclui percentis |
| `patient_geriatric_assessments` | ✅ | |
| `patient_parental_consents` | ✅ | acompanha o menor |
| `consent_records` | ⚠️ | **não copiar como ativo** — consentimento dado ao Tenant 1 não vale para o Tenant 2. Copiar só como histórico marcado, ou não copiar |
| `scheduled_visits` | ❌ | agenda é operação do tenant, não histórico do paciente |
| `client_exam_documents` | ✅ **só os do paciente** | exige o pré-requisito da §9.4.1 |
| Storage `patient-photos` | ✅ | copiar o arquivo para um novo caminho sob o prefixo do tenant de destino |
| Storage `client-exams` | ✅ **só os do paciente** | idem |
| `audit_log` | ❌ | é registro do tenant de origem |

Cuidados:
- **Remapeamento de FK**: cada linha copiada ganha `id` novo; qualquer FK interna
  (`patient_id`, `client_id`, `establishment_id`, `responsible_team_member_id`) precisa ser remapeada
  ou anulada. Referência a `team_members` do Tenant 1 **não existe** no Tenant 2 → `null`.
- **Storage**: copiar o objeto de fato (não referenciar o caminho do outro tenant, que a RLS do bucket
  bloquearia e que criaria dependência entre tenants). Contabilizar no `max_storage_mb` do destino.
- **Volume**: um paciente com anos de avaliações e exames pode ser pesado. A cópia roda em background
  (job/queue) com estado visível, não no request do formulário.


#### 9.4.1 Pré-requisito: exames precisam pertencer ao paciente, não ao cliente

**O problema, verificado no código:** `client_exam_documents.client_id` referencia `clients` — o exame está
pendurado no **cliente**, não no paciente. E um cliente pode ter **vários** pacientes:

- não existe unicidade em `patients (client_id)` para clientes PF — uma família inteira pode estar sob o
  mesmo cliente PF (`patients_client_pf_idx` é índice comum, não único);
- para cliente PJ (escola, empresa), os documentos daquele cliente são da **instituição** e de todos os
  pacientes vinculados a ela.

Consequência: copiar `client_exam_documents` filtrando por `client_id` levaria para o novo tenant os exames
**dos irmãos, dos colegas de escola ou de toda a empresa**. Isso é vazamento de dado de saúde de terceiros
que nem foram parte da autorização — o pior erro possível nesta fase.

Copiar o **cliente inteiro** junto também não serve: criaria no Tenant 2 um cliente que ele não cadastrou
(consumindo a cota de clientes dele), arrastaria o mesmo problema dos exames de terceiros, e é sem sentido
quando a origem é um cliente PJ.

**Decisão: tornar o exame vinculável ao paciente.** Migration `20261004110000_exam_documents_patient_link.sql`:

```sql
alter table public.client_exam_documents
  add column if not exists patient_id uuid references public.patients (id) on delete cascade;

create index if not exists client_exam_documents_patient_idx
  on public.client_exam_documents (patient_id) where patient_id is not null;

-- Backfill seguro: só quando não há ambiguidade — o cliente PF tem exatamente 1 paciente
update public.client_exam_documents d
set patient_id = sub.patient_id
from (
  select p.client_id, min(p.id) as patient_id
  from public.patients p
  join public.clients c on c.id = p.client_id and c.kind = 'pf'
  group by p.client_id
  having count(*) = 1
) sub
where d.client_id = sub.client_id and d.patient_id is null;
```

**O alvo é `patient_id NOT NULL`.** A tabela já é exclusivamente de exames — o `check` de categoria só
aceita `('previous', 'scheduled')`, isto é, exames anteriores e exames solicitados. Não há documento
institucional legítimo aqui; o que existir de PJ solto é resíduo de a UI
(`app/(app)/clientes/[id]/editar/page.tsx` renderiza `ClientExamDocumentList` para qualquer `kind`) nunca
ter perguntado de quem era o exame. Documento do estabelecimento tem lugar próprio (POPs, alvarás, dossiês).

Chegar lá em **duas etapas**, porque não dá para adivinhar o dono dos exames ambíguos:

1. **Agora**: coluna nullable + backfill não ambíguo + a ficha do paciente passa a ser o lugar de anexar
   exame (`components/clientes/client-exam-document-list.tsx` já faz o trabalho; é reaproveitar com
   `patient_id`). No upload dentro de um cliente com mais de um paciente, o profissional **escolhe de quem
   é o exame** — campo obrigatório no formulário. Os órfãos aparecem numa lista
   *"exames sem paciente definido"* para o tenant classificar.
2. **Depois**, quando a lista de órfãos zerar: `alter column patient_id set not null` e
   `client_id` vira derivado (ou some) — o exame passa a pertencer ao paciente, ponto final.

- **Regra da cópia**: `where patient_id = <paciente autorizado>`. Nunca por `client_id`. Exame sem
  `patient_id` **não** é copiado — na dúvida, não vai.

Ordem prática: essa migration é pequena e independente. Pode entrar bem antes da Fase 6 — e, se você quiser
lançar a cópia sem exames, a Fase 6 sai sem esta linha do inventário e os exames entram depois, sem retrabalho.

### 9.5 A execução da cópia

Função `public.copy_person_record_to_tenant(p_authorization_id uuid)`, `SECURITY DEFINER`, que:

1. valida que a autorização existe, está `approved`, não expirou e ainda não foi `executed`;
2. roda **em uma transação** — cópia parcial é pior que cópia nenhuma;
3. para cada tabela do inventário, insere as linhas no tenant de destino com `id` novo, gravando o par
   `(source_row_id, target_row_id)` em `patient_copy_operations`;
4. respeita o **limite de pacientes** do destino: se o Tenant 2 estiver na cota, a cópia falha com
   `LIMITE_PACIENTES_ATINGIDO` (o trigger da §5.1 já garante isso, mas a pré-checagem dá mensagem melhor);
5. marca a autorização como `executed` e grava `subscription_events`/`audit_log` nos dois tenants —
   origem e destino precisam ter registro de que a transferência aconteceu.

Também:

```sql
-- Único oráculo permitido: existe ou não. Nada além disso.
create or replace function public.person_exists_by_document(p_document text)
returns boolean security definer ...;
```

### 9.6 Fluxo

1. Tenant 2 digita o CPF no formulário de novo paciente.
2. `person_exists_by_document` responde `true` → a UI mostra:
   *"Este paciente já possui cadastro no NutriGestão. Deseja solicitar uma cópia dos dados ao titular?"*
   **Sem** dizer qual instituição, quando, ou qualquer dado clínico.
3. Tenant 2 pode seguir com o cadastro manual normalmente **ou** solicitar a cópia.
4. Solicitação → o titular recebe um link com token (e-mail/WhatsApp) que abre no **portal externo**
   — infraestrutura que já existe (`lib/actions/external-portal.ts`, `inviteExternalUserAction`,
   consentimento parental para menores). O texto diz, em linguagem simples: quais dados serão copiados,
   para qual estabelecimento, e que **a cópia não pode ser desfeita pelo NutriGestão**.
5. Aceite grava `decided_at`, IP e user-agent, muda o status para `approved` e espelha em `consent_records`.
6. O job executa `copy_person_record_to_tenant`. O Tenant 2 vê o paciente aparecer na sua lista, com um
   selo *"cadastro importado em <data>"*.
7. Recusa ou expiração encerram o pedido; o Tenant 2 vê apenas *"não autorizado"*, sem detalhe.

### 9.7 Depois da cópia

- **Sem sincronização.** As bases seguem separadas. É exatamente o isolamento que você pediu.
- **Atualizar = nova cópia.** O Tenant 2 pode solicitar de novo; `patient_copy_operations` permite copiar
  **só o que ainda não veio** (as linhas cujo `source_row_id` não está mapeado), evitando duplicar histórico.
  Cada nova cópia exige **nova autorização** do titular.
- **Revogação.** Não existe botão que apague a cópia. O titular exerce o direito de eliminação junto ao
  Tenant 2 pelo fluxo de DSAR existente (`lib/actions/dsar.ts`). O texto do consentimento tem que dizer isso.
- **Exclusão de conta / portabilidade**: `account-deletion.ts` e `portability.ts` precisam considerar
  `persons`, as autorizações e o mapa de cópias.

### 9.8 Riscos específicos desta fase

| Risco | Mitigação |
|---|---|
| `person_exists_by_document` vira **oráculo de CPF** (descobrir quem é paciente na plataforma) | Rate limit por tenant e por sessão; log de toda consulta em `person_lookup_log`; só chamável dentro do fluxo de criação de paciente; alerta ao super_admin acima de N consultas/dia |
| Cópia é irreversível | Dito de forma explícita no consentimento; auditada nos dois tenants; DSAR como caminho de exclusão |
| Cópia parcial por falha no meio | Transação única + status na autorização; job idempotente apoiado em `patient_copy_operations` |
| Cópia duplicando histórico em nova solicitação | Cópia incremental pelo mapa `(table_name, source_row_id)` |
| FK apontando para entidade inexistente no destino | Remapear ou anular; nunca copiar id de `team_members`/`establishments` do outro tenant |
| **Copiar exame de terceiro** (irmão, colega de escola, funcionário da empresa) | Copiar `client_exam_documents` **só** por `patient_id` (§9.4.1); nunca por `client_id`; exame sem paciente definido não é copiado |
| Storage estourando a cota do destino | Checar `max_storage_mb` antes de iniciar; recusar com mensagem clara |
| Solicitações em massa por um tenant | Limite de pedidos pendentes por tenant; o titular vê quem pediu; pedidos expiram |
| Base legal | Atualizar RIPD, Política de Privacidade e Termos **antes** da primeira cópia em produção |

> **Antes de codar esta fase**, vale validação jurídica do texto de consentimento e do RIPD — é o ponto do
> produto com maior exposição a sanção da ANPD e a reclamação de titular.

---

## 10. Retenção: exclusão lógica e prazo mínimo de guarda

Regra: **o estabelecimento pode "apagar" um paciente, mas o registro não sai do banco.** Ele é marcado
como inativo, some das telas, e só pode ser eliminado de fato depois do prazo mínimo de guarda.

### 10.1 O prazo: 20 anos após o último registro

**Decidido: 20 anos**, contados a partir do **último registro** do paciente — não da data da exclusão.

| Norma | O que diz |
|---|---|
| **CFN nº 594/2017, art. 3º VI** | prontuário **eletrônico**: *"guarda permanente, podendo ser eliminado 20 anos após o último registro"* (físico: mínimo 20 anos) |
| **LGPD art. 16, I** | não fixa prazo; **autoriza** conservar dado após o fim do tratamento para *cumprimento de obrigação legal ou regulatória* — é a base que sustenta reter mesmo diante de um pedido de exclusão |
| **Código Civil / CDC** | os 5 anos usuais valem para documento **fiscal e contratual**: cobrança, contrato, nota — não para prontuário |

**O prazo nunca vira constante no código.** Fica em tabela, com a base legal ao lado, para que um ajuste
jurídico seja um `UPDATE` e não um refactor:

```sql
create table if not exists public.retention_policies (
  record_class     text primary key,   -- 'patient_record' | 'financial' | 'contract' | 'audit'
  retention_years  integer not null check (retention_years > 0),
  legal_basis      text not null,
  updated_at       timestamptz not null default now()
);

insert into public.retention_policies (record_class, retention_years, legal_basis) values
  ('patient_record', 20, 'CFN 594/2017 art. 3º VI — prontuário eletrônico'),
  ('financial',       5, 'Código Civil / CDC — documentos fiscais e contratuais'),
  ('audit',           5, 'LGPD art. 37 — registro das operações de tratamento')
on conflict (record_class) do nothing;
```

### 10.2 Exclusão lógica — definitiva para o tenant

Migration `20261005120000_soft_delete_retention.sql`, nas tabelas de prontuário
(`patients`, as quatro de avaliação, `client_exam_documents`, `patient_parental_consents`):

```sql
alter table public.patients
  add column if not exists deleted_at       timestamptz,
  add column if not exists deleted_by       uuid references auth.users (id) on delete set null,
  add column if not exists deletion_reason  text,
  add column if not exists purge_after      timestamptz;   -- último registro + retenção da classe

create index if not exists patients_active_idx
  on public.patients (user_id) where deleted_at is null;

create index if not exists patients_purge_idx
  on public.patients (purge_after) where deleted_at is not null;
```

**O tenant não reativa.** Excluir libera vaga na cota — e é exatamente por isso que a exclusão **não pode ser
desfeita pelo tenant**. Sem essa trava, o ciclo *excluir → cadastrar outro → reativar o primeiro* daria
26, 27, 30 pacientes ativos pagando por 25. A trava vai no banco, não só na UI:

```sql
create or replace function public.block_patient_undelete()
returns trigger language plpgsql as $$
begin
  -- Única porta de reativação: a RPC de super_admin da §10.2.1
  if current_setting('app.admin_restore', true) = 'on' then
    return new;
  end if;

  if old.deleted_at is not null then
    -- Para o tenant, registro excluído é imutável: nem reativação, nem edição.
    if new.deleted_at is null then
      raise exception 'REATIVACAO_BLOQUEADA' using errcode = 'P0001';
    end if;
    if to_jsonb(new) - 'purge_after' is distinct from to_jsonb(old) - 'purge_after' then
      raise exception 'REGISTRO_EXCLUIDO_IMUTAVEL' using errcode = 'P0001';
    end if;
  end if;
  return new;
end; $$;

create trigger patients_block_undelete before update on public.patients
  for each row execute function public.block_patient_undelete();
```

Consequências que precisam estar coerentes:

- **Índice único de CPF ignora os excluídos** — senão o tenant que excluiu não consegue nunca mais
  cadastrar aquela pessoa:
  ```sql
  drop index if exists patients_user_document_uidx;
  create unique index patients_user_document_uidx
    on public.patients (user_id, document_id)
    where document_id is not null and deleted_at is null;
  ```
  Recadastrar a mesma pessoa cria uma linha **nova e vazia**, que **consome uma vaga**. O histórico antigo
  não volta. É o comportamento desejado: excluir é barato, mas custa o histórico.
- **Excluído não é arquivo grátis.** Se o tenant continuasse lendo o prontuário completo dos excluídos, a
  exclusão viraria um plano ilimitado disfarçado. A tela *"Registros excluídos"* mostra apenas **metadados**
  — nome, documento, quem excluiu, quando, data prevista de expurgo — para fins de auditoria e DSAR.
  O conteúdo clínico só é recuperável por pedido ao suporte, com registro em `audit_log`.
- **Confirmação honesta na UI.** O diálogo de exclusão diz, sem eufemismo: *"Esta ação é definitiva. O
  cadastro não poderá ser reativado e o histórico deixará de ficar acessível. Os dados serão mantidos
  apenas para cumprimento do prazo legal de guarda e eliminados depois."* Exigir digitar o nome do
  paciente para confirmar.
- **Reativação existe, mas só pela plataforma** — ação de `super_admin`, detalhada em §10.2.1.
- **Não conta no limite**: o trigger da §5.1 conta `where deleted_at is null`.
- **`deletePatientAction`** (`lib/actions/patients.ts:878`) hoje faz `delete()` de verdade e ainda apaga a
  foto do storage. Passa a fazer `update` com `deleted_at`, `deleted_by`, `deletion_reason`, `purge_after`,
  e **não toca no storage**. Mesma mudança em `deleteClientAction` e nas exclusões de avaliação.
- **Sinal comercial**: exclusões em volume são o tenant espremendo a cota. Contador de exclusões por
  período na ficha do tenant no painel — é gatilho de conversa de upgrade, não só de fiscalização.

#### 10.2.1 Reativação pelo super_admin

Exclusão feita por engano acontece, e o suporte precisa conseguir desfazer. A reativação existe, mas por
**um caminho único, verificado e auditado** — não por um `update` solto no SQL Editor.

```sql
create or replace function public.admin_restore_patient(
  p_patient_id uuid,
  p_reason     text,          -- comentário de quem executa (obrigatório)
  p_request_id uuid default null  -- pedido do tenant, quando houve
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
begin
  if not public.is_super_admin() then
    raise exception 'APENAS_SUPER_ADMIN' using errcode = 'P0001';
  end if;
  if coalesce(length(trim(p_reason)), 0) < 10 then
    raise exception 'MOTIVO_OBRIGATORIO' using errcode = 'P0001';
  end if;

  select user_id into v_owner from public.patients where id = p_patient_id and deleted_at is not null;
  if v_owner is null then
    raise exception 'REGISTRO_NAO_EXCLUIDO' using errcode = 'P0001';
  end if;

  -- A vaga tem de existir: reativar volta a ocupar cota
  if not public.tenant_has_free_patient_slot(v_owner) then
    raise exception 'LIMITE_PACIENTES_ATINGIDO' using errcode = 'P0001';
  end if;

  set local app.admin_restore = 'on';

  update public.patients
     set deleted_at = null, deleted_by = null, deletion_reason = null, purge_after = null,
         restored_at = now(), restored_by = (select auth.uid()), restore_reason = p_reason
   where id = p_patient_id;

  if p_request_id is not null then
    update public.record_restore_requests
       set status = 'approved', decided_at = now(), decided_by = (select auth.uid()),
           decision_comment = p_reason
     where id = p_request_id;
  end if;

  insert into public.subscription_events (tenant_user_id, event_type, new_value, metadata, created_by)
  values (v_owner, 'record_restored', p_patient_id::text,
          jsonb_build_object(
            'table', 'patients',
            'executor_comment', p_reason,
            'request_id', p_request_id
          ), (select auth.uid()));
end; $$;
```

Colunas extras em `patients` (e nas demais tabelas com soft delete): `restored_at`, `restored_by`,
`restore_reason`. Novo `event_type` `record_restored` em `subscription_events`.

Regras que fazem essa porta não reabrir a brecha da cota:

- **A cota é revalidada.** Se o tenant está em 25/25, a reativação **falha**. O painel mostra
  *"tenant está em 25/25 — ajuste o limite antes de restaurar"*, e a decisão de ampliar é sua, consciente,
  com o evento registrado. Sem isso, bastaria pedir ao suporte para ficar com 26 pacientes pagando 25.
- **Comentário obrigatório de quem executa**, mínimo 10 caracteres, gravado no evento e na linha (§10.2.2).
- **A reativação é visível para o tenant** — entra no `audit_log` dele e gera notificação. Nada silencioso.
- **`set local`**: a permissão vale só dentro daquela transação. Nenhum outro caminho enxerga a flag.
- Mesma função, mesmas regras, para `clients` (`admin_restore_client`).

No painel: na ficha do tenant, a lista de registros excluídos com botão **Restaurar**, campo de motivo e
o aviso de cota quando não houver vaga.

#### 10.2.2 Trilha de auditoria: comentário obrigatório dos dois lados

Toda saída e todo retorno de um registro precisa ter **quem, quando e por quê** — escrito por uma pessoa,
não deduzido depois. Vale para a exclusão e para a restauração.

**Na exclusão (feita pelo tenant).** `deletion_reason` deixa de ser opcional: o diálogo de exclusão exige
um comentário de no mínimo 10 caracteres, junto da confirmação por digitação do nome. A Server Action
valida antes de gravar e o `check` no banco garante:

```sql
alter table public.patients
  add constraint patients_deletion_reason_check check (
    deleted_at is null or coalesce(length(trim(deletion_reason)), 0) >= 10
  );
```

**No pedido de restauração (feito pelo tenant).** O tenant não restaura, mas **solicita** — e a
justificativa dele é metade da auditoria:

```sql
create table if not exists public.record_restore_requests (
  id                uuid primary key default gen_random_uuid(),
  tenant_user_id    uuid not null references auth.users (id) on delete cascade,
  table_name        text not null,          -- 'patients' | 'clients'
  record_id         uuid not null,
  requested_by      uuid not null references auth.users (id) on delete set null,
  request_comment   text not null
    constraint record_restore_requests_comment_check check (length(trim(request_comment)) >= 10),
  status            text not null default 'pending'
    constraint record_restore_requests_status_check
      check (status in ('pending','approved','denied','cancelled')),
  decided_by        uuid references auth.users (id) on delete set null,
  decided_at        timestamptz,
  decision_comment  text,
  ip_address        inet,
  user_agent        text,
  created_at        timestamptz not null default now()
);

create index if not exists record_restore_requests_pending_idx
  on public.record_restore_requests (status, created_at desc) where status = 'pending';
```

**Na execução (feita pelo super_admin).** `p_reason` da RPC é o comentário do executor, obrigatório mesmo
quando não houve pedido formal (restauração iniciada pelo próprio suporte). Ele vai para
`restore_reason` na linha, para `decision_comment` no pedido e para o `metadata` do evento.

**Recusa também tem comentário.** `admin_deny_restore_request(p_request_id, p_reason)` marca `denied` com
justificativa — negativa sem motivo registrado é o tipo de lacuna que aparece numa auditoria.

Resultado: para qualquer registro é possível reconstruir a história completa —
*excluído por X em <data>, motivo "…"; restauração pedida por Y, motivo "…"; aprovada por Z, comentário "…"*.

**Onde isso fica visível:**
- ficha do paciente/cliente: faixa com a última exclusão e restauração e seus comentários;
- painel do super_admin: fila de pedidos pendentes, com o comentário do tenant à vista na hora de decidir;
- `audit_log` do tenant + notificação, para que a decisão do suporte nunca seja silenciosa;
- exportável no atendimento a DSAR e em auditoria de conformidade.

### 10.3 Proibir o apagamento de fato — inclusive pelo painel do Supabase

Exclusão lógica só protege se ninguém conseguir dar `DELETE` direto:

```sql
create or replace function public.block_delete_before_retention()
returns trigger language plpgsql as $$
begin
  if current_setting('app.retention_purge', true) = 'on' then
    return old;   -- só o job de expurgo, e só depois do prazo
  end if;
  raise exception 'EXCLUSAO_BLOQUEADA_RETENCAO' using errcode = 'P0001';
end; $$;

create trigger patients_block_delete before delete on public.patients
  for each row execute function public.block_delete_before_retention();
```

O trigger vale para **todos os papéis**, inclusive `service_role` — é o que faz um `delete` disparado do
SQL Editor do Supabase falhar.

**Mas o trigger sozinho não basta: `DELETE` em cascata não passa por trigger de outra tabela.** As FKs
abaixo, levantadas no código atual, apagam prontuário em cascata sem tocar em nenhuma regra de negócio:

| Origem | FK | Efeito hoje |
|---|---|---|
| `patients.user_id` | `references auth.users (id) on delete cascade` | apagar o usuário do tenant no painel do Supabase apaga **todos** os pacientes dele |
| `patients.client_id` | `references public.clients (id) on delete cascade` | apagar um cliente apaga os pacientes dele |
| `patient_nutrition_assessments.patient_id` | `on delete cascade` | segue o paciente |
| `consent_records.patient_id` / `.user_id` | `on delete cascade` | segue o paciente e o tenant |
| `external_access_permissions.patient_id`, `external_portal_users.patient_id` | `on delete cascade` | seguem o paciente |

Migration `20261005121000_retention_fk_restrict.sql`: trocar para **`on delete restrict`** as FKs que
saem de `auth.users` e de `clients` para o prontuário. Com isso, apagar o usuário do tenant pelo dashboard
simplesmente **falha** — que é o comportamento correto.

As cascatas que saem de `patients` para os filhos (`*_assessments`, `consent_records`) podem **ficar**
como estão: `patients` não é mais deletável fora do expurgo, e no expurgo a cascata é justamente o que se
quer, para não sobrar órfão.

Complementos operacionais:
- Encerramento de conta continua por **anonimização/bloqueio**, nunca removendo a linha de `auth.users`.
  O fluxo atual (`lgpd_confirm_closure`, `account_closure_requests`) já bloqueia o perfil em vez de apagar
  — está alinhado; o que muda é que agora apagar deixa de ser tecnicamente possível.
- Documentar no runbook: *"não apague usuários pelo dashboard do Supabase"*, com a explicação de que a
  operação vai falhar por desenho.
- O expurgo (§10.4) é o único caminho de remoção, e passa pelo `set local app.retention_purge = 'on'`.

### 10.4 O expurgo, depois do prazo

Job agendado (`pg_cron` ou Edge Function em cron) que roda periodicamente:

1. seleciona linhas com `deleted_at is not null and purge_after < now()`;
2. `set local app.retention_purge = 'on'` — o único caminho que o trigger aceita;
3. apaga a linha e o objeto de storage correspondente;
4. grava em `retention_purge_log` (o que, quando, qual política) — o log **sobrevive** ao dado.

O `purge_after` conta a partir do **último registro** do paciente, não da data da exclusão, conforme
a redação da CFN 594/2017. Uma avaliação nova reabre a contagem.

### 10.5 Conflito com o direito de eliminação (LGPD art. 18, VI)

Quando o titular pede exclusão dos dados e a retenção obriga a guardar, a resposta não é "não posso" nem
apagar tudo. É:

- eliminar/anonimizar o que **não** está sob obrigação de guarda (marketing, preferências, contato
  comercial);
- **reter** o prontuário sob a base do art. 16, I, em estado inativo e sem uso para qualquer outra
  finalidade;
- **responder ao titular** dizendo o que foi eliminado, o que foi retido, por qual base legal e até quando.

Isso precisa estar no template de resposta do DSAR (`lib/actions/dsar.ts`) e na Política de Privacidade —
não pode ser decidido caso a caso pelo suporte.

### 10.6 Efeito na cópia entre tenants (§9)

- Paciente com `deleted_at` preenchido **não** é copiado, e não conta como "cadastro existente" para o
  `person_exists_by_document`.
- Linhas excluídas logicamente na origem **não** entram na cópia — o destino recebe só o que está ativo.

---

## 11. Testes

**Unitários (vitest)**
- `lib/limits/tenant-limits.test.ts` — matriz: desabilitado / abaixo / no limite / acima; unlimited de equipe.
- Validação de documento já coberta por `lib/validators/br-document.test.ts` — estender para o parser do tenant.

**RLS / banco (`vitest.config.rls.ts` — já existe no projeto)**
- Tenant não consegue alterar a própria `tenant_limits`; super_admin consegue.
- Trigger bloqueia o 26º cliente e o 26º paciente; libera após deletar um.
- Trigger bloqueia membro quando `team_members_enabled = false`.
- Membro inativo não conta para o limite de seats.
- **Isolamento (§4.4)**: autenticado como Tenant 2, `select` direto por id de um paciente do Tenant 1
  retorna **0 linhas**; `update` e `delete` do mesmo id não afetam nenhuma linha. Idem para `clients`.
  Isso vale **inclusive depois de uma cópia autorizada** — o Tenant 2 lê a cópia dele, nunca a origem.
- **Isolamento**: o mesmo CPF de paciente **pode** existir em dois tenants; dentro de um mesmo tenant,
  o segundo insert com o mesmo CPF é rejeitado pelo índice único composto.
- **Equipe**: um `member_user_id` ativo não pode ser vinculado a dois workspaces (índice único parcial);
  vínculo **inativo** em outro workspace é permitido.

**Cópia entre tenants (§9)**
- `copy_person_record_to_tenant` recusa autorização `pending`, `denied`, `expired` e já `executed`.
- Falha no meio da cópia faz rollback completo — nada de linhas órfãs no destino.
- Após a cópia: o Tenant 2 vê os dados na **sua** base; alterações no Tenant 1 **não** aparecem no Tenant 2,
  e vice-versa (é o comportamento esperado, precisa de teste que o fixe).
- Segunda cópia autorizada traz **só** as linhas ainda não mapeadas em `patient_copy_operations` —
  nada é duplicado.
- Nenhuma FK copiada aponta para `team_members`/`establishments` do tenant de origem.
- **Exames**: cliente PF com dois pacientes — a cópia do paciente A **não** leva nenhum exame do paciente B;
  exame com `patient_id` nulo não é copiado; exame de cliente PJ nunca é copiado.
- Cópia respeita o limite de pacientes do destino: tenant na cota recebe `LIMITE_PACIENTES_ATINGIDO`.
- `person_exists_by_document` devolve apenas booleano — nunca nome, tenant, datas ou id de paciente.
- Consentimento parental: menor exige `is_parental_consent` preenchido.

**E2E (Playwright, pasta `e2e/`)**
- `e2e/admin-tenant-limits.spec.ts` — super_admin cria tenant com limites, altera e vê refletido.
- `e2e/register-tenant.spec.ts` — cadastro público com CPF e com CNPJ; documento inválido; documento duplicado.
- `e2e/limits-blocking.spec.ts` — tenant no limite vê botão desabilitado e mensagem correta.

**Retenção (§10)**
- `delete from patients` direto levanta `EXCLUSAO_BLOQUEADA_RETENCAO`, inclusive para `service_role`.
- `deletePatientAction` marca `deleted_at`/`purge_after` e **não** apaga a foto do storage.
- Paciente excluído logicamente some das listagens, **libera vaga** na cota e aparece em "Registros excluídos".
- Apagar o `auth.users` do tenant **não** apaga pacientes em cascata (FK `restrict`).
- Job de expurgo não toca em linha com `purge_after` no futuro; com `purge_after` vencido, apaga e grava
  em `retention_purge_log`.
- `purge_after` é recalculado quando uma avaliação nova é registrada (conta do último registro).
- Paciente com `deleted_at` não é copiado e não conta em `person_exists_by_document`.
- **Sem reativação**: `update patients set deleted_at = null` levanta `REATIVACAO_BLOQUEADA`; qualquer
  outro `update` em linha excluída levanta `REGISTRO_EXCLUIDO_IMUTAVEL`.
- Ciclo de abuso: tenant na cota exclui um paciente, cadastra outro e tenta reativar o primeiro → falha.
- `admin_restore_patient` recusa quem não é super_admin, comentário curto e registro não excluído.
- Excluir sem comentário (ou com menos de 10 caracteres) é recusado pela Server Action **e** pelo `check`.
- Pedido de restauração sem justificativa é recusado pelo `check` da tabela.
- Após restaurar com `p_request_id`, o pedido fica `approved` com `decided_by`, `decided_at` e
  `decision_comment` preenchidos; a recusa grava `denied` com justificativa.
- `admin_restore_patient` recusa quando o tenant está na cota (`LIMITE_PACIENTES_ATINGIDO`) e passa depois
  que o limite é ampliado.
- Restauração grava `record_restored` em `subscription_events` e aparece no `audit_log` do tenant.
- A flag `app.admin_restore` não vaza da transação: um `update` seguinte, fora da RPC, volta a ser bloqueado.
- Recadastrar o mesmo CPF depois da exclusão **é permitido**, cria linha nova vazia e **consome vaga**.
- Reativar membro de equipe (`is_active` false → true) sem assento livre é bloqueado pelo trigger.

**Stripe**
- `stripe listen --forward-to localhost:3000/api/stripe/webhook` em dev; testar reentrega do mesmo evento
  (idempotência) e assinatura inválida (deve retornar 400).

---

## 12. Riscos e pontos de atenção

| Risco | Mitigação |
|---|---|
| Tenant existente acima do novo limite ao habilitar | Nunca apagar/ocultar dados; só bloquear novos inserts. Painel avisa antes de habilitar. |
| Múltiplos caminhos de insert escapando da validação | Trigger no banco é a fonte da verdade; TypeScript é só UX. |
| `service_role` ignorando limites | Trigger não distingue role por padrão — validar isso nos testes de RLS. |
| Corrida em inserts simultâneos | Aceitar estouro de 1 ou usar advisory lock por tenant. |
| Webhook do Stripe reprocessado | Tabela de idempotência + verificação de assinatura obrigatória. |
| Índice único global no CPF do paciente quebraria o multi-tenant | Unicidade **sempre** composta com a chave de tenant: `(user_id, document_id)`. Em `clients` não há unicidade nenhuma (unidades da mesma empresa) — só aviso. A unicidade global fica em `persons.document_hash`. |
| Cópia de prontuário entre tenants sem base legal (§9) | Autorização específica do titular, com IP e data; texto deixa explícito que a cópia é irreversível; RIPD, Termos e Política revisados **antes** da primeira cópia. |
| `person_exists_by_document` usado como oráculo de CPF | Rate limit, log de consultas, chamável só no fluxo de criação de paciente, alerta ao super_admin. |
| Mesmo usuário ativo em dois workspaces → `limit 1` escolhe tenant arbitrário | Índice único parcial em `team_members(member_user_id) where is_active` + validação na Server Action. |
| Documento fiscal é dado pessoal (LGPD) | Entra no fluxo de DSAR/portabilidade já existente (`lib/actions/dsar.ts`, `portability.ts`); mascarar em logs. |
| Cadastro público aberto a abuso | Captcha + rate limit + confirmação de e-mail antes do primeiro login. |
| **Cascade de FK apaga prontuário** (`patients.user_id`/`client_id` são `on delete cascade`) | Trocar para `restrict` — cascata não passa por trigger, então só a FK protege. Apagar usuário pelo dashboard do Supabase passa a falhar por desenho. |
| Excluir/reativar para burlar a cota | Tenant não reativa (`REATIVACAO_BLOQUEADA`); restauração só por `super_admin`, **revalidando a cota**; reativar membro de equipe revalida o limite; excluídos mostram só metadados, não viram arquivo grátis. |
| Prazo de guarda cravado no código | `retention_policies` com base legal por classe: 20 anos para prontuário (CFN 594/2017), 5 para financeiro. Ajuste vira `UPDATE`. |
| Pedido de eliminação do titular vs. obrigação de guarda | Template de DSAR que elimina o não obrigatório, retém o prontuário sob LGPD art. 16, I, e **informa** o titular do que foi retido e até quando. |

---

## 13. Ordem de execução sugerida

| # | Entrega | Depende de | Tamanho |
|---|---|---|---|
| 1 | Migrations: `profiles.document_*`, `tenant_limits`, trigger de criação, backfill, novos event types | — | P |
| 1b | Isolamento (§4.4): índices únicos compostos em `patients`/`clients`, índice único de `member_user_id` ativo, limpeza de duplicatas | 1 | P |
| 2 | Trigger de enforcement + testes de RLS | 1 | M |
| 3 | `lib/limits/tenant-limits.ts` + integração nas Server Actions + mensagens pt-BR | 2 | M |
| 4 | Painel super_admin: card de limites na ficha + novo passo no wizard + colunas na lista | 1 | M |
| 5 | UI do tenant: badges de uso, botões desabilitados, guard da rota `/equipe` | 3 | P |
| 6 | CPF/CNPJ no wizard admin, onboarding e perfil | 1 | P |
| 7 | Reabertura do `/register` com captcha e confirmação de e-mail | 6 | M |
| 8 | Stripe: dados, checkout, portal, webhook, sincronização de seats | 4 | G |
| 9 | E2E + documentação operacional (runbook de mudança de limite) | todas | P |
| 9b | Exames pertencem ao paciente (§9.4.1): `client_exam_documents.patient_id`, backfill não ambíguo, escolha obrigatória no upload, lista de órfãos; `not null` numa 2ª migration | — | M |
| 9c | **Retenção (§10)** — `retention_policies` (20 anos), soft delete no prontuário, triggers que bloqueiam `DELETE` e reativação, FKs `cascade` → `restrict`, tela "Registros excluídos" (só metadados), pedidos de restauração com comentário obrigatório e restauração por super_admin, job de expurgo, template de DSAR | 2 | M |
| 10 | **Fase 6 (§9)** — `persons`, `person_id` em `patients`, autorizações, job de cópia com remapeamento de FK e storage, fluxo de aceite no portal externo | 1b, 7, 9b, 9c · validação jurídica | GG |

Os itens 1–5 já entregam **todo o controle comercial pedido** e podem ir para produção
independentemente do Stripe. O item 8 troca a operação manual por automática.
O item 10 é um épico próprio: muda o modelo de dados do paciente e tem a maior exposição jurídica do
projeto — não deve ser embutido na mesma entrega dos limites.
