# NutriGestão — Design System 2.0

**Base:** @base-ui/react + Tailwind CSS v4
**Modo:** Light (primário) com suporte a Dark
**Contexto:** Dashboard profissional data-dense — conformidade regulatória, dados clínicos, indicadores financeiros
**Versão:** 2.0.0 — Retrofit baseado na arquitetura visual Datadog (densidade, hierarquia, confiança)
**Data:** 2026-04-07

---

## 0. O Que Mudou do Design System 1.0

| Aspecto | v1.0 (atual) | v2.0 (retrofit) |
|---------|-------------|-----------------|
| **Paleta primária** | Teal genérico (`hsl(173 80% 26%)`) | Teal calibrado com escala completa e tokens semânticos |
| **Tipografia** | Geist Sans (padrão Next.js) | Inter + tabular-nums obrigatório para métricas |
| **Cards** | Estrutura básica shadcn | MetricCard com sparkline, delta e status border |
| **Gráficos** | chart-colors implícitos | Paleta formalizada por contexto (conformidade, financeiro, clínico) |
| **Status** | Badge genérico | StatusBadge com dot pulsante + 7 estados semânticos |
| **Sidebar** | Light background (`hsl(168 33% 94%)`) | Dark sidebar profissional (Datadog-style) |
| **Densidade** | Espaçamento padrão shadcn | Dois modos: compact (tabelas) e default (formulários) |
| **Animações** | tw-animate-css irrestrito | Princípio definido: métricas sem animação, feedback só onde orientam |
| **Empty states** | Não padronizado | Padrão EmptyState + ErrorState + SkeletonCard formalizados |

---

## 1. Princípios de Design

| Princípio | Descrição |
|-----------|-----------|
| **Conformidade visível** | O estado regulatório (conforme/alerta/crítico) deve ser legível em 2 segundos. Nunca esconder em sub-menus. |
| **Hierarquia clínica** | O que está acontecendo agora (visitas ativas) > compliance > histórico > configuração. |
| **Densidade inteligente** | Dashboards exibem dados de múltiplos estabelecimentos. Espaçamento generoso em formulários clínicos; compacto em listas e tabelas. |
| **Confiança profissional** | Paleta teal sóbria — verde é conformidade, não decoração. Gradientes apenas em fundos de hero. |
| **Velocidade de campo** | Maria usa o celular em visitas. Feedback imediato. Skeletons, não spinners globais. Ações críticas a 1 toque. |
| **Auditabilidade** | Toda ação de mutação em dados de paciente exibe confirmação e tem log visível. |

---

## 2. Tokens de Cor

### 2.1 Paleta Base — Tema Teal Profissional

```css
/* app/styles/theme-nutri-teal-v2.css */
/* Aplicar via: html[data-theme="nutri-teal-v2"] */

html[data-theme="nutri-teal-v2"] {

  /* ── Neutros ─────────────────────────────────────────────── */
  --background:          hsl(165 25% 97%);   /* #F4F9F8 — fundo principal */
  --foreground:          hsl(172 46% 10%);   /* #0B2420 — texto principal */

  --card:                hsl(0 0% 100%);     /* #FFFFFF */
  --card-foreground:     hsl(172 46% 10%);

  --muted:               hsl(168 20% 94%);   /* #EDF4F3 — fundo secundário */
  --muted-foreground:    hsl(168 14% 40%);   /* #516361 — texto secundário */

  --border:              hsl(168 22% 85%);   /* #C8DDD9 — bordas sutis */
  --input:               hsl(168 22% 85%);

  /* ── Marca Teal ──────────────────────────────────────────── */
  --primary:             hsl(173 72% 28%);   /* #136C62 — teal escuro */
  --primary-foreground:  hsl(0 0% 100%);
  --primary-hover:       hsl(173 72% 23%);   /* #0F5950 — teal mais escuro no hover */
  --primary-light:       hsl(173 60% 36%);   /* #248C7F — para links e ícones ativos */

  /* ── Teal Scale (uso em gráficos e badges) ───────────────── */
  --teal-50:   hsl(168 40% 97%);
  --teal-100:  hsl(168 35% 92%);
  --teal-200:  hsl(170 40% 82%);
  --teal-300:  hsl(171 50% 65%);
  --teal-400:  hsl(172 55% 48%);
  --teal-500:  hsl(173 65% 38%);
  --teal-600:  hsl(173 72% 28%);   /* = --primary */
  --teal-700:  hsl(173 76% 22%);
  --teal-800:  hsl(172 80% 16%);
  --teal-900:  hsl(172 82% 11%);

  /* ── Secundário ──────────────────────────────────────────── */
  --secondary:            hsl(168 25% 92%);
  --secondary-foreground: hsl(171 55% 16%);

  /* ── Accent ──────────────────────────────────────────────── */
  --accent:               hsl(168 28% 88%);
  --accent-foreground:    hsl(171 65% 20%);

  /* ── Popover / Dropdown ──────────────────────────────────── */
  --popover:              hsl(0 0% 100%);
  --popover-foreground:   hsl(172 46% 10%);

  /* ── Ring ────────────────────────────────────────────────── */
  --ring:                 hsl(173 72% 28%);

  /* ── Radius ──────────────────────────────────────────────── */
  --radius:               0.5rem;            /* 8px — mais compacto e profissional */

  /* ── Status Semânticos ───────────────────────────────────── */

  /* Conforme / Sucesso */
  --success:              hsl(142 65% 42%);  /* #22C55E equivalente */
  --success-subtle:       hsl(142 60% 95%);  /* #F0FDF4 */
  --success-foreground:   hsl(142 65% 18%);

  /* Alerta / Atenção */
  --warning:              hsl(38 90% 50%);   /* #F59E0B */
  --warning-subtle:       hsl(48 100% 95%);  /* #FFFBEB */
  --warning-foreground:   hsl(32 90% 22%);

  /* Crítico / Erro */
  --destructive:          hsl(0 82% 57%);    /* #EF4444 */
  --destructive-subtle:   hsl(0 85% 97%);    /* #FEF2F2 */
  --destructive-foreground: hsl(0 0% 100%);

  /* Info */
  --info:                 hsl(199 85% 46%);  /* #0EA5E9 */
  --info-subtle:          hsl(204 100% 97%); /* #F0F9FF */
  --info-foreground:      hsl(199 85% 18%);

  /* ── Sidebar Dark (Datadog-style) ────────────────────────── */
  --sidebar:              hsl(173 60% 10%);  /* #072E2A — dark teal profissional */
  --sidebar-foreground:   hsl(168 25% 88%);  /* #D6EDEA */
  --sidebar-primary:      hsl(173 60% 36%);  /* #248C7F — item ativo */
  --sidebar-primary-foreground: hsl(0 0% 100%);
  --sidebar-accent:       hsl(173 50% 16%);  /* #123E3A — hover suave */
  --sidebar-accent-foreground: hsl(168 30% 92%);
  --sidebar-border:       hsl(173 45% 16%);
  --sidebar-ring:         hsl(173 60% 36%);

  /* ── Gráficos (5 slots) ──────────────────────────────────── */
  --chart-1: hsl(173 72% 28%);  /* teal-600 — série primária */
  --chart-2: hsl(142 65% 42%);  /* green-500 — conforme */
  --chart-3: hsl(38 90% 50%);   /* amber-500 — alerta */
  --chart-4: hsl(0 82% 57%);    /* red-500 — crítico */
  --chart-5: hsl(199 85% 46%);  /* sky-500 — info/visitas */
}

/* ── Dark mode ────────────────────────────────────────────── */
html[data-theme="nutri-teal-v2"].dark {
  --background:          hsl(173 40% 6%);    /* #071715 */
  --foreground:          hsl(168 25% 95%);   /* #EFF7F6 */

  --card:                hsl(173 38% 9%);    /* #0D2422 */
  --card-foreground:     hsl(168 25% 95%);

  --muted:               hsl(172 32% 14%);   /* #162E2B */
  --muted-foreground:    hsl(168 18% 58%);   /* #7FA39E */

  --border:              hsl(172 28% 18%);
  --input:               hsl(172 28% 18%);

  --primary:             hsl(173 65% 40%);   /* mais brilhante no dark */
  --primary-foreground:  hsl(173 60% 6%);

  --secondary:           hsl(172 32% 14%);
  --secondary-foreground: hsl(168 25% 95%);

  --accent:              hsl(172 28% 18%);
  --accent-foreground:   hsl(173 65% 40%);

  --sidebar:             hsl(173 50% 7%);
  --sidebar-foreground:  hsl(168 22% 82%);
  --sidebar-accent:      hsl(173 42% 13%);
  --sidebar-accent-foreground: hsl(168 28% 92%);
  --sidebar-border:      hsl(173 38% 12%);
}
```

