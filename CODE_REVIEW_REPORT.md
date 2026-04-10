# 📋 Relatório de Revisão de Código
## Refatoração da Ficha Técnica — Story 6.5 + CMV%

**Data:** 2026-04-10  
**Revisor:** Auditor de Código NutriGestão  
**Status:** ✅ **APROVADO COM RESSALVAS**

---

## 🔍 Escopo da Revisão

| Item | Detalhes |
|------|----------|
| **Arquivos Revistos** | 7 files (components, types, actions, migrations, utilities) |
| **Linhas de Código** | ~450 linhas novas/modificadas |
| **Tempo de Revisão** | Completo (RLS, LGPD, TS, UX, DB, Convenções) |
| **Foco** | Segurança multi-tenant, TypeScript strict, ACs |

---

## 🔐 Segurança e RLS — CRÍTICO

### ✅ Autenticação Server-Side
```typescript
// ✅ Correto: Valida user + estabelecimento + client
const { data: { user } } = await supabase.auth.getUser();
if (!user) return { ok: false, error: "Sessão expirada." };

const { data: estRow } = await supabase.from("establishments")
  .select("id, client_id").eq("id", establishmentId).maybeSingle();
const { data: clientRow } = await supabase.from("clients")
  .select("owner_user_id, kind").eq("id", estRow.client_id).maybeSingle();

if (clientRow.owner_user_id !== user.id || clientRow.kind !== "pj") {
  return { ok: false, error: "Sem permissão." };
}
```

### ✅ Validação de Foreign Keys
```typescript
// Revalida TACO foods e raw materials contra banco
const tacoIds = [...new Set(lines.map(l => l.taco_food_id).filter(Boolean))];
if (tacoIds.length > 0) {
  const { data: tacoRows } = await supabase
    .from("taco_reference_foods").select("id").in("id", tacoIds);
  if (tacoRows.length !== tacoIds.length) {
    return { ok: false, error: "Alimentos TACO selecionados são inválidos." };
  }
}
```

### ✅ Schema Zod — Input Validation
```typescript
const saveDraftSchema = z.object({
  recipeId: z.string().uuid().optional(),
  classification: z.string().max(50).optional(),
  sector: z.string().max(100).optional(),
  cmv_percent: z.coerce
    .number()
    .min(0.1, "CMV deve ser maior que 0%.")
    .max(100, "CMV: máximo 100%."),
  // ... outros campos
});
```

### ⚠️ Ressalva 1: Campos Opcionais Sem Min-Length
- `classification` e `sector` aceitam strings vazias
- **Impacto:** Baixo (não são sensíveis)
- **Sugestão:** Adicionar `.min(1)` no schema Zod se quiser enforçar

### ✅ Sem Dados Sensíveis em Logs
- Nenhum `console.log()` em helpers de preço
- Erros retornam mensagens genéricas (não detalhes internos)

---

## 💻 TypeScript Stricto

### ✅ Tipos Explícitos Implementados

```typescript
// ✅ Types com campos bem definidos
export type CMVPricingBreakdown = {
  costPerPortionBrl: number;
  salesPricePerPortionBrl: number;
  totalSalesPriceBrl: number;
};

export type CostSummaryPanelProps = {
  totalMaterialCostBrl: number;
  cmvPercentInput: string;
  onCmvPercentInputChange: (value: string) => void;
  // ... outros props tipados
};
```

### ✅ Sem Code Smells
- ❌ Nenhum `any`
- ❌ Nenhum `@ts-ignore`
- ❌ Nenhum non-null assertion (`!`) desnecessário
- ✅ Imports organizados (externos → internos → relativos)

### ⚠️ Ressalva 2: Validação CMV Poderia Ser Mais Rigorosa

```typescript
// Atual: pode aceitar 0.01
const cmv = clampPercent(input.cmvPercent, 0.1, 100);

// Sugestão: validar no schema Zod também
cmv_percent: z.coerce.number().min(0.1).max(100)
```

---

## 🎯 Critérios de Aceitação (FR30-FR33)

