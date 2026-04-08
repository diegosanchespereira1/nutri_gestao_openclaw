# PerfSaaS — Design System

**Base:** shadcn/ui + Tailwind CSS  
**Modo:** Light (primário) com suporte a Dark  
**Contexto:** Dashboard corporativo — dados densos, clareza, confiança

---

## 1. Princípios de Design

| Princípio      | Descrição                                                                 |
|----------------|---------------------------------------------------------------------------|
| **Clareza**    | Dados de performance são complexos. UI deve reduzir carga cognitiva.      |
| **Hierarquia** | O que está em execução agora > histórico > configuração.                  |
| **Densidade**  | Dashboards exibem muito dado. Espaçamento generoso onde importa, compacto onde dados dominam. |
| **Confiança**  | Paleta sóbria, sem gradientes desnecessários. Status visíveis e inequívocos. |
| **Velocidade** | Feedback imediato. Skeletons, loading states, métricas animadas sutilmente. |

---

## 2. Tokens de Cor

### 2.1 Paleta Base (CSS Custom Properties)

```css
/* globals.css — mapeamento Tailwind → shadcn tokens */

:root {
  /* --- Neutros --- */
  --background:        0 0% 100%;        /* #FFFFFF */
  --foreground:        222 47% 11%;      /* #0F172A (Slate 900) */

  --card:              0 0% 100%;        /* #FFFFFF */
  --card-foreground:   222 47% 11%;      /* #0F172A */

  --muted:             210 40% 96%;      /* #F1F5F9 (Slate 100) */
  --muted-foreground:  215 16% 47%;      /* #64748B (Slate 500) */

  --border:            214 32% 91%;      /* #E2E8F0 (Slate 200) */
  --input:             214 32% 91%;      /* #E2E8F0 */

  /* --- Marca (Azul corporativo) --- */
  --primary:           221 83% 53%;      /* #2563EB (Blue 600) */
  --primary-foreground: 210 40% 98%;    /* #F8FAFC */
  --primary-hover:     221 83% 45%;     /* #1D4ED8 (Blue 700) */

  /* --- Secundário --- */
  --secondary:         210 40% 96%;     /* #F1F5F9 */
  --secondary-foreground: 222 47% 11%;  /* #0F172A */

  /* --- Accent (destaques e hover) --- */
  --accent:            210 40% 94%;     /* #E8EEF8 */
  --accent-foreground: 221 83% 53%;     /* #2563EB */

  /* --- Popover / Dropdown --- */
  --popover:           0 0% 100%;
  --popover-foreground: 222 47% 11%;

  /* --- Ring (foco) --- */
  --ring:              221 83% 53%;     /* #2563EB */

  /* --- Radius --- */
  --radius:            0.5rem;          /* 8px — consistente, não arredondado demais */

  /* --- Status semânticos --- */
  --success:           142 71% 45%;     /* #22C55E (Green 500) */
  --success-subtle:    142 76% 95%;     /* #F0FDF4 */
  --success-foreground: 142 71% 20%;   /* verde escuro para texto */

  --warning:           38 92% 50%;      /* #F59E0B (Amber 500) */
  --warning-subtle:    48 100% 96%;     /* #FFFBEB */
  --warning-foreground: 32 95% 24%;    /* âmbar escuro */

  --destructive:       0 84% 60%;       /* #EF4444 (Red 500) */
  --destructive-subtle: 0 86% 97%;     /* #FEF2F2 */
  --destructive-foreground: 0 0% 100%;

  --info:              199 89% 48%;     /* #0EA5E9 (Sky 500) */
  --info-subtle:       204 100% 97%;   /* #F0F9FF */
  --info-foreground:   199 89% 20%;
}

.dark {
  --background:        222 47% 7%;      /* #0B1120 */
  --foreground:        210 40% 98%;     /* #F8FAFC */

  --card:              222 47% 10%;     /* #111827 */
  --card-foreground:   210 40% 98%;

  --muted:             217 33% 17%;     /* #1E293B (Slate 800) */
  --muted-foreground:  215 20% 65%;     /* #94A3B8 (Slate 400) */

  --border:            217 33% 20%;     /* #1E293B */
  --input:             217 33% 20%;

  --primary:           217 91% 60%;     /* #3B82F6 (Blue 500) — mais brilhante no dark */
  --primary-foreground: 222 47% 7%;

  --secondary:         217 33% 17%;
  --secondary-foreground: 210 40% 98%;

  --accent:            217 33% 20%;
  --accent-foreground: 217 91% 60%;
}
```