### 2.2 Paleta de Gráficos por Contexto

```typescript
// lib/chart-colors.ts

// ── Conformidade Regulatória ──────────────────────────────────────────────
export const COMPLIANCE_COLORS = {
  conforme:   '#22C55E',  // green-500 — conformidade ok
  alerta:     '#F59E0B',  // amber-500 — atenção/vencendo
  critico:    '#EF4444',  // red-500   — vencido/crítico
  neutro:     '#94A3B8',  // slate-400 — sem dados
} as const;

// ── Tendência Clínica (evolução de paciente) ──────────────────────────────
export const CLINICAL_COLORS = {
  weight:     '#136C62',  // teal-600  — peso actual
  target:     '#22C55E',  // green-500 — meta/eutrófico
  imc:        '#0EA5E9',  // sky-500   — IMC
  compare:    '#94A3B8',  // slate-400 — período anterior (tracejado)
  area:       '#136C6218', // teal-600 12% — área sob curva
} as const;

// ── Financeiro ────────────────────────────────────────────────────────────
export const FINANCIAL_COLORS = {
  receita:    '#136C62',  // teal-600  — receita
  pendente:   '#F59E0B',  // amber-500 — pendente/em atraso
  vencido:    '#EF4444',  // red-500   — vencido
  projecao:   '#94A3B8',  // slate-400 — projeção (tracejado)
  area:       '#136C6214', // teal 8% — preenchimento de área
} as const;

// ── Visitas / Operacional ─────────────────────────────────────────────────
export const VISITS_COLORS = {
  realizadas: '#136C62',  // teal-600  — visitas concluídas
  agendadas:  '#0EA5E9',  // sky-500   — agendadas
  perdidas:   '#EF4444',  // red-500   — não realizadas
  area:       '#0EA5E920', // sky 12% — área de visitas
} as const;

// ── Paleta Genérica (múltiplas séries sem contexto semântico) ─────────────
export const CHART_PALETTE = [
  '#136C62',  // teal-600    (primário)
  '#22C55E',  // green-500
  '#0EA5E9',  // sky-500
  '#F59E0B',  // amber-500
  '#7C3AED',  // violet-600
  '#EF4444',  // red-500
  '#EC4899',  // pink-500
  '#94A3B8',  // slate-400
] as const;
```

---

## 3. Tipografia

### 3.1 Fontes

```css
/* Substituir Geist por Inter — maior suporte a tabular-nums e reconhecimento corporativo */
/* app/layout.tsx */

import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

/* Fonte mono: para CRN, NIF, valores de contrato, logs de auditoria */
import { JetBrains_Mono } from 'next/font/google';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});
```

### 3.2 Escala Tipográfica