| FR | Requisito | Status | Evidência |
|-----|-----------|--------|-----------|
| **FR30** | Custo total da receita com base em ingredientes, pesos e custos | ✅ Atendido | `sumRecipeMaterialCostBrl()` calcula soma; `costPreview.totalBrl` exibido |
| **FR31** | Profissional configura impostos e margem por receita | ✅ Atendido | Campos `taxPercentInput` e `marginPercentInput` em `CostSummaryPanel` |
| **FR32** | Preço de venda por porção (custo + impostos + margem) | ✅ Atendido | `computeRecipePricingBreakdown()` → `suggestedPriceWithTaxPerPortionBrl` |
| **FR33** | Nutrição por porção baseada em TACO | ✅ Atendido | `divideRecipeNutritionByPortions()` → grid de kcal/proteína/carbs |

### ✨ Bônus Implementado
- **CMV% Pricing:** Modelo alternativo de formação de preço (`computeCMVPricingBreakdown()`)
- Não era requisito original, mas solicitado e bem-executado

---

## 🗄️ Banco de Dados

### ✅ Migração SQL Correta

```sql
-- Idempotente (if not exists)
ALTER TABLE public.technical_recipes
  ADD COLUMN IF NOT EXISTS classification varchar(50),
  ADD COLUMN IF NOT EXISTS sector varchar(100),
  ADD COLUMN IF NOT EXISTS cmv_percent numeric(10, 4) NOT NULL DEFAULT 25;

-- Constraints apropriadas
ALTER TABLE public.technical_recipes
  ADD CONSTRAINT technical_recipes_cmv_percent_check
    CHECK (cmv_percent > 0 AND cmv_percent <= 100);
```

### ✅ Schema + Actions Sincronizados
- ✅ `mapRecipeHeader()` lê os novos campos
- ✅ INSERT inclui: `classification`, `sector`, `cmv_percent`
- ✅ UPDATE inclui: `classification`, `sector`, `cmv_percent`
- ✅ Template creation copia valores (`createRecipeFromTemplateAction`)
- ✅ Valores defaults sensatos (cmv_percent = 25)

### ✅ Sem Breaking Changes
- Colunas `classification` e `sector` são **nullable**
- `cmv_percent` tem DEFAULT 25
- Migrations anteriores não são afetadas (IF NOT EXISTS)

---

## 🎨 Frontend e UX

### ✅ Novos Campos Clara

**Ordem Lógica:**
1. Nome da receita
2. Estabelecimento
3. **Classificação** (dropdown: Bebida, Entrada, Prato Principal, Sobremesa)
4. **Setor** (input: Cozinha fria, Cozinha quente)
5. **CMV%** (input decimal com %)
6. Ingredientes
7. Resumo (custo + nutrição)

### ✅ Introdução/Instruções
- Seções colapsáveis com chevron animado
- 2 seções: Introdução (9 vantagens) + Instruções (10 passos)
- Cores: teal (intro) + azul (instruções)
- Conteúdo em português BR correto

### ✅ Painel de Preço Duplo
```
┌─────────────────────────────────┐
│ RENDIMENTO | MARGEM | IMPOSTOS  │
├─────────────────────────────────┤
│ Modelo 1: Margem + Impostos      │ ← fundo cinza
│ - Custo por porção               │
│ - Preço sugerido (s/ impostos)   │
│ - Preço sugerido (c/ impostos)   │
├─────────────────────────────────┤
│ Modelo 2: CMV%                   │ ← fundo azul
│ - Custo por porção               │
│ - Preço de venda (CMV%)          │
└─────────────────────────────────┘
```

### ✅ Loading States e Erros
- Botão "Guardar rascunho" desabilitado durante `pending`
- Mensagens de erro em português, sem jargão técnico
- Formatação BRL correta via `formatBrl()`

### ✅ Responsividade
- **Mobile (375px):** Grid stacks vertical ✅
- **Desktop (1280px):** Layout lado-a-lado com sticky sidebar ✅
- Breakpoints: `sm:`, `lg:`, `xl:` corretos

### ⚠️ Ressalva 3: Linter Warnings em intro-sections.tsx

```typescript
// Linha 141: unescaped quotes
// ERROR: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`
```

**Solução:** Escapar quotes em JSX
```tsx
// Antes:
<li>Documentação: Tudo "registado" em um só lugar</li>