### 2.2 Paleta de Cores para Gráficos (Recharts)

Série de cores ordenada por prioridade visual. Deve funcionar em fundo branco E no dark mode.

```typescript
// lib/chart-colors.ts

export const CHART_COLORS = {
  // Primária — linha principal (p99, RPS)
  primary:   '#2563EB',  // blue-600

  // Secundárias — múltiplas linhas de latência
  p50:       '#22C55E',  // green-500
  p90:       '#F59E0B',  // amber-500
  p99:       '#EF4444',  // red-500
  p999:      '#7C3AED',  // violet-600

  // VUs ativos (área)
  vus:       '#0EA5E9',  // sky-500
  vusArea:   '#0EA5E920', // sky-500 com 12% opacidade para preenchimento

  // Status HTTP
  http2xx:   '#22C55E',  // green-500
  http4xx:   '#F59E0B',  // amber-500
  http5xx:   '#EF4444',  // red-500

  // Erro rate
  errorRate: '#EF4444',  // red-500

  // Segundo eixo / comparação
  compare:   '#94A3B8',  // slate-400 (execução anterior, tracejado)
} as const;

// Sequência para gráficos genéricos com múltiplas séries
export const CHART_PALETTE = [
  '#2563EB', // blue-600
  '#22C55E', // green-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#0EA5E9', // sky-500
  '#7C3AED', // violet-600
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
];
```

---

## 3. Tipografia

### 3.1 Fonte

```css
/* Fonte principal: Inter (variável) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* Fonte mono: JetBrains Mono — para scripts k6, logs, métricas */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
```

### 3.2 Escala Tipográfica

| Token         | Classe Tailwind        | Tamanho / Peso | Uso                                      |
|---------------|------------------------|----------------|------------------------------------------|
| `display`     | `text-3xl font-bold`   | 30px / 700     | Títulos de página (h1)                   |
| `title-lg`    | `text-2xl font-semibold` | 24px / 600   | Títulos de seção (h2)                    |
| `title`       | `text-xl font-semibold`  | 20px / 600   | Títulos de card (h3)                     |
| `title-sm`    | `text-lg font-medium`    | 18px / 500   | Subtítulos (h4)                          |
| `body-lg`     | `text-base font-normal`  | 16px / 400   | Texto corpo principal                    |
| `body`        | `text-sm font-normal`    | 14px / 400   | Texto padrão em tabelas e formulários    |
| `body-sm`     | `text-xs font-normal`    | 12px / 400   | Labels, captions, breadcrumbs            |
| `label`       | `text-sm font-medium`    | 14px / 500   | Labels de campos de formulário           |
| `metric-xl`   | `text-4xl font-bold tabular-nums` | 36px / 700 | Número destaque de métrica (ex: 2.340 RPS) |
| `metric-lg`   | `text-2xl font-semibold tabular-nums` | 24px / 600 | Métrica secundária          |
| `metric`      | `text-lg font-semibold tabular-nums` | 18px / 600 | Métrica em lista             |
| `code`        | `font-mono text-sm`    | 14px / 400     | Scripts k6, logs, valores de config      |
| `code-sm`     | `font-mono text-xs`    | 12px / 400     | Inline code em texto                     |

**Regra:** Números de métricas sempre usam `tabular-nums` para evitar jitter em atualizações em tempo real.

---

## 4. Espaçamento

Tailwind usa escala base de 4px. Os espaçamentos padronizados para a plataforma:

| Token   | Valor | Uso                                             |
|---------|-------|-------------------------------------------------|
| `gap-1` | 4px   | Entre ícone e label em botão                    |
| `gap-2` | 8px   | Entre elementos relacionados compactos          |
| `gap-3` | 12px  | Espaçamento interno de badge/tag                |
| `gap-4` | 16px  | Espaçamento padrão entre campos de formulário   |
| `gap-6` | 24px  | Entre seções de um card                         |
| `gap-8` | 32px  | Entre cards no grid                             |
| `gap-12`| 48px  | Entre seções de uma página                      |

**Padding de Cards:** `p-6` (24px) padrão. `p-4` (16px) para cards compactos (tabelas).  
**Padding de Página:** `px-6 py-8` desktop, `px-4 py-6` mobile.