| Token | Classe Tailwind | Tamanho / Peso | Uso |
|-------|----------------|----------------|-----|
| `display` | `text-3xl font-bold` | 30px / 700 | Título de página (h1) |
| `title-lg` | `text-2xl font-semibold` | 24px / 600 | Título de seção (h2) |
| `title` | `text-xl font-semibold` | 20px / 600 | Título de card (h3) |
| `title-sm` | `text-lg font-medium` | 18px / 500 | Subtítulo (h4) |
| `body-lg` | `text-base font-normal` | 16px / 400 | Texto corpo |
| `body` | `text-sm font-normal` | 14px / 400 | Tabelas e formulários |
| `body-sm` | `text-xs font-normal` | 12px / 400 | Labels, legendas, breadcrumbs |
| `label` | `text-sm font-medium` | 14px / 500 | Labels de campo |
| `metric-xl` | `text-4xl font-bold tabular-nums` | 36px / 700 | Número destaque (ex: 47 clientes) |
| `metric-lg` | `text-2xl font-semibold tabular-nums` | 24px / 600 | Métrica secundária |
| `metric` | `text-lg font-semibold tabular-nums` | 18px / 600 | Métrica em card compacto |
| `metric-sm` | `text-sm font-semibold tabular-nums` | 14px / 600 | Valor em tabela |
| `code` | `font-mono text-sm` | 14px / 400 | CRN, NIF, tokens de acesso |
| `code-sm` | `font-mono text-xs` | 12px / 400 | Valores inline em parágrafo |

> **Regra absoluta:** qualquer número que mude ao longo do tempo (métricas, percentuais, contadores) **deve** usar `tabular-nums` para evitar jitter visual nas atualizações.

---

## 4. Espaçamento

Escala base Tailwind (4px). Tokens padronizados para NutriGestão:

| Token | Valor | Uso |
|-------|-------|-----|
| `gap-1` | 4px | Ícone e label em botão |
| `gap-2` | 8px | Elementos relacionados compactos |
| `gap-3` | 12px | Interior de badge/tag |
| `gap-4` | 16px | Entre campos de formulário |
| `gap-6` | 24px | Entre seções de um card |
| `gap-8` | 32px | Entre cards no grid |
| `gap-12` | 48px | Entre seções de página |

**Padding de Cards:** `p-6` padrão · `p-4` compacto (tabelas, listas densas)
**Padding de Página:** `px-6 py-8` desktop · `px-4 py-6` mobile
**Padding Sidebar:** `px-3 py-2` para itens de navegação

---

## 5. Bordas, Sombras e Radius

```css
/* Radius — mais compacto que v1 (0.875rem → 0.5rem base) */
--radius-sm:   0.25rem;   /* 4px  — badges, tags, tooltips */
--radius:      0.5rem;    /* 8px  — cards, inputs, botões */
--radius-lg:   0.75rem;   /* 12px — modais, dropdowns */
--radius-xl:   1rem;      /* 16px — sheet/painel lateral */
--radius-full: 9999px;    /* pílulas, avatares */

/* Sombras — mesma escala do design system de referência */
--shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow:     0 1px 3px 0 rgb(0 0 0 / 0.10), 0 1px 2px -1px rgb(0 0 0 / 0.10);
--shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10);
--shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.10);
```

**Uso:**
- Cards padrão: `shadow-sm` + `border` (não duplicar)
- Modais e dropdowns: `shadow-lg`
- Cards em hover: `shadow-md`
- Sidebar: `shadow-lg` border-right, sem shadow extra
- Cards de status crítico: `border-destructive` (sem shadow extra)

---

## 6. Componentes Base

### 6.1 Button

```typescript
// Variantes e usos no contexto NutriGestão

// default — ação primária (uma por tela)
<Button variant="default">Iniciar Visita</Button>
// bg-primary text-primary-foreground hover:bg-primary-hover

// secondary — ação de suporte
<Button variant="secondary">Exportar PDF</Button>
// bg-secondary text-secondary-foreground hover:bg-muted

// outline — ação terciária
<Button variant="outline">Ver Histórico</Button>
// border bg-transparent hover:bg-accent

// ghost — ações em tabelas e toolbars
<Button variant="ghost">Editar</Button>
// hover:bg-accent text-accent-foreground

// destructive — ações irreversíveis (revogar acesso, excluir dados)
<Button variant="destructive">Revogar Acesso</Button>
// bg-destructive text-destructive-foreground

// Tamanhos
// sm:  h-8  px-3 text-xs  — ações em tabelas
// md:  h-10 px-4          — padrão
// lg:  h-12 px-6          — CTA principal de onboarding

// Loading state (sempre em ações assíncronas)
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  A guardar...
</Button>
```

### 6.2 Card

```typescript
// Card padrão
<Card className="shadow-sm">
  <CardHeader>
    <CardTitle>Histórico de Visitas</CardTitle>
    <CardDescription>Últimos 30 dias</CardDescription>
  </CardHeader>
  <CardContent>
    {/* conteúdo */}
  </CardContent>
</Card>

// Card de métrica (novo padrão v2.0 — ver seção 7.1)
<MetricCard
  label="Clientes Activos"
  value={47}
  delta={+3}
  trend="up"
  sparklineData={[38, 40, 41, 42, 44, 45, 47]}
  status="normal"
/>

// Card de conformidade (novo)
<ComplianceCard
  establishment="Escola Municipal Ipê"
  score={91}
  status="ok"        // ok | warning | critical
  daysToNextVisit={5}
/>
```

### 6.3 Badge / StatusBadge

```typescript
// Configuração de status semânticos — 7 estados
const STATUS_CONFIG = {
  // Estados de visita
  agendada:   { label: 'Agendada',    variant: 'secondary',    dot: 'bg-slate-400' },
  em_visita:  { label: 'Em Visita',   variant: 'default',      dot: 'bg-teal-500 animate-pulse' },
  concluida:  { label: 'Concluída',   variant: 'success',      dot: 'bg-green-500' },

  // Estados de conformidade
  conforme:   { label: 'Conforme',    variant: 'success',      dot: 'bg-green-500' },
  alerta:     { label: 'Alerta',      variant: 'warning',      dot: 'bg-amber-500 animate-pulse' },
  critico:    { label: 'Crítico',     variant: 'destructive',  dot: 'bg-red-500 animate-pulse' },

  // Estados de contrato/financeiro
  pendente:   { label: 'Pendente',    variant: 'warning',      dot: 'bg-amber-400' },
  vencido:    { label: 'Vencido',     variant: 'destructive',  dot: 'bg-red-500' },
  pago:       { label: 'Pago',        variant: 'success',      dot: 'bg-green-500' },

  // Estados de portaria
  vigente:    { label: 'Vigente',     variant: 'success',      dot: 'bg-green-500' },
  a_vencer:   { label: 'A Vencer',    variant: 'warning',      dot: 'bg-amber-400 animate-pulse' },
  expirada:   { label: 'Expirada',    variant: 'destructive',  dot: 'bg-red-500' },
} as const;

// Uso
<StatusBadge status="em_visita" />
// Output: ● (pulsando teal) Em Visita

<StatusBadge status="critico" />
// Output: ● (pulsando vermelho) Crítico
```