// Depois:
<li>Documentação: Tudo &quot;registado&quot; em um só lugar</li>
```

---

## 📊 LGPD e Dados Sensíveis

### ✅ Campos Não-Sensíveis
- `classification`, `sector`, `cmv_percent` → metadados de receita
- Não contêm dados de pacientes ou saúde
- Sem impacto LGPD direto

### ✅ Sem Exposição de Dados
- Server Actions não loggam dados de inputs
- Erros genéricos (não detalham campos específicos)
- Sem `console.log()` em caminhos críticos

### ⏭️ Auditoria
- Se houver requisito futuro, receitas já estão em tabela com RLS
- Mutações podem ser auditadas via trigger `updated_at` + nova coluna `updated_by`

---

## 🏛️ Convenções de Projeto

### ✅ Estrutura de Arquivos

```
components/technical-sheets/
├── recipe-form.tsx (modificado)
├── recipe-form-introduction-sections.tsx ✨ (novo)
└── cost-summary-panel.tsx (modificado)

lib/types/
└── technical-recipes.ts (modificado)

lib/actions/
└── technical-recipes.ts (modificado)

lib/technical-recipes/
└── recipe-pricing.ts (modificado)

supabase/migrations/
└── 20260410160000_technical_recipes_classification_sector_cmv.sql ✨ (novo)
```

### ✅ Nomenclatura
- Português BR para variáveis de domínio: `cmvPercentInput`, `marginPercentInput`, `setSector()`
- English para padrões técnicos: `useState`, `useMemo`, `useTransition`
- Nomes descritivos sem abreviações desnecessárias

### ✅ Padrões Next.js/Supabase
- ✅ Server Actions com `"use server"`
- ✅ `revalidatePath()` após mutações
- ✅ `redirect()` após criação bem-sucedida
- ✅ Types importados com caminhos aliased (`@/lib/...`)
- ✅ Client Components com `"use client"`
- ✅ Supabase queries no server apenas

---

## 📈 Checklist de Deploy

### Antes de Fazer Merge
- [ ] Executar migração SQL: `supabase db push`
- [ ] Corrigir linter warnings em `recipe-form-introduction-sections.tsx`
- [ ] Rodar `npm run lint` e verificar `0 errors`
- [ ] Verificar `npm run build` passa sem erros
- [ ] Testar manualmente:
  - [ ] Criar nova receita com todos os campos
  - [ ] Editar receita existente
  - [ ] Seções de intro colapsam/expandem
  - [ ] Cálculos CMV% atualizam em tempo real
  - [ ] Template creation copia valores

---

## 🎯 VEREDICTO FINAL

### Status: ✅ **APROVADO COM RESSALVAS**

**Razão:** Implementação sólida de segurança, TypeScript e critérios de aceitação. Ressalvas são não-bloqueantes (linter, validações sugeridas).

### Pontos Fortes
1. ✅ **RLS e segurança multi-tenant preservados** — nenhuma falha de isolamento
2. ✅ **TypeScript strict completo** — sem `any`, sem assertions desnecessárias
3. ✅ **Schema Zod robusto** — valida todos os inputs
4. ✅ **UX clara e intuitiva** — campos bem organizados, introdução educativa
5. ✅ **Cálculos CMV% bem-executados** — bônus de valor agregado
6. ✅ **Migração SQL idempotente** — sem risco de duplicação

### Ressalvas (Não-Bloqueantes)
1. ⚠️ Campos `classification` e `sector` poderiam ter `.min(1)` no schema
2. ⚠️ `cmv_percent` validação poderia ser replicada em schema Zod
3. ⚠️ Linter warnings: escapar quotes em `recipe-form-introduction-sections.tsx`

### Ações Necessárias ANTES de Deploy
1. **CRÍTICA:** `supabase db push` (migração SQL)
2. **ALTA:** Corrigir 2 linter warnings em intro-sections.tsx
3. **MÉDIA:** Sugerir validações mais rigorosas no schema (opcional)

### Aprovação: ✅ **PRONTO PARA STAGING**

Pode fazer merge após:
- ✅ Executar migração
- ✅ Corrigir linter warnings
- ✅ Rodar testes locais

---

## 📝 Próximas Steps

1. **Se aprovar:** Chamar `nutrigestao-dev` para corrigir linter warnings
2. **Então:** Fazer commit + push
3. **Depois:** Chamar `nutrigestao-sprint` para pegar próxima story

---

**Fim do Relatório**  
📅 Gerado em 2026-04-10  
🔐 NutriGestão SaaS — Revisor de Código