---

## 5. Bordas e Sombras

```css
/* Bordas */
--radius-sm:  0.25rem;  /* 4px  — badges, tags */
--radius:     0.5rem;   /* 8px  — cards, inputs, botões */
--radius-lg:  0.75rem;  /* 12px — modais, dropdowns */
--radius-xl:  1rem;     /* 16px — painéis laterais */
--radius-full: 9999px;  /* pílulas, avatares */

/* Sombras */
--shadow-sm:   0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow:      0 1px 3px 0 rgb(0 0 0 / 0.10), 0 1px 2px -1px rgb(0 0 0 / 0.10);
--shadow-md:   0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10);
--shadow-lg:   0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.10);
```

**Uso de sombras:**
- Cards padrão: `shadow-sm` + `border` (evitar dupla sombra)
- Modais e dropdowns: `shadow-lg`
- Cards em hover: `shadow-md`

---

## 6. Componentes Base (shadcn/ui customizados)

### 6.1 Button

```typescript
// Variantes disponíveis e seus usos

// default — ação primária (uma por tela)
<Button variant="default">Iniciar Teste</Button>
// Estilo: bg-primary text-primary-foreground hover:bg-primary-hover

// secondary — ação secundária
<Button variant="secondary">Exportar CSV</Button>
// Estilo: bg-secondary text-secondary-foreground hover:bg-muted

// outline — ação de suporte
<Button variant="outline">Ver Script</Button>
// Estilo: border border-border bg-transparent hover:bg-accent

// ghost — ação em contexto denso (tabelas, toolbars)
<Button variant="ghost">Editar</Button>
// Estilo: hover:bg-accent text-accent-foreground

// destructive — ações irreversíveis
<Button variant="destructive">Abortar Execução</Button>
// Estilo: bg-destructive text-destructive-foreground

// Tamanhos
// sm: h-8 px-3 text-xs  — ações em tabelas
// default: h-10 px-4    — padrão
// lg: h-12 px-6         — CTA principal

// Loading state (sempre usar em ações assíncronas)
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Iniciando...
</Button>
```

### 6.2 Card

```typescript
// Card padrão — container principal de conteúdo
<Card>
  <CardHeader>
    <CardTitle>Título do Card</CardTitle>
    <CardDescription>Descrição ou subtítulo</CardDescription>
  </CardHeader>
  <CardContent>
    {/* conteúdo */}
  </CardContent>
  <CardFooter className="flex justify-between">
    {/* ações do card */}
  </CardFooter>
</Card>

// Card de métrica (uso recorrente no dashboard)
// Componente customizado sobre shadcn Card:
<MetricCard
  label="Requisições/segundo"
  value={2340}
  unit="req/s"
  delta={+12.5}        // variação vs. ponto anterior
  trend="up"           // up | down | neutral
  status="normal"      // normal | warning | critical
/>
```

### 6.3 Badge / Status

```typescript
// Badge semântico para status de execução
// Mapeamento de status → variante visual

const statusConfig = {
  pending:    { label: 'Pendente',   variant: 'secondary', dot: 'bg-slate-400'  },
  starting:   { label: 'Iniciando',  variant: 'secondary', dot: 'bg-blue-400 animate-pulse' },
  running:    { label: 'Executando', variant: 'default',   dot: 'bg-green-500 animate-pulse' },
  finishing:  { label: 'Finalizando',variant: 'secondary', dot: 'bg-amber-400 animate-pulse' },
  completed:  { label: 'Concluído',  variant: 'success',   dot: 'bg-green-500'  },
  failed:     { label: 'Falhou',     variant: 'destructive',dot: 'bg-red-500'   },
  aborted:    { label: 'Abortado',   variant: 'warning',   dot: 'bg-amber-500'  },
};

// Renderização
<StatusBadge status="running" />
// Output: • (pulsando verde) Executando
```

### 6.4 Table

```typescript
// Tabela padrão — histórico de execuções, top endpoints
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nome</TableHead>
      <TableHead className="text-right">p99 (ms)</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-muted/50 cursor-pointer">
      <TableCell className="font-medium">Login Test</TableCell>
      <TableCell className="text-right tabular-nums">1.847</TableCell>
    </TableRow>
  </TableBody>
</Table>

// Regras:
// - Números sempre text-right + tabular-nums
// - Hover sempre cursor-pointer quando a linha é clicável
// - Células de status usam StatusBadge
// - Sem zebra striping (muito visual) — usar borda inferior sutil
```