### 6.4 Table

```typescript
// Tabela de estabelecimentos — padrão de dados densos
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Estabelecimento</TableHead>
      <TableHead>Tipo</TableHead>
      <TableHead className="text-right">Conformidade</TableHead>
      <TableHead>Próxima Visita</TableHead>
      <TableHead className="text-right">Ações</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-muted/50 cursor-pointer">
      <TableCell className="font-medium">Escola Municipal Ipê</TableCell>
      <TableCell>Escola</TableCell>
      <TableCell className="text-right tabular-nums">
        <StatusBadge status="conforme" />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">em 5 dias</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="sm">Ver</Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>

// Regras:
// - Números: sempre text-right + tabular-nums
// - Linha clicável: cursor-pointer + hover:bg-muted/50
// - Sem zebra-striping — borda inferior sutil
// - Status sempre usa StatusBadge (nunca texto colorido directo)
// - Colunas de ação: text-right + ghost buttons
```

### 6.5 Input / Formulários Clínicos

```typescript
// Campo padrão
<div className="space-y-2">
  <Label htmlFor="crn">CRN do Profissional</Label>
  <Input
    id="crn"
    placeholder="CRN-X 00000"
    className="font-mono uppercase"
  />
  <p className="text-xs text-muted-foreground">
    Número de registo no Conselho Regional de Nutrição.
  </p>
</div>

// Campo de dado sensível (dados de saúde)
<div className="space-y-2">
  <Label htmlFor="peso">Peso (kg)</Label>
  <Input id="peso" type="number" step="0.1" min="1" max="300" />
  <p className="text-xs text-muted-foreground flex items-center gap-1">
    <ShieldIcon className="h-3 w-3" />
    Dado de saúde protegido por LGPD — não partilhado sem consentimento.
  </p>
</div>

// Estado de erro
<Input className="border-destructive focus-visible:ring-destructive" />
<p className="text-xs text-destructive flex items-center gap-1">
  <AlertCircleIcon className="h-3 w-3" />
  Campo obrigatório para portaria vigente.
</p>

// Textarea para notas clínicas / observações
<Textarea
  placeholder="Observações sobre o estabelecimento..."
  className="min-h-[120px] resize-none"
  maxLength={1000}
/>
```

### 6.6 Tabs — Estilo Underline

```typescript
// Padrão underline (não boxed) — dashboards e perfis de cliente
<Tabs defaultValue="geral">
  <TabsList className="border-b rounded-none w-full justify-start h-auto p-0 bg-transparent gap-1">
    <TabsTrigger
      value="geral"
      className="rounded-none border-b-2 border-transparent
                 data-[state=active]:border-primary
                 data-[state=active]:text-primary
                 data-[state=active]:shadow-none
                 pb-2 px-1 font-medium"
    >
      Visão Geral
    </TabsTrigger>
    <TabsTrigger value="estabelecimentos">Estabelecimentos</TabsTrigger>
    <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
    <TabsTrigger value="contratos">Contratos</TabsTrigger>
  </TabsList>
  <TabsContent value="geral" className="pt-6">...</TabsContent>
</Tabs>
```

### 6.7 AlertDialog — Confirmação de Ações Críticas

```typescript
// Revogação de acesso de utilizador externo
<AlertDialog>
  <AlertDialogTrigger
    render={
      <Button variant="destructive" size="sm">Revogar Acesso</Button>
    }
  />
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Revogar acesso de João Silva?</AlertDialogTitle>
      <AlertDialogDescription>
        João Silva perderá imediatamente o acesso ao portal e não poderá
        mais visualizar os dados de Ana Lima. Esta acção é registada no
        log de auditoria.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive hover:bg-destructive/90">
        Revogar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// Regra: dialogs de confirmação SEMPRE descrevem a consequência + o que é registado.
// Nunca "Tem certeza?" sem contexto.
```

### 6.8 Select — Formulários de Filtro

```typescript
// Select de filtro em dashboard
<Select value={period} onValueChange={(v) => { if (v) setPeriod(v); }}>
  <SelectTrigger className="w-[160px]">
    <SelectValue placeholder="Período" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="7d">Últimos 7 dias</SelectItem>
    <SelectItem value="30d">Últimos 30 dias</SelectItem>
    <SelectItem value="90d">Últimos 3 meses</SelectItem>
    <SelectItem value="1y">Último ano</SelectItem>
  </SelectContent>
</Select>
```

---

## 7. Componentes de Domínio (NutriGestão-specific)

### 7.1 MetricCard

Card de métrica para dashboards — topo de página e painéis de overview.

```
┌──────────────────────────────────┐
│  Clientes Activos                │
│                                  │
│  47              ▲ +3            │
│                vs. mês anterior  │
│                                  │
│  [sparkline 8 semanas]           │
└──────────────────────────────────┘
```

