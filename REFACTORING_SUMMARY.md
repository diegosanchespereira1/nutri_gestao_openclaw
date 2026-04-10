# Ficha Técnica - Refatoração Completa

## ✅ Trabalho Realizado

### 1. Seções de Introdução (RecipeFormIntroductionSections)
- ✅ Criado componente com seções colapsáveis
- ✅ Introdução sobre FTP (Ficha Técnica de Preparação)
- ✅ Vantagens de usar FTP (9 pontos)
- ✅ Instruções de preenchimento passo a passo (10 passos)
- ✅ Design com cores (teal para intro, azul para instruções)

### 2. Novos Campos na RecipeForm
- ✅ **Classificação**: Dropdown (Bebida, Entrada, Prato Principal, Sobremesa)
- ✅ **Setor**: Campo texto (Ex: Cozinha fria, Cozinha quente)
- ✅ **CMV%**: Campo decimal com padrão 25%

### 3. Cálculos de Preço baseado em CMV%
- ✅ Nova função `computeCMVPricingBreakdown()`
- ✅ Fórmula: Preço Venda Receita = Custo Total / CMV%
- ✅ Preço Porção = Preço Total / Porções
- ✅ Exibe em painel separado com cor azul

### 4. Banco de Dados
- ✅ Tipo `TechnicalRecipeRow` atualizado com:
  - `classification: string | null`
  - `sector: string | null`
  - `cmv_percent: number` (padrão: 25)
- ✅ Schema validação atualizado
- ✅ Funções de mapping atualizadas
- ✅ INSERT e UPDATE statements atualizados
- ✅ Template creation atualizado

### 5. Migração SQL
- ✅ Arquivo: `supabase/migrations/20260410160000_technical_recipes_classification_sector_cmv.sql`
- ✅ Adiciona 3 colunas à tabela `technical_recipes`
- ✅ Constraints para validação de CMV%

### 6. Painel de Custo (CostSummaryPanel)
- ✅ Agora exibe DOIS modelos de preço:
  1. **Modelo Margem+Impostos** (existente)
  2. **Modelo CMV%** (novo - painel azul)
- ✅ CMV% pode ser ajustado em tempo real
- ✅ Cálculos atualizados instantaneamente

## 📋 Arquivos Modificados

### Components
1. **components/technical-sheets/recipe-form.tsx**
   - Adicionado import RecipeFormIntroductionSections
   - Adicionado estado: classification, sector, cmvPercentInput
   - Adicionados campos de entrada para novos valores
   - Atualizado handleSubmit para enviar novos campos
   - Passados novos props para CostSummaryPanel

2. **components/technical-sheets/recipe-form-introduction-sections.tsx** (NOVO)
   - Seções colapsáveis com chevron animado
   - Introdução e instruções conforme Excel original

3. **components/technical-sheets/cost-summary-panel.tsx**
   - Adicionado import: computeCMVPricingBreakdown
   - Adicionados props: cmvPercentInput, onCmvPercentInputChange
   - Adicionado campo CMV% no formulário (grid 4 cols)
   - Adicionado painel de cálculo CMV% (azul)

### Types
4. **lib/types/technical-recipes.ts**
   - Adicionados campos opcionais em TechnicalRecipeRow

### Actions
5. **lib/actions/technical-recipes.ts**
   - Atualizado saveDraftSchema com validações
   - Atualizado mapRecipeHeader para ler novos campos
   - Atualizado saveTechnicalRecipeDraftAction (INSERT e UPDATE)
   - Atualizado createRecipeFromTemplateAction

### Utilitários
6. **lib/technical-recipes/recipe-pricing.ts**
   - Adicionado tipo: CMVPricingBreakdown
   - Adicionada função: computeCMVPricingBreakdown()

### Migrations
7. **supabase/migrations/20260410160000_technical_recipes_classification_sector_cmv.sql** (NOVO)

## 📊 Cálculos Implementados

### CMV% (Novo)
```
Preço Venda Receita = Custo Total / (CMV% / 100)
Preço Venda Porção = Preço Venda Receita / Porções
Custo Porção = Custo Total / Porções

Exemplo: Custo R$100, CMV 25%
→ Preço Receita = R$100 / 0.25 = R$400
→ Preço Porção (5) = R$400 / 5 = R$80/porção
```

### Margem + Impostos (Existente)
```
Custo Porção = Custo Total / Porções
Preço Base = Custo Porção × (1 + Margem%/100)
Preço Final = Preço Base × (1 + Imposto%/100)
```

## 🎨 Layout Refinado

### Nova Ordem de Campos
1. Seções colapsáveis (Introdução + Instruções)
2. Nome da receita
3. Estabelecimento
4. Classificação (Bebida, Entrada, etc)
5. Setor
6. CMV%
7. Ingredientes (com escalonamento)
8. Resumo à direita (custo, nutrição, preço)

### Painel de Preços
- **Modelo 1**: Margem + Impostos (fundo cinza)
- **Modelo 2**: CMV% (fundo azul)
- Ambos calculados em tempo real

## 🔍 Próximas Etapas

1. Executar migração SQL no banco de dados
2. Testar com dados do Excel (Sanduíche de Frango)
3. Verificar compilação TypeScript
4. Testar responsividade (375px mobile, 1280px desktop)
5. Validar RLS e permissões multi-tenant

## 📝 Notas de Implementação

- Todos os cálculos são em tempo real (useMemo)
- CMV% tem padrão de 25% conforme Excel
- Campos de classificação e setor são opcionais
- Compatível com sistema de templates existente
- RLS preservado para multi-tenant