### 6.5 Input / Form Fields

```typescript
// Label + Input + descrição + erro — padrão
<div className="space-y-2">
  <Label htmlFor="target-url">URL-alvo</Label>
  <Input
    id="target-url"
    type="url"
    placeholder="https://meusite.com.br/login"
    className="font-mono"  // URLs sempre em mono
  />
  <p className="text-xs text-muted-foreground">
    O domínio precisa estar verificado antes de executar o teste.
  </p>
</div>

// Estado de erro
<Input className="border-destructive focus-visible:ring-destructive" />
<p className="text-xs text-destructive">URL inválida ou domínio não verificado.</p>

// Textarea para objetivo em linguagem natural
<Textarea
  placeholder="Ex: 10.000 usuários tentando fazer login simultaneamente"
  className="min-h-[100px] resize-none"
  maxLength={500}
/>
```

### 6.6 Tabs

```typescript
// Tabs usadas em: Dashboard de execução, Relatório
<Tabs defaultValue="overview">
  <TabsList className="border-b rounded-none w-full justify-start h-auto p-0 bg-transparent">
    <TabsTrigger
      value="overview"
      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none pb-2"
    >
      Visão Geral
    </TabsTrigger>
    <TabsTrigger value="details">Detalhes</TabsTrigger>
    <TabsTrigger value="logs">Logs</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">...</TabsContent>
</Tabs>

// Estilo: tabs underline (não boxed) — mais limpo em dashboards
```

### 6.7 Toast / Notificações

```typescript
// Usando shadcn Sonner (toast)

import { toast } from 'sonner';

// Sucesso
toast.success('Teste iniciado', {
  description: 'Acompanhe o progresso no dashboard.',
});

// Erro
toast.error('Falha ao iniciar teste', {
  description: error.message,
  action: { label: 'Tentar novamente', onClick: retry },
});

// Info (status intermediário)
toast.info('Script gerado pela IA', {
  description: 'Revise antes de executar.',
});

// Posição padrão: bottom-right
// Duração padrão: 4s (erros: 8s)
```

### 6.8 Dialog / Modal

```typescript
// Modal de confirmação de ações destrutivas
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Abortar Execução</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Abortar execução?</AlertDialogTitle>
      <AlertDialogDescription>
        O teste será encerrado imediatamente. Métricas coletadas até agora
        serão preservadas, mas o relatório será parcial.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive hover:bg-destructive/90"
        onClick={abortRun}
      >
        Abortar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// Regra: dialogs de confirmação SEMPRE descrevem a consequência da ação.
// Nunca usar "Tem certeza?" sem contexto.
```

---

## 7. Componentes de Domínio (específicos da plataforma)

### 7.1 MetricCard

Card de métrica para o topo do dashboard de execução.

```
┌─────────────────────────────────┐
│  Requisições/segundo            │
│                                 │
│  2.340          ▲ +12%          │
│  req/s        vs. 1 min atrás   │
│                                 │
│  [gráfico sparkline 60 pontos]  │
└─────────────────────────────────┘
```

**Props:**
```typescript
interface MetricCardProps {
  label: string;
  value: number;
  unit: string;
  delta?: number;           // variação percentual
  sparklineData?: number[]; // últimos 60 segundos
  status?: 'normal' | 'warning' | 'critical';
  // critical → borda vermelha + valor em vermelho
  // warning  → borda âmbar
  // normal   → padrão
}
```

### 7.2 RunStatusHeader