```typescript
interface MetricCardProps {
  label: string;                          // "Clientes Activos"
  value: number | string;                 // 47 | "91%"
  unit?: string;                          // "clientes" | "%" | "R$"
  delta?: number;                         // +3 | -1.2
  deltaLabel?: string;                    // "vs. mês anterior"
  trend?: 'up' | 'down' | 'neutral';
  trendPositive?: 'up' | 'down';         // para métricas onde down é bom (ex: % crítico)
  sparklineData?: number[];               // últimas 8 semanas
  status?: 'normal' | 'warning' | 'critical';
  icon?: React.ReactNode;
  href?: string;                          // se clicável → navega para detalhe
}

// Estados visuais:
// normal   → card padrão (border + shadow-sm)
// warning  → border-warning (âmbar) + ícone AlertTriangle
// critical → border-destructive (vermelho) + valor em text-destructive
```

**Uso no Dashboard Principal:**
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Clientes │ │Conformid.│ │ Visitas  │ │Pend.Fin. │
│    47    │ │   91%    │ │  12 mês  │ │  R$2.4k  │
│  ▲ +3   │ │  ▼ -2%  │ │  ▲ +2   │ │  ▲ +800  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### 7.2 VisitStatusHeader

Barra de estado fixa quando há uma visita activa (equivalente ao RunStatusHeader do Datadog).

```
┌─────────────────────────────────────────────────────────────────────┐
│  ● EM VISITA  •  Escola Municipal Ipê  •  há 00:34:12              │
│                                              [Pausar] [Finalizar]  │
└─────────────────────────────────────────────────────────────────────┘
```

**Estados visuais:**
- `em_visita`: `bg-teal-50 border-teal-200` + dot pulsante teal
- `pausada`: `bg-amber-50 border-amber-200` + ícone pause
- `finalizada`: `bg-slate-50 border-slate-200` + ícone check

### 7.3 ComplianceChart

Gráfico de linha para evolução da conformidade regulatória por estabelecimento.

```typescript
interface ComplianceChartProps {
  data: Array<{
    date: string;           // "2026-01"
    score: number;          // 0–100
    threshold: number;      // mínimo exigido (ex: 85)
    visits: number;         // visitas no período
  }>;
  establishmentName: string;
  height?: number;          // default: 240
}

// Regras visuais:
// - Eixo Y: 0–100 com linha tracejada no threshold
// - Zona abaixo do threshold: fundo vermelho rgba(239,68,68,0.05)
// - Tooltip: score, threshold, nº visitas no período
// - Animação: desabilitada (isAnimationActive={false})
// - Grid: linhas horizontais tracejadas stroke-slate-200
// - Cor: COMPLIANCE_COLORS.conforme acima de threshold, .critico abaixo
```

### 7.4 PatientEvolutionChart

Gráfico de linha para evolução antropométrica do paciente.

```typescript
interface PatientEvolutionChartProps {
  data: Array<{
    date: string;
    peso: number;
    imc: number;
    target?: number;
  }>;
  metrics: ('peso' | 'imc' | 'target')[];
  height?: number;
}

// Duas escalas Y (peso em kg, IMC adimensional)
// Cores: CLINICAL_COLORS
// Tooltip: todos os valores no hover do ponto
```

### 7.5 ComplianceBar

Barra horizontal empilhada — distribuição de conformidade nos estabelecimentos.

```
Conforme  ████████████████████████████████  78%
Alerta    ████ 14%
Crítico   ██ 8%
```

```typescript
interface ComplianceBarProps {
  counts: {
    conforme: number;
    alerta: number;
    critico: number;
  };
  total: number;
  showLabels?: boolean;
}
```

### 7.6 VisitMonthBarChart

Gráfico de barras — visitas por mês (já existe como `visits-month-bar-chart.tsx`).

```typescript
// Manter implementação actual, actualizar cores para VISITS_COLORS
// Adicionar linha de meta mensal (tracejado slate-400)
// Tooltip: concluídas / agendadas / perdidas
```

### 7.7 RegulatoryAlertCard

Card de alerta de portaria a vencer / vencida (já existe como `regulatory-alert-card.tsx`).

```typescript
// v2.0: adicionar borda colorida por urgência
// critical (≤7 dias):  border-l-4 border-destructive bg-destructive-subtle
// warning (≤30 dias):  border-l-4 border-warning    bg-warning-subtle
// info (>30 dias):     border-l-4 border-info        bg-info-subtle
```

### 7.8 AuditLogCard

Registo de auditoria de acções em dados de paciente (Story 11.2).

```
┌────────────────────────────────────────────────────────────┐
│  [12:34:15]  UPDATE  patient_nutrition_assessments         │
│              Utilizador: maria@nutri.com                   │
│              Campo: peso_kg  7→ 72.3                     │
│              IP: 179.xxx.xxx.xxx                           │
└────────────────────────────────────────────────────────────┘
```

```typescript
// Visual: fundo bg-muted/50, fonte mono text-xs
// Nível de acção:
// CREATE → text-teal-600
// UPDATE → text-amber-600
// DELETE → text-destructive
// READ sensível → text-info
```

### 7.9 PortalAccessCard

Card de gestão de acesso externo — lista de utilizadores com permissões.

```
┌──────────────────────────────────────────────────┐
│  João Silva (familiar)        ● Activo            │
│  Permissões: Relatórios · Medições               │
│  Último acesso: há 2 dias    [Revogar]           │
├──────────────────────────────────────────────────┤
│  Dra. Ana Torres (médica)     ● Activa           │
│  Permissões: Relatórios · Plano nutricional      │
│  Último acesso: hoje          [Revogar]          │
└──────────────────────────────────────────────────┘
```

---

## 8. Layout e Navegação

### 8.1 Shell da Aplicação — Dark Sidebar (v2.0)

