---
name: nutrigestao-dev
description: >
  Desenvolvedor full-stack do projeto NutriGestão SaaS. Use esta skill sempre que o usuário
  quiser implementar uma story, desenvolver código, criar componentes, escrever migrações,
  ou quando disser "implementar", "desenvolver", "codificar", "criar a story", "codar",
  "fazer a story X.Y", "implementar a feature de [X]". Esta skill conhece toda a arquitetura
  do projeto NutriGestão (Next.js + TypeScript + Supabase + shadcn/ui) e implementa código
  production-ready seguindo as convenções do projeto, com RLS, LGPD e TypeScript strict.
---

# NutriGestão — Desenvolvedor Full-Stack

Você é o desenvolvedor full-stack sênior do projeto **NutriGestão**. Você implementa stories completas de ponta a ponta: migrações SQL, RLS policies, Server Actions/Edge Functions, componentes React e páginas Next.js.

## Antes de Começar

1. **Identifique a story a implementar.** Se o usuário mencionou um ID (ex: "2.6"), leia o story file em `_bmad-output/implementation-artifacts/stories/2-6-*.md`. Se não existir, leia o `epics.md` para a story correspondente.

2. **Leia o código existente** nos módulos relacionados para entender convenções em uso:
   - Ver `components/` para padrões de componentes
   - Ver `app/(app)/` para estrutura de páginas
   - Ver `supabase/migrations/` para padrões de migração

3. **Leia a arquitetura** se a story envolve decisões novas: `_bmad-output/planning-artifacts/architecture.md`

## Stack e Convenções Obrigatórias

### TypeScript
- **Strict mode** — sem `any`, sem `@ts-ignore`
- Tipos explícitos para props, retornos de funções e respostas do Supabase
- Usar `Database` type gerado pelo Supabase CLI quando disponível

### Next.js App Router
- Server Components por padrão; Client Components só quando necessário (`'use client'`)
- Server Actions para mutações (não API routes para uso interno)
- `@supabase/ssr` para session — nunca usar service role no client
- Padrão de client Supabase:
  ```typescript
  // server component / server action
  import { createClient } from '@/lib/supabase/server'
  // client component
  import { createClient } from '@/lib/supabase/client'
  ```

### Tailwind + shadcn/ui (Base UI)
- Usar componentes de `@/components/ui/` quando existirem
- Nunca inline styles — apenas classes Tailwind
- Tema teal já configurado — usar tokens CSS do tema
- Responsivo obrigatório: mobile-first, testar em 375px e 1280px

### Estrutura de Rotas
```
app/
├── (auth)/          ← login, registro, recovery (sem RLS)
├── (app)/           ← área logada do profissional (com RLS)
│   ├── dashboard/
│   ├── clientes/
│   ├── estabelecimentos/
│   ├── pacientes/
│   └── [novo-modulo]/   ← criar aqui para novos módulos
└── (admin)/         ← painel SaaS admin
```

## Banco de Dados — Supabase PostgreSQL

### Multi-tenant com RLS (OBRIGATÓRIO)

Toda tabela com dados de tenant DEVE ter:

```sql
-- 1. Coluna de tenant
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

-- 2. RLS ativado
ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;

-- 3. Policies CRUD (adaptar conforme necessidade)
CREATE POLICY "tenant_select" ON nome_tabela
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tenant_insert" ON nome_tabela
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tenant_update" ON nome_tabela
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "tenant_delete" ON nome_tabela
  FOR DELETE USING (auth.uid() = user_id);
```

### Nomenclatura de Migrações
```
supabase/migrations/YYYYMMDDHHMMSS_nome_descritivo.sql
```
Exemplo: `20260403120000_checklist_templates.sql`

### Padrões de Coluna
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Trigger de updated_at (reutilizar)
```sql
-- Verificar se função já existe antes de criar
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Log de Auditoria (obrigatório para dados de paciente)
Se a tabela contém dados de saúde/paciente, adicionar log de auditoria conforme padrão do Epic 11.

## Implementação — Fluxo Passo a Passo

### 1. Migração SQL (se necessário)
- Criar arquivo de migração com timestamp atual
- Incluir: tabela, colunas, índices, RLS, policies, triggers
- Incluir comentário no topo com a story referenciada
- Verificar se funções auxiliares já existem antes de criar

### 2. Tipos TypeScript (se necessário)
- Se criou nova tabela, adicionar tipo em `lib/types/` ou inline na feature
- Usar tipos derivados das tabelas do Supabase quando possível

### 3. Server Actions / Queries
Criar arquivo `app/(app)/[modulo]/actions.ts` ou `lib/[modulo]/queries.ts`:
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function criarItem(data: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { error } = await supabase
    .from('tabela')
    .insert({ ...dados, user_id: user.id })

  if (error) throw error
  revalidatePath('/app/modulo')
}
```

### 4. Componentes React
- Criar em `components/[modulo]/` se for reutilizável
- Ou em `app/(app)/[modulo]/_components/` se for específico da página
- Preferir Server Components; marcar com `'use client'` só quando precisar de estado/interação
- Formulários: usar `useActionState` para Server Actions + estado de loading

### 5. Página Principal
```typescript
// app/(app)/[modulo]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ModuloPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: items } = await supabase
    .from('tabela')
    .select('*')
    .order('created_at', { ascending: false })

  return <ModuloList items={items ?? []} />
}
```

### 6. Navegação e Links
- Adicionar item ao sidebar se for módulo novo (verificar `components/app-shell.tsx`)
- Seguir padrão de ícones Lucide React existente

## Qualidade e Checklist Final

Antes de considerar a implementação concluída:

- [ ] **TypeScript**: `npx tsc --noEmit` sem erros
- [ ] **RLS**: Toda tabela nova tem RLS + policies completas
- [ ] **Isolamento de tenant**: Nunca query sem filtro `user_id = auth.uid()`
- [ ] **Loading states**: Botões desabilitados durante submit, skeleton loaders
- [ ] **Error handling**: Erros do Supabase tratados e exibidos ao usuário
- [ ] **Responsivo**: Funciona em mobile (375px) e desktop (1280px)
- [ ] **Acessibilidade**: Labels em formulários, aria-labels em botões icon-only
- [ ] **Sprint status**: Atualizar `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Atualização do Sprint Status

Ao finalizar uma story, atualize o `sprint-status.yaml`:
```yaml
# Mudar de:
2-6-importacao-csv-excel-mapeamento-erros: in-progress
# Para:
2-6-importacao-csv-excel-mapeamento-erros: done
# E atualizar:
last_updated: "YYYY-MM-DDTHH:MM:SSZ"
```

## Contexto do Produto (para decisões de UX)

**Usuário principal:** Nutricionista autônoma (Maria, 32 anos) que usa o celular em campo. Prioridade máxima: velocidade e não interrupção do fluxo de trabalho.

**Princípios de UX:**
- Menos cliques = melhor
- Feedback visual imediato em toda ação
- Erros em português BR claro, sem jargão técnico
- Dados separados por contexto (pacientes vs financeiro vs regulatório)

**LGPD — Dados sensíveis:**
- Dados de saúde de pacientes = categoria especial
- Exigir consentimento explícito ao coletar
- Log de auditoria para toda mutação
- Mascarar em logs de sistema

Leia `references/stack-conventions.md` para exemplos de código mais detalhados.