Barra de status fixa no topo da página de execução.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ● EXECUTANDO  •  Black Friday - Login Load Test  •  4:32 / 15:00   │
│                                                [Pausar] [Abortar]   │
└──────────────────────────────────────────────────────────────────────┘
```

**Estados visuais:**
- `running`: fundo `bg-green-50 border-green-200`, ícone pulsante verde
- `failed`: fundo `bg-red-50 border-red-200`
- `completed`: fundo `bg-slate-50 border-slate-200`

### 7.3 LatencyChart

Gráfico de linha múltipla para p50/p90/p99 em tempo real.

```typescript
interface LatencyChartProps {
  data: Array<{
    time: string;
    p50: number;
    p90: number;
    p99: number;
  }>;
  thresholds?: {
    warning: number;  // linha horizontal âmbar
    critical: number; // linha horizontal vermelha
  };
  height?: number; // default: 240
}
```

**Regras visuais:**
- Eixo Y: sempre começa em 0, escala automática com margem de 20%
- Eixo X: timestamps no formato `HH:mm:ss`
- Tooltip: aparece em hover, mostra todos os valores no mesmo timestamp
- Área de threshold violado: fundo vermelho translúcido `rgba(239,68,68,0.05)`
- Grid: linhas horizontais tracejadas `stroke-slate-200`
- Animação: desabilitada (`isAnimationActive={false}`) para RT sem jitter

### 7.4 VUsAreaChart

Gráfico de área para VUs ativos. Mostra rampa de subida e descida.

```typescript
interface VUsAreaChartProps {
  data: Array<{ time: string; vus: number; target: number }>;
  // target: linha tracejada da meta de VUs configurada
  height?: number;
}
```

**Estilo:** área preenchida com `#0EA5E920` (sky-500 12% opacidade), linha `#0EA5E9`.

### 7.5 HttpStatusBar

Barra horizontal empilhada mostrando distribuição de status HTTP.

```
200 OK ████████████████████████████████ 97.9%
400    ░ 0.8%
500    ██ 1.3%
```

```typescript
interface HttpStatusBarProps {
  counts: {
    '2xx': number;
    '4xx': number;
    '5xx': number;
  };
  total: number;
}
```

### 7.6 LogStream

Terminal de logs em tempo real com auto-scroll.

```typescript
// Visual: fundo dark (slate-900) mesmo no light mode
// Fonte: JetBrains Mono 12px
// Cores por nível:
// INFO  → text-slate-300
// WARN  → text-amber-400
// ERROR → text-red-400

// Formato de cada linha:
// [12:34:15.123] INFO  Rampa atingiu 8.000 VUs
```

**Comportamento:**
- Auto-scroll quando novo log chega (a menos que o usuário tenha scrollado manualmente)
- Máximo de 1.000 linhas em memória (janela deslizante)
- Botão "Limpar" e "Pausar scroll"

### 7.7 ScriptEditor

Editor de código k6 com syntax highlighting.

```typescript
// Usar Monaco Editor (mesmo do VS Code)
// Tema: vs (light) / vs-dark (dark)
// Language: javascript
// Readonly: quando em modo de visualização
// Altura mínima: 300px, máxima: 500px

// Toolbar acima do editor:
// [Copiar] [Baixar .js] [Regenerar com IA] [Modo Fullscreen]
```

### 7.8 DomainVerificationCard

Card do passo de verificação de domínio.