```
┌────────────────────────────────────────────────────────────────────┐
│  TOPBAR (h-14, bg-background, border-b, sticky top-0 z-50)        │
│  [≡] [Logo NutriGestão]    [Notificações 🔔 3] [Avatar + Menu]    │
└────────────────────────────────────────────────────────────────────┘
┌──────────────┐  ┌─────────────────────────────────────────────────┐
│  SIDEBAR     │  │  MAIN CONTENT                                   │
│  (w-60)      │  │  (flex-1, overflow-auto, bg-background)         │
│  bg dark     │  │                                                 │
│  teal-900    │  │  Breadcrumb  /  Page Header                    │
│              │  │  ───────────────────────────────────            │
│  🏠 Início  │  │                                                 │
│  👥 Clientes│  │  [Conteúdo da página]                          │
│  🏥 Estabel.│  │                                                 │
│  🧑 Pacient.│  │                                                 │
│  📋 Visitas │  │                                                 │
│  ─────────  │  │                                                 │
│  📊 Fichas  │  │                                                 │
│  📄 POPs    │  │                                                 │
│  💰 Financ. │  │                                                 │
│  🤝 Equipe  │  │                                                 │
│  ─────────  │  │                                                 │
│  ⚙️ Config. │  │                                                 │
└──────────────┘  └─────────────────────────────────────────────────┘
```

**Sidebar Dark — Especificação:**
```typescript
// Fundo: bg-[var(--sidebar)]  → hsl(173 60% 10%) = teal muito escuro
// Texto item inactivo: text-[var(--sidebar-foreground)] → hsl(168 25% 88%)
// Item activo: bg-[var(--sidebar-accent)] rounded-md text-white font-medium
// Ícones: h-4 w-4, opacity-80 em itens inactivos
// Separadores: <Separator className="opacity-20 my-2" />
// Labels de secção: text-[10px] uppercase tracking-widest opacity-50 px-3 mb-1
// Hover: bg-[var(--sidebar-accent)] transition-colors duration-150

// Item de navegação padrão:
<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    isActive={pathname.startsWith('/clientes')}
    className="gap-3"
  >
    <Link href="/clientes">
      <UsersIcon className="h-4 w-4" />
      Clientes
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

**Topbar:**
- Altura: `h-14` (56px — mais compacto que v1)
- `bg-background border-b border-border`
- Logo: `text-base font-semibold` + ícone `Leaf` (Lucide)
- Badge de notificações: `bg-destructive text-white rounded-full text-[10px]` sobre ícone Bell

### 8.2 Breakpoints

| Breakpoint | Valor | Comportamento |
|-----------|-------|--------------|
| `sm` | 640px | Mobile — sidebar oculta (drawer via Sheet) |
| `md` | 768px | Tablet — sidebar visível em modo ícones (w-16) |
| `lg` | 1024px | Desktop — sidebar completa (w-60) |
| `xl` | 1280px | Wide — grid de métricas expande para 4 colunas |
| `2xl` | 1536px | Ultra-wide — max-width conteúdo `max-w-7xl` |

### 8.3 Grids de Cards

```typescript
// Grid de métricas (dashboard principal)
<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
  <MetricCard label="Clientes Activos" ... />
  <MetricCard label="Conformidade Média" ... />
  <MetricCard label="Visitas este Mês" ... />
  <MetricCard label="Pendências Financeiras" ... />
</div>

// Grid de gráficos
<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
  <Card>{/* Evolução conformidade */}</Card>
  <Card>{/* Visitas por mês */}</Card>
</div>

// Grid de alertas regulatórios (lista fullwidth)
<div className="flex flex-col gap-3">
  <RegulatoryAlertCard ... />
  <RegulatoryAlertCard ... />
</div>

// Grid de estabelecimentos (tabela fullwidth)
<div className="grid grid-cols-1">
  <Table>...</Table>
</div>
```

### 8.4 Page Header Padrão

```typescript
// Topo de toda página interna
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
    <p className="text-sm text-muted-foreground mt-0.5">
      47 clientes activos · 3 com alertas
    </p>
  </div>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm">
      <FilterIcon className="mr-1.5 h-3.5 w-3.5" />
      Filtrar
    </Button>
    <Button size="sm">
      <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
      Novo Cliente
    </Button>
  </div>
</div>
```

---

## 9. Iconografia

**Biblioteca:** Lucide React (consistente com @base-ui/react)

### 9.1 Ícones do Domínio NutriGestão

| Contexto | Ícone Lucide |
|---------|-------------|
| Logo / branding | `Leaf` |
| Dashboard / Início | `LayoutDashboard` |
| Clientes (PF/PJ) | `Users` |
| Estabelecimentos | `Building2` |
| Pacientes | `UserRound` |
| Visitas | `ClipboardCheck` |
| Fichas técnicas | `UtensilsCrossed` |
| POPs | `FileText` |
| Financeiro | `CircleDollarSign` |
| Equipe | `UserCog` |
| Configurações | `Settings` |
| Portaria / Regulatório | `Shield` |
| Checklists | `CheckSquare` |
| Dossiê / PDF | `FileArchive` |
| Fotos da visita | `Camera` |
| Anotações | `StickyNote` |
| Conformidade ok | `ShieldCheck` |
| Conformidade crítica | `ShieldAlert` |
| Consentimento LGPD | `Lock` |
| Portal externo | `ExternalLink` |
| Acesso revogado | `ShieldOff` |
| Plano nutricional | `BookOpen` |
| Ingrediente / TACO | `Wheat` |
| Custo / preço | `Tag` |
| Contrato | `FileSignature` |
| Alerta de renovação | `Bell` |
| Log de auditoria | `History` |
| Exportar | `Download` |
| Importar CSV | `Upload` |
| Filtrar | `Filter` |
| Ordenar | `ArrowUpDown` |
| Copiar | `Copy` |
| Editar | `Pencil` |
| Eliminar | `Trash2` |
| Visualizar | `Eye` |
| Fechar / cancelar | `X` |
| Confirmar | `Check` |
| Carregar | `Loader2` |
| Refresh | `RefreshCw` |
| Expandir | `ChevronDown` |
| Colapsar | `ChevronUp` |
| Navegar direita | `ChevronRight` |
| Mais opções | `MoreHorizontal` |

**Tamanhos:**
- `h-4 w-4` — ícones em botões, itens de menu e tabelas
- `h-5 w-5` — ícones em headings de card
- `h-8 w-8` — ícones em empty states e estados de erro
- `h-10 w-10` — ícones em cards de onboarding/wizard

---

## 10. Estados Especiais

### 10.1 Empty State

```typescript
// Nenhum cliente cadastrado
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="rounded-full bg-muted p-4 mb-4">
    <Users className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-semibold mb-2">Nenhum cliente ainda</h3>
  <p className="text-sm text-muted-foreground max-w-sm mb-6">
    Comece por adicionar o primeiro cliente. Poderá depois
    associar estabelecimentos e pacientes.
  </p>
  <Button>
    <Plus className="mr-2 h-4 w-4" />
    Adicionar Cliente
  </Button>
</div>
```

### 10.2 Skeleton Cards

```typescript
// Skeleton para MetricCard a carregar
<Card>
  <CardHeader className="pb-2">
    <Skeleton className="h-3.5 w-28" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-9 w-20 mb-2" />
    <Skeleton className="h-12 w-full" /> {/* sparkline */}
  </CardContent>
</Card>

// Skeleton para linha de tabela
<TableRow>
  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
</TableRow>

// Regra: NUNCA spinner global — sempre skeleton contextual.
```

### 10.3 Error State

```typescript
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="rounded-full bg-destructive/10 p-3 mb-3">
    <XCircle className="h-8 w-8 text-destructive" />
  </div>
  <p className="text-sm font-medium mb-1">Erro ao carregar dados</p>
  <p className="text-xs text-muted-foreground mb-4">{error.message}</p>
  <Button variant="outline" size="sm" onClick={retry}>
    <RefreshCw className="mr-2 h-3 w-3" />
    Tentar novamente
  </Button>
</div>
```

### 10.4 Conformidade Crítica — Card Alert

```typescript
// Quando score de conformidade < threshold
// MetricCard com status critical:
// - border-destructive (borda vermelha)
// - valor em text-destructive
// - ícone ShieldAlert ao lado do valor
// - Badge "Intervenção necessária" em destructive

// Sem toast — o card comunica inline.
// Toast apenas para acções do utilizador (salvar, revogar, gerar PDF).
```

### 10.5 Consentimento LGPD — Overlay

```typescript
// Ao tentar ver dados de menor sem consentimento registado:
<div className="rounded-lg border border-warning bg-warning-subtle p-4 flex gap-3">
  <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" />
  <div>
    <p className="text-sm font-medium text-warning-foreground">
      Consentimento parental necessário
    </p>
    <p className="text-xs text-warning-foreground/80 mt-1">
      Este paciente tem menos de 18 anos. É necessário registar o
      consentimento do responsável legal para aceder a dados clínicos.
    </p>
    <Button size="sm" className="mt-3" variant="outline">
      Registar Consentimento
    </Button>
  </div>
</div>
```

---

## 11. Animações

**Princípio:** animações orientam, não decoram.

| Situação | Animação | Duração |
|---------|----------|---------|
| Métricas a actualizar | Nenhuma — `isAnimationActive={false}` | — |
| Badge de status a mudar | Fade in suave | 150ms |
| Card a entrar na viewport | `animate-in fade-in-0 slide-in-from-top-1` | 200ms |
| Modal a abrir | `data-starting-style:scale-98 data-starting-style:opacity-0` | 200ms |
| Sidebar a expandir/colapsar | `transition-all duration-200` | 200ms |
| Skeleton → conteúdo | Fade in | 300ms |
| Dot de status "em_visita" | `animate-pulse` | loop |
| Dot de status "alerta/crítico" | `animate-pulse` | loop |
| Loader em botão | `animate-spin` | loop |
| Countdown regulatório | Nenhuma — `tabular-nums` evita jitter | — |

**Não usar:** scale em hover de cards (instabilidade em grids), parallax, transições full-screen de página.

---

## 12. Estrutura de Componentes (v2.0)

```
components/
├── ui/                              # @base-ui/react wrappers (não editar directamente)
│   ├── button.tsx
│   ├── button-variants.ts
│   ├── card.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── select.tsx                   # ← actualizado v2.0 (List em vez de Viewport)
│   ├── badge.tsx                    # ← novo v2.0
│   ├── alert.tsx                    # ← novo v2.0
│   ├── alert-dialog.tsx             # ← novo v2.0
│   ├── checkbox.tsx                 # ← novo v2.0
│   ├── textarea.tsx                 # ← novo v2.0
│   ├── separator.tsx
│   ├── tabs.tsx
│   ├── dialog.tsx
│   └── sheet.tsx
│
├── layout/                          # Shell da aplicação
│   ├── app-shell.tsx               # ← actualizar para dark sidebar
│   ├── sidebar.tsx                  # ← dark sidebar v2.0
│   ├── topbar.tsx
│   └── breadcrumb.tsx
│
├── common/                          # Genéricos reutilizáveis
│   ├── status-badge.tsx             # StatusBadge (statusConfig com 11 estados)
│   ├── metric-card.tsx              # MetricCard com sparkline + delta ← novo v2.0
│   ├── empty-state.tsx              # EmptyState padronizado
│   ├── error-state.tsx              # ErrorState padronizado
│   ├── skeleton-card.tsx            # SkeletonCard / SkeletonTable
│   └── confirm-dialog.tsx           # ConfirmDialog (destructive)
│
├── charts/                          # Gráficos (Recharts) ← novo directório v2.0
│   ├── compliance-chart.tsx         # ComplianceChart (evolução conformidade)
│   ├── patient-evolution-chart.tsx  # PatientEvolutionChart
│   ├── compliance-bar.tsx           # ComplianceBar (barras empilhadas)
│   └── visit-month-bar-chart.tsx    # ← migrado de components/dashboard/
│
├── dashboard/                       # Widgets do dashboard
│   ├── contract-renewal-alerts.tsx
│   ├── dashboard-clinical-subsection.tsx
│   ├── dashboard-focus-panel.tsx
│   ├── financial-pending-card.tsx
│   ├── regulatory-alert-card.tsx    # ← actualizar para border-l-4 v2.0
│   ├── regulatory-countdown.tsx
│   └── weekly-briefing-widget.tsx
│
├── clientes/                        # Módulo de Clientes
│   └── client-contracts-section.tsx
│
├── financeiro/                      # Módulo Financeiro
│   └── contract-generator-dialog.tsx
│
├── equipe/                          # Módulo Equipa
│   └── external-portal-section.tsx
│
└── pacientes/                       # Módulo Pacientes
    └── parental-consent-section.tsx