```
┌─────────────────────────────────────────────────────────┐
│  Verificar domínio: meusite.com.br                      │
│                                                         │
│  Escolha um método:                                     │
│                                                         │
│  ○ DNS TXT record                                       │
│    Adicione o registro abaixo no DNS do domínio:        │
│    ┌───────────────────────────────────────────────┐    │
│    │ _perfsaas-verify  TXT  "perfsaas-verify=abc123│    │
│    └───────────────────────────────────────────────┘    │
│    [Copiar]                                             │
│                                                         │
│  ○ Arquivo no servidor                                  │
│    Crie o arquivo: /.well-known/perfsaas-verify.txt     │
│    Conteúdo: abc123def456...                            │
│                                                         │
│  [Verificar agora]  ← polling a cada 5s automaticamente │
│                                                         │
│  Status: ⏳ Aguardando verificação...                  │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Layout e Navegação

### 8.1 Shell da Aplicação

```
┌──────────────────────────────────────────────────────────────────────┐
│  TOPBAR (h-16, border-b, sticky top-0 z-50)                         │
│  [Logo PerfSaaS]        [Notificações] [Avatar + Menu usuário]       │
└──────────────────────────────────────────────────────────────────────┘
┌───────────────┐  ┌──────────────────────────────────────────────────┐
│  SIDEBAR      │  │  MAIN CONTENT                                    │
│  (w-64)       │  │  (flex-1, overflow-auto)                         │
│  sticky       │  │                                                  │
│               │  │  Breadcrumb                                      │
│  Dashboard    │  │  ────────────────────────────────                │
│  Meus Testes  │  │                                                  │
│  Execuções    │  │  [Conteúdo da página]                            │
│  ─────────    │  │                                                  │
│  Domínios     │  │                                                  │
│  Configurações│  │                                                  │
│  ─────────    │  │                                                  │
│  (Admin only) │  │                                                  │
│  Usuários     │  │                                                  │
└───────────────┘  └──────────────────────────────────────────────────┘
```

**Sidebar:**
- Largura: `w-64` (256px) desktop, drawer no mobile
- Item ativo: `bg-accent text-accent-foreground rounded-md`
- Ícones: Lucide icons, `h-4 w-4`
- Seções separadas por `<Separator />` + label em `text-xs text-muted-foreground uppercase tracking-wider`

**Topbar:**
- Altura: `h-16`
- Fundo: `bg-background border-b border-border`
- Logo: `text-lg font-semibold` com ícone de atividade (Lucide `Activity`)

### 8.2 Breakpoints

| Breakpoint | Valor  | Comportamento                                      |
|------------|--------|----------------------------------------------------|
| `sm`       | 640px  | Mobile landscape — sidebar colapsa em drawer       |
| `md`       | 768px  | Tablet — sidebar visível mas compacta (ícones)     |
| `lg`       | 1024px | Desktop — layout completo com sidebar + conteúdo   |
| `xl`       | 1280px | Desktop wide — grid de cards expande para 4 colunas|
| `2xl`      | 1536px | Ultra wide — max-width do conteúdo é `max-w-7xl`   |

### 8.3 Grids de Cards (Dashboard)

```typescript
// Grid de métricas (topo do dashboard de execução)
<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
  <MetricCard label="VUs Ativos" ... />
  <MetricCard label="Req/segundo" ... />
  <MetricCard label="Taxa de Erro" ... />
  <MetricCard label="p99" ... />
</div>

// Grid de gráficos
<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
  <Card> {/* Latência */} </Card>
  <Card> {/* VUs ativos */} </Card>
</div>

// Grid de histórico (listagem)
<div className="grid grid-cols-1 gap-4">
  {/* Tabela fullwidth */}
</div>
```

---

## 9. Iconografia

**Biblioteca:** Lucide React (consistente com shadcn/ui)

| Contexto                  | Ícone Lucide          |
|---------------------------|-----------------------|
| Logo / branding           | `Activity`            |
| Novo teste                | `Plus`                |
| Executar                  | `Play`                |
| Pausar                    | `Pause`               |
| Abortar                   | `Square`              |
| Concluído                 | `CheckCircle2`        |
| Falhou                    | `XCircle`             |
| Aviso / threshold         | `AlertTriangle`       |
| Relatório / PDF           | `FileText`            |
| Download                  | `Download`            |
| Compartilhar              | `Share2`              |
| Domínio / URL             | `Globe`               |
| Usuários (admin)          | `Users`               |
| Configurações             | `Settings`            |
| Script / código           | `Code2`               |
| IA / agente               | `Sparkles`            |
| Histórico                 | `History`             |
| Comparar                  | `GitCompare`          |
| Copiar para clipboard     | `Copy`                |
| Refresh / reload          | `RefreshCw`           |
| Filtrar                   | `Filter`              |
| Ordenar                   | `ArrowUpDown`         |

**Tamanhos:**
- `h-4 w-4` — ícones inline em botões e itens de menu
- `h-5 w-5` — ícones em headings de card
- `h-8 w-8` — ícones em estados vazios (empty state)
- `h-12 w-12` — ícones em ilustrações de onboarding

---

## 10. Estados Especiais

### 10.1 Empty State

```typescript
// Quando não há execuções ainda
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="rounded-full bg-muted p-4 mb-4">
    <Activity className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-semibold mb-2">Nenhuma execução ainda</h3>
  <p className="text-sm text-muted-foreground max-w-sm mb-6">
    Crie e execute um teste para ver os resultados aqui.
  </p>
  <Button>
    <Plus className="mr-2 h-4 w-4" />
    Novo Teste
  </Button>
</div>
```

### 10.2 Loading / Skeleton

```typescript
// Skeleton para cards de métricas carregando
<Card>
  <CardHeader>
    <Skeleton className="h-4 w-32" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-8 w-24 mb-2" />
    <Skeleton className="h-16 w-full" />  {/* sparkline */}
  </CardContent>
</Card>