```

**Convenções:**
- Ficheiro: `kebab-case.tsx`
- Componente: `PascalCase`
- Props interface: `ComponentNameProps`
- Páginas: `export default` — componentes UI: named exports
- Sem ficheiros `index.ts` em pastas (dificulta navegação)

---

## 13. Chart Wrappers — Padrões Recharts

```typescript
// Configuração base para todos os gráficos NutriGestão
const CHART_BASE_CONFIG = {
  isAnimationActive: false,         // obrigatório — sem jitter em dashboards
  margin: { top: 8, right: 8, left: 0, bottom: 0 },
};

// Grid padrão
<CartesianGrid
  strokeDasharray="3 3"
  stroke="hsl(168 22% 85%)"        // --border
  vertical={false}                  // apenas linhas horizontais
/>

// Eixo X padrão (datas)
<XAxis
  dataKey="date"
  tickLine={false}
  axisLine={false}
  tick={{ fontSize: 11, fill: 'hsl(168 14% 40%)' }}  // --muted-foreground
/>

// Eixo Y padrão
<YAxis
  tickLine={false}
  axisLine={false}
  tick={{ fontSize: 11, fill: 'hsl(168 14% 40%)' }}
  width={36}
/>

// Tooltip padrão
<Tooltip
  contentStyle={{
    backgroundColor: 'white',
    border: '1px solid hsl(168 22% 85%)',
    borderRadius: '0.5rem',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.10)',
  }}
  cursor={{ stroke: 'hsl(168 22% 85%)', strokeWidth: 1 }}
/>

// Linha de threshold (portaria)
<ReferenceLine
  y={threshold}
  stroke="hsl(38 90% 50%)"          // amber — threshold de conformidade
  strokeDasharray="4 4"
  strokeWidth={1.5}
  label={{ value: `Mínimo ${threshold}%`, fontSize: 10, fill: 'hsl(32 90% 22%)' }}
/>
```

---

## 14. Tailwind CSS v4 — Extensões do Tema

```css
/* globals.css — extensões necessárias */
@theme inline {
  /* Sidebar tokens */
  --color-sidebar:                   var(--sidebar);
  --color-sidebar-foreground:        var(--sidebar-foreground);
  --color-sidebar-primary:           var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent:            var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border:            var(--sidebar-border);
  --color-sidebar-ring:              var(--sidebar-ring);

  /* Status tokens */
  --color-success:              var(--success);
  --color-success-subtle:       var(--success-subtle);
  --color-success-foreground:   var(--success-foreground);
  --color-warning:              var(--warning);
  --color-warning-subtle:       var(--warning-subtle);
  --color-warning-foreground:   var(--warning-foreground);
  --color-info:                 var(--info);
  --color-info-subtle:          var(--info-subtle);
  --color-info-foreground:      var(--info-foreground);

  /* Primary hover */
  --color-primary-hover:        var(--primary-hover);
  --color-primary-light:        var(--primary-light);

  /* Radius scale */
  --radius-sm:   0.25rem;
  --radius:      0.5rem;
  --radius-lg:   0.75rem;
  --radius-xl:   1rem;
  --radius-full: 9999px;

  /* Tipografia */
  --font-sans:    'Inter', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', Menlo, monospace;
  --font-heading: var(--font-sans);
}
```

---

## 15. Checklist de Migração v1 → v2

Para cada componente existente, aplicar as seguintes mudanças:

### CSS / Tokens
- [ ] Substituir `theme-nutri-teal.css` por `theme-nutri-teal-v2.css`
- [ ] Atualizar `html[data-theme]` para `nutri-teal-v2`
- [ ] Substituir `--radius: 0.875rem` por `0.5rem`
- [ ] Adicionar tokens de status (`--success`, `--warning`, `--info`) ao CSS

### Sidebar
- [ ] Alterar `--sidebar` de `hsl(168 33% 94%)` (claro) para `hsl(173 60% 10%)` (dark)
- [ ] Atualizar cores de texto, hover e borda do sidebar
- [ ] Verificar contraste dos ícones na sidebar escura (WCAG AA: 4.5:1)

### Tipografia
- [ ] Substituir `Geist Sans` por `Inter` em `app/layout.tsx`
- [ ] Adicionar `JetBrains Mono` para campos de CRN, NIF e dados numéricos
- [ ] Adicionar `tabular-nums` em todos os componentes que exibem números mutáveis

### Cards
- [ ] Criar `components/common/metric-card.tsx` (MetricCard com sparkline + delta)
- [ ] Atualizar `regulatory-alert-card.tsx` com `border-l-4` por urgência
- [ ] Adicionar SkeletonCard para estados de carregamento

### Gráficos
- [ ] Criar `lib/chart-colors.ts` com paletas por contexto
- [ ] Migrar `visits-month-bar-chart.tsx` para `components/charts/`
- [ ] Implementar `ComplianceChart` e `ComplianceBar`
- [ ] Aplicar `isAnimationActive={false}` em todos os gráficos existentes

### StatusBadge
- [ ] Expandir `statusConfig` de 3 estados para 11 estados semânticos
- [ ] Adicionar dot pulsante com `animate-pulse` para estados activos

### Radius
- [ ] Substituir classes `rounded-xl` por `rounded-lg` onde aplicável
- [ ] Verificar inputs — devem usar `rounded-md` (0.5rem)

---

*Documento criado em: 2026-04-07*
*Versão: 2.0.0*
*Baseado em: PerfSaaS Design System v1.0 (arquitectura visual Datadog)*
*Aplicação: NutriGestão SaaS — nutricionistas profissionais*