// Regra: nunca mostrar spinner global. Usar skeleton contextual.
```

### 10.3 Error State

```typescript
// Erro ao carregar dados
<div className="flex flex-col items-center justify-center py-12 text-center">
  <XCircle className="h-8 w-8 text-destructive mb-3" />
  <p className="text-sm font-medium">Erro ao carregar execuções</p>
  <p className="text-xs text-muted-foreground mb-4">{error.message}</p>
  <Button variant="outline" size="sm" onClick={retry}>
    <RefreshCw className="mr-2 h-3 w-3" />
    Tentar novamente
  </Button>
</div>
```

### 10.4 Threshold Violation

Quando uma métrica ultrapassa o threshold configurado, o card deve sinalizar visualmente sem interromper o fluxo:

```typescript
// MetricCard com status critical
// - Borda do card: border-red-300
// - Valor: text-destructive
// - Ícone de alerta: AlertTriangle ao lado do valor
// - Badge "Threshold violado" em destructive

// Sem toast / modal — o card já comunica o problema inline
```

---

## 11. Animações

**Princípio:** animações existem para orientar o usuário, não para enfeitar.

| Situação                        | Animação                                     | Duração |
|---------------------------------|----------------------------------------------|---------|
| Métricas atualizando (RT)       | Nenhuma — `isAnimationActive={false}`        | —       |
| Status mudando (badge)          | Fade in suave                                | 150ms   |
| Card entrando na tela           | `animate-in fade-in-0 slide-in-from-top-1`  | 200ms   |
| Modal abrindo                   | shadcn padrão (zoom-in 95%)                  | 150ms   |
| Sidebar expandindo              | `transition-all duration-200`               | 200ms   |
| Skeleton → conteúdo             | Fade in                                      | 300ms   |
| Dot de status "running"         | `animate-pulse`                              | loop    |
| Loader em botão                 | `animate-spin`                               | loop    |

**Não usar:** transform scale em hover de cards (cria instabilidade em grids), parallax, transições de página full-screen.

---

## 12. Tailwind Config (extensões)

```typescript
// tailwind.config.ts

import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Status semânticos expostos como classes Tailwind
        success: {
          DEFAULT: 'hsl(var(--success))',
          subtle:  'hsl(var(--success-subtle))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          subtle:  'hsl(var(--warning-subtle))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          subtle:  'hsl(var(--info-subtle))',
          foreground: 'hsl(var(--info-foreground))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

---

## 13. Nomenclatura de Componentes e Arquivos

```
components/
├── ui/                         # shadcn/ui (NÃO editar diretamente)
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── ...
│
├── layout/                     # Shell da aplicação
│   ├── app-shell.tsx
│   ├── sidebar.tsx
│   ├── topbar.tsx
│   └── breadcrumb.tsx
│
├── common/                     # Componentes genéricos reutilizáveis
│   ├── status-badge.tsx        # StatusBadge (usa statusConfig)
│   ├── empty-state.tsx         # EmptyState
│   ├── error-state.tsx         # ErrorState
│   └── confirm-dialog.tsx      # ConfirmDialog (destructive)
│
├── metrics/                    # Componentes de métricas e gráficos
│   ├── metric-card.tsx         # MetricCard
│   ├── latency-chart.tsx       # LatencyChart (Recharts)
│   ├── vus-area-chart.tsx      # VUsAreaChart
│   ├── http-status-bar.tsx     # HttpStatusBar
│   └── log-stream.tsx          # LogStream
│
├── tests/                      # Componentes do wizard e listagem
│   ├── test-wizard.tsx         # Wizard completo (multi-step)
│   ├── domain-verification.tsx # DomainVerificationCard
│   ├── script-editor.tsx       # ScriptEditor (Monaco)
│   └── test-card.tsx           # Card resumo de um TestPlan
│
└── runs/                       # Componentes de execução e relatório
    ├── run-status-header.tsx   # RunStatusHeader
    ├── run-report.tsx          # Relatório final estruturado
    └── run-comparison.tsx      # Comparação side-by-side
```

**Convenções:**
- Nome de arquivo: `kebab-case.tsx`
- Nome do componente: `PascalCase`
- Props interface: `ComponentNameProps`
- Exportação: sempre `export default` para componentes de página, named exports para componentes de UI
- Sem arquivos `index.ts` em pastas de componentes (dificulta navegação)

---

*Documento criado em: 2026-04-07*  
*Versão: 1.0.0*
