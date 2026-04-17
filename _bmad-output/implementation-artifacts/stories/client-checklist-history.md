# Story: Histórico de Checklists no Perfil do Cliente

**Prioridade:** P1 — Operacional crítico  
**Contexto:** Volume de 2×/semana por estabelecimento torna a rastreabilidade essencial.  
**Área:** `app/(app)/clientes/[id]/` · `components/clientes/` · `lib/actions/checklist-fill.ts`

---

## 1. Contexto e Necessidade

A nutricionista realiza múltiplos checklists por mês em cada estabelecimento (podendo chegar a
2× por semana). Ela precisa consultar rapidamente:

- Quais checklists foram aplicados em cada estabelecimento e em que datas
- Quais itens estavam **em conformidade** e quais em **não conformidade (NC)**
- O **plano de ação** registrado para cada NC (o que foi proposto para corrigir)
- Progresso ao longo do tempo (o estabelecimento melhorou? os NC se repetem?)

Atualmente não há nenhuma visão de histórico — o usuário precisa acessar cada sessão
individualmente via URL, sem forma de navegar pelo histórico.

---

## 2. Decisão de Arquitetura

### Onde colocar?

A página atual de edição do cliente (`/clientes/[id]/editar`) é um longo scroll com formulário,
financeiro, contratos e estabelecimentos. Adicionar uma aba de checklists nela tornaria a
página ainda mais pesada.

**Decisão:** Criar uma **rota dedicada** `/clientes/[id]/checklists` com:
- Histórico completo de todos os estabelecimentos do cliente
- Filtros por estabelecimento, período, status e template
- Visão por estabelecimento agregada (drill-down)

**Na página do cliente** (`/clientes/[id]/editar`): adicionar um **card de acesso rápido**
na seção de Estabelecimentos com o resumo dos últimos checklists e link "Ver histórico completo".

**Na página do estabelecimento** (`/clientes/[id]/estabelecimentos/[estId]/editar`): adicionar
uma nova **Seção 3: Checklists** com os últimos 5 checklists + link para o histórico filtrado.

---

## 3. Modelo de Dados — Leitura

Todos os dados já existem no banco. Nenhuma migration de schema obrigatória para a MVP.

### Tabelas envolvidas

```
checklist_fill_sessions
  id, user_id, establishment_id, template_id, custom_template_id,
  dossier_approved_at, created_at, updated_at

checklist_fill_item_responses
  id, session_id, template_item_id, custom_item_id,
  outcome (conforme|nc|na), note, item_annotation, created_at

checklist_templates          → name, portaria_ref
checklist_custom_templates   → name
checklist_template_items     → description, is_required
checklist_custom_items       → description, is_required
establishments               → id, name, establishment_type, state
```

### Métricas por sessão (calculadas na query)

| Campo | Origem |
|-------|--------|
| `conformant_count` | COUNT responses WHERE outcome = 'conforme' |
| `nc_count` | COUNT responses WHERE outcome = 'nc' |
| `na_count` | COUNT responses WHERE outcome = 'na' |
| `total_items` | COUNT items do template |
| `pending_count` | total_items - (conformant + nc + na) |
| `status` | dossier_approved_at IS NOT NULL → 'aprovado' ELSE 'em_andamento' |

### Sobre o "Plano de Ação"

O campo `item_annotation` (texto livre opcional, já existe) serve como campo de plano de ação.
O `note` é a descrição da NC em si. Na UI exibir:
- `note` como **"Descrição da NC"**
- `item_annotation` como **"Plano de ação / observação"**

> **Futura evolução:** Se a nutricionista precisar de um campo explícito "Plano de ação" com
> responsável + prazo, criar migration com `action_plan_text`, `action_plan_due_date`,
> `action_plan_responsible` em `checklist_fill_item_responses`. Por ora, `item_annotation` basta.

---

## 4. Escopo da Implementação

### Task E — Nova rota: `/clientes/[id]/checklists`

#### E.1 — Server action: `loadChecklistSessionsForClient`

**Arquivo:** `lib/actions/checklist-fill.ts` (ou novo `lib/actions/checklist-history.ts`)

```ts
export type ChecklistSessionSummary = {
  id: string;
  created_at: string;
  updated_at: string;
  dossier_approved_at: string | null;
  status: "em_andamento" | "aprovado";
  template_name: string;
  establishment_id: string;
  establishment_name: string;
  establishment_type: EstablishmentType;
  conformant_count: number;
  nc_count: number;
  na_count: number;
  pending_count: number;
  total_items: number;
};

export async function loadChecklistSessionsForClient(input: {
  clientId: string;
  establishmentId?: string | null; // filtro opcional
  status?: "em_andamento" | "aprovado" | null;
  limit?: number;  // default 50
  offset?: number; // default 0
}): Promise<{ rows: ChecklistSessionSummary[]; total: number }>
```

**Lógica obrigatória:**
1. Verificar que o usuário autenticado é owner do cliente (`clients.owner_user_id = auth.uid()`).
2. Buscar establishments do cliente.
3. Buscar sessions para esses establishments, com joins para template name e contagem de responses.
4. Calcular `total_items` via JOIN com template sections/items.
5. Ordenar por `updated_at DESC`.
6. Aplicar filtros: `establishmentId`, `status`.

#### E.2 — Server action: `loadChecklistSessionNcItems`

```ts
export type NcItemDetail = {
  item_id: string;
  description: string;
  is_required: boolean;
  note: string | null;           // descrição da NC
  item_annotation: string | null; // plano de ação
};

export async function loadChecklistSessionNcItems(
  sessionId: string,
): Promise<NcItemDetail[]>
```

Busca apenas itens com `outcome = 'nc'` da sessão, validando que o usuário é owner.
Usada ao expandir uma sessão no histórico.

#### E.3 — Página `/clientes/[id]/checklists/page.tsx`

**Rota:** `app/(app)/clientes/[id]/checklists/page.tsx`

**Estrutura da página:**

```
PageHeader:
  Título: "Histórico de Checklists — [Nome do Cliente]"
  Breadcrumb: Clientes → [Nome] → Checklists
  
Filtros (client component):
  [Dropdown: Todos os estabelecimentos | Est. X | Est. Y]
  [Dropdown: Todos os status | Em andamento | Aprovados]
  [DateRange: De [data] Até [data]]  ← opcional, MVP pode omitir
  
Resumo agregado (cards no topo):
  📋 [N] checklists realizados
  ✅ [N] aprovados
  ⏳ [N] em andamento
  ⚠️  [N] NCs abertas (itens nc em sessões em_andamento)

Lista de sessões (server component, paginada):
  Para cada sessão → ChecklistSessionHistoryCard (ver abaixo)
  
Paginação: "Mostrando 1–20 de N checklists"
```

#### E.4 — Componente `ChecklistSessionHistoryCard`

**Novo arquivo:** `components/checklists/checklist-session-history-card.tsx`

```
┌──────────────────────────────────────────────────────┐
│ 📋 [Nome do Template]                    [Status badge]│
│ [Estabelecimento] · [Data] · [Portaria]               │
│                                                       │
│ ████████░░  [N] conforme  [N] NC  [N] NA  [N] pendente│
│  barra de progresso visual                            │
│                                                       │
│ [Ver dossiê completo ↗]  [▼ Ver NCs]                 │
└──────────────────────────────────────────────────────┘
```

**Ao clicar "Ver NCs"** (client component): expande uma lista dos itens NC com:
```
┌─ Item NC expandido ──────────────────────────────────┐
│ ⚠ [Descrição do item]              [Obrigatório]      │
│                                                       │
│ Não conformidade:                                     │
│ [texto da note]                                       │
│                                                       │
│ Plano de ação:                                        │
│ [texto do item_annotation ou "Não registrado"]        │
└──────────────────────────────────────────────────────┘
```

**Carregamento lazy de NCs:** Ao clicar "Ver NCs" pela primeira vez, chamar
`loadChecklistSessionNcItems(sessionId)` via Server Action. Não carregar de antemão
(performance com alto volume de sessões).

**Badge de status:**
- `em_andamento` → badge amber "Em andamento"
- `aprovado` → badge green "Aprovado"

**Barra de progresso:**
```
conformant / total_items → largura da barra verde
nc / total_items → largura da porção vermelha
```

---

### Task F — Card de acesso rápido na página do cliente

**Arquivo:** `app/(app)/clientes/[id]/editar/page.tsx`

Adicionar **dentro da seção `EstablishmentsSection`** (apenas para clientes PJ) um card
de acesso rápido **abaixo** da lista de estabelecimentos:

```tsx
{row.kind === "pj" && (
  <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
    <div>
      <p className="text-sm font-medium text-foreground">Histórico de checklists</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Veja todos os checklists realizados nos estabelecimentos deste cliente.
      </p>
    </div>
    <Link href={`/clientes/${row.id}/checklists`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
      Ver histórico →
    </Link>
  </div>
)}
```

---

### Task G — Seção de checklists na página do estabelecimento

**Arquivo:** `app/(app)/clientes/[id]/estabelecimentos/[estId]/editar/page.tsx`

Adicionar nova seção **entre Compliance e Pacientes** (após Seção 2, antes da Seção 3):

```tsx
{/* ── Seção 3: Histórico de checklists ─────── */}
<Card>
  <CardHeader>
    <CardTitle>Checklists realizados</CardTitle>
    <CardDescription>
      Últimos preenchimentos neste estabelecimento.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <EstablishmentChecklistHistorySection
      clientId={clientId}
      establishmentId={row.id}
    />
  </CardContent>
</Card>
```

**Novo componente:** `components/clientes/establishment-checklist-history-section.tsx`

Server component. Chama `loadChecklistSessionsForClient({ clientId, establishmentId, limit: 5 })`.

Exibe:
- Se 0 sessões: "Nenhum checklist realizado ainda. Inicie um preenchimento no catálogo."
- Se N sessões: lista compacta com as 5 mais recentes + link "Ver todos os checklists →"
- Cada item: template name, data, status badge, resumo conformante/NC

---

## 5. Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `app/(app)/clientes/[id]/checklists/page.tsx` | Criar — rota principal do histórico |
| `components/checklists/checklist-session-history-card.tsx` | Criar — card expandível por sessão |
| `components/clientes/establishment-checklist-history-section.tsx` | Criar — seção compacta no est. |
| `lib/actions/checklist-fill.ts` (ou novo arquivo) | Modificar/Criar — Tasks E.1 e E.2 |
| `app/(app)/clientes/[id]/editar/page.tsx` | Modificar — Task F (link de acesso rápido) |
| `app/(app)/clientes/[id]/estabelecimentos/[estId]/editar/page.tsx` | Modificar — Task G |

---

## 6. Plano de Testes

### 6.1 Testes manuais obrigatórios

| Cenário | Passos | Resultado esperado |
|---------|--------|--------------------|
| Histórico vazio | Cliente PJ sem checklists → `/checklists` | Empty state com CTA |
| Histórico com sessões | 3+ checklists realizados → histórico | Lista ordenada por data desc |
| Filtro por estabelecimento | Selecionar Est. X no dropdown | Apenas sessões daquele est. |
| Filtro por status | Selecionar "Aprovados" | Apenas sessões com dossier_approved_at |
| Expandir NCs | Sessão com 2 NCs → clicar "Ver NCs" | Carrega lazy os 2 itens NC |
| Plano de ação vazio | NC sem item_annotation | Exibe "Não registrado" |
| Plano de ação preenchido | NC com item_annotation → histórico | Exibe o texto corretamente |
| Acesso não autorizado | `/clientes/[outro-id]/checklists` | notFound() |
| Card de acesso rápido | Página do cliente PJ | Card "Histórico de checklists" visível |
| Estabelecimento PF | Página de cliente PF | Sem card de checklists |
| Seção no estabelecimento | Página do estabelecimento | Últimas 5 sessões + link |
| Alto volume | Estabelecimento com 50 sessões | Paginação funciona; não carrega tudo |

### 6.2 TypeScript & build

```bash
npx tsc --noEmit
```

Zero erros.

### 6.3 Performance

- `loadChecklistSessionsForClient` deve usar índice `establishment_id` + `updated_at DESC`.
- NCs carregadas **lazy** (só quando o usuário expande) — não bloqueiam a listagem.
- Limit default 50; implementar paginação antes/depois (offset-based).

### 6.4 Segurança — Auditoria obrigatória

**Executar a skill `nutrigestao-security`** após implementação para auditar:
- `loadChecklistSessionsForClient` — verificar que `owner_user_id = auth.uid()` está na
  primeira linha de validação (antes de qualquer query de dados).
- `loadChecklistSessionNcItems` — validar que a sessão pertence a um estabelecimento de um
  cliente do usuário (não apenas que o sessionId existe).
- Rota `/clientes/[id]/checklists` — verificar que `notFound()` é chamado se o cliente não
  pertencer ao usuário.
- Sem exposição de `user_id` de outros usuários no frontend (ex.: campo `started_by_me`
  definido no server, nunca enviado ao cliente via props).

---

## 7. Restrições e Decisões de Design

1. **Sem nova tabela de banco** — Todos os dados já existem. Nenhuma migration de schema.
2. **NC lazy loading** — Evitar N+1 queries; NCs carregadas ao expandir, não no list.
3. **Plano de ação = `item_annotation`** — Campo opcional já existente. Não criar novo campo
   no MVP. Documentar para evolução futura.
4. **Não substituir a página `/checklists`** — O catálogo permanece. O histórico é um novo
   recurso dentro do perfil do cliente.
5. **Só clientes PJ** — Checklists de portaria só se aplicam a estabelecimentos (PJ).
   Clientes PF não têm essa seção.
6. **Paginação obrigatória** — Com 2×/semana, em 3 meses já são ~25 sessões por est.
   Implementar limit/offset desde o início.

---

## 8. Prompt de Implementação (copiar e colar no agente de dev)

```
Você é o desenvolvedor full-stack do projeto NutriGestão SaaS (Next.js 15 + TypeScript strict
+ Supabase + shadcn/ui). Implemente a Story "Histórico de Checklists no Perfil do Cliente".
Siga as convenções: RLS, TypeScript strict, sem `any`, Server Actions com "use server".

─── CONTEXTO ────────────────────────────────────────────────────────────────────

A nutricionista realiza múltiplos checklists por mês em cada estabelecimento (até 2×/semana).
Ela precisa ver o histórico de todos os checklists de um cliente, o que estava conforme, o que
estava NC, e o plano de ação registrado. Hoje não existe essa visão.

Dados já existem em:
  checklist_fill_sessions, checklist_fill_item_responses,
  checklist_templates, checklist_custom_templates,
  checklist_template_items, checklist_custom_items, establishments

─── TASK E — Nova rota e server actions de histórico ────────────────────────────

E.1 — Criar em lib/actions/checklist-fill.ts (ou lib/actions/checklist-history.ts):

export type ChecklistSessionSummary = {
  id: string;
  created_at: string;
  updated_at: string;
  dossier_approved_at: string | null;
  status: "em_andamento" | "aprovado";
  template_name: string;
  establishment_id: string;
  establishment_name: string;
  establishment_type: string;
  conformant_count: number;
  nc_count: number;
  na_count: number;
  pending_count: number;
  total_items: number;
};

export async function loadChecklistSessionsForClient(input: {
  clientId: string;
  establishmentId?: string | null;
  status?: "em_andamento" | "aprovado" | null;
  limit?: number;    // default 50
  offset?: number;   // default 0
}): Promise<{ rows: ChecklistSessionSummary[]; total: number }>

VALIDAÇÃO OBRIGATÓRIA (primeira coisa na função):
  Verificar auth.uid() e que clients.owner_user_id = auth.uid() para o clientId.
  Retornar { rows: [], total: 0 } ou lançar erro se não autorizado.

LÓGICA:
1. Buscar establishment ids do cliente
2. Buscar checklist_fill_sessions WHERE establishment_id IN (ids)
   Filtros opcionais: establishment_id, dossier_approved_at IS NULL/NOT NULL
3. Para cada sessão, contar respostas agrupadas por outcome
4. Calcular total_items via template sections/items (ou custom sections/items)
5. pending_count = total_items - (conformant + nc + na)
6. JOIN para template_name e establishment_name
7. ORDER BY updated_at DESC, LIMIT/OFFSET

E.2 — Criar loadChecklistSessionNcItems(sessionId: string): Promise<NcItemDetail[]>

export type NcItemDetail = {
  item_id: string;
  description: string;
  is_required: boolean;
  note: string | null;
  item_annotation: string | null;
};

VALIDAÇÃO: verificar que a sessão pertence a um estabelecimento de um cliente do usuário.
Buscar checklist_fill_item_responses WHERE session_id = sessionId AND outcome = 'nc'
JOIN com checklist_template_items OU checklist_custom_items para description e is_required.

E.3 — Criar app/(app)/clientes/[id]/checklists/page.tsx

Chamar loadChecklistSessionsForClient({ clientId, limit: 50 }) no server.
Se cliente não for owner → notFound().

Layout:
  PageHeader: "Histórico de Checklists — {client.legal_name}"
  Breadcrumb: Clientes → {client.legal_name} → Checklists
  
  Cards de resumo (4 cards em grid 2×2 mobile / 4×1 desktop):
    Total de checklists | Aprovados | Em andamento | NCs abertas
    
  Filtros (client component "use client"):
    Select: todos os estabelecimentos | cada est. com nome
    Select: todos os status | Em andamento | Aprovados
    Ao mudar filtro → router.push com search params → página recarrega com dados filtrados
    (implementar via searchParams no page.tsx, não via fetch client-side)
  
  Lista de sessões: <ChecklistSessionHistoryCard> para cada row
  
  Paginação simples: botões Anterior/Próxima, "Mostrando X–Y de Z"

E.4 — Criar components/checklists/checklist-session-history-card.tsx

"use client" (precisa de estado para expand/collapse NCs)

Props: session: ChecklistSessionSummary

Visual:
  Header: [nome template] + [badge status: "Em andamento" amber | "Aprovado" green]
  Sub: [estabelecimento] · [data formatada pt-BR] · [portaria ref se disponível]
  
  Barra de progresso:
    div com flex horizontal:
      - verde: (conformant_count / total_items) * 100%
      - vermelho: (nc_count / total_items) * 100%
      - cinza: resto (na + pending)
    Legendas: "N conforme · N NC · N NA · N pendente"
  
  Rodapé:
    [Link "Ver dossiê" → /checklists/preencher/{id}]
    [Button "Ver NCs (N)" → lazy load NcItems]
    [Button ocultar NCs se expandido]
  
  Seção lazy de NCs (quando expandido):
    Para cada NcItemDetail:
      Ícone alerta (amber) + descrição do item + badge "Obrigatório" se is_required
      "Descrição da NC:" + note (ou "—")
      "Plano de ação:" + item_annotation (ou "Não registrado")
  
  Ao clicar "Ver NCs":
    useState para ncs: NcItemDetail[] | null
    Se null → chamar loadChecklistSessionNcItems(session.id) → setar ncs
    Se já carregado → apenas toggle visibilidade

─── TASK F — Card de acesso rápido na página do cliente ─────────────────────────

Arquivo: app/(app)/clientes/[id]/editar/page.tsx

Dentro do bloco {row.kind === "pj"}, APÓS o componente <EstablishmentsSection />,
adicionar:

  <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
    <div>
      <p className="text-sm font-medium">Histórico de checklists</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Todos os checklists realizados nos estabelecimentos deste cliente.
      </p>
    </div>
    <Link href={`/clientes/${row.id}/checklists`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
      Ver histórico →
    </Link>
  </div>

─── TASK G — Seção de checklists na página do estabelecimento ───────────────────

Arquivo: app/(app)/clientes/[id]/estabelecimentos/[estId]/editar/page.tsx

Adicionar nova seção ENTRE "Compliance regulatório" e "Pacientes":

  <Card>
    <CardHeader className="border-b border-border pb-4">
      <CardTitle className="text-base">Checklists realizados</CardTitle>
      <CardDescription>Últimos preenchimentos neste estabelecimento.</CardDescription>
    </CardHeader>
    <CardContent className="pt-6">
      <EstablishmentChecklistHistorySection
        clientId={clientId}
        establishmentId={row.id}
      />
    </CardContent>
  </Card>

Criar components/clientes/establishment-checklist-history-section.tsx:
  Server component (sem "use client").
  Chamar loadChecklistSessionsForClient({ clientId, establishmentId: estId, limit: 5 }).
  
  Se 0 sessões:
    Empty state: "Nenhum checklist realizado neste estabelecimento."
    Link: "Ir ao catálogo de checklists →" → /checklists
  
  Se N sessões:
    Lista compacta (não usa ChecklistSessionHistoryCard completo — versão simplificada):
      Para cada sessão: [template name] · [data] · [badge status] · [N NC / N conforme]
    Link: "Ver histórico completo →" → /clientes/{clientId}/checklists?est={estId}

─── TESTES OBRIGATÓRIOS ─────────────────────────────────────────────────────────

1. Rota /clientes/[id]/checklists com cliente alheio → notFound()
2. Filtro por estabelecimento → lista mostra apenas sessões desse est.
3. Clicar "Ver NCs" em sessão com 2 NCs → carrega e exibe os 2 itens
4. NC sem item_annotation → exibe "Não registrado"
5. Card de acesso rápido visível apenas para clientes PJ
6. Seção no estabelecimento com 0 sessões → empty state com link ao catálogo
7. Paginação: 60 sessões → primeira página mostra 50; "Próxima" mostra os 10 restantes
8. npx tsc --noEmit → zero erros

─── SEGURANÇA — OBRIGATÓRIO APÓS IMPLEMENTAÇÃO ──────────────────────────────────

Executar skill `nutrigestao-security` para auditar:
1. loadChecklistSessionsForClient — owner_user_id validation antes de qualquer query
2. loadChecklistSessionNcItems — validar ownership da sessão via join establishments→clients
3. Rota /checklists — notFound() se cliente não pertencer ao usuário
4. Dados de outros usuários não expostos no frontend

─── CONVENÇÕES ──────────────────────────────────────────────────────────────────

- TypeScript strict, sem any
- Server components para listagem; "use client" apenas onde há estado
- shadcn/ui Card, Badge, Button, Link existentes
- Ícones: lucide-react (CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp)
- Sem novas dependências npm
- Sem migrations de schema — usar campos existentes
- Paginação obrigatória desde a MVP (limit/offset)
```

---

## 9. Checklist de Revisão (pós-implementação)

- [ ] Task E.1: `loadChecklistSessionsForClient` com owner validation + métricas calculadas
- [ ] Task E.2: `loadChecklistSessionNcItems` com ownership check
- [ ] Task E.3: Rota `/clientes/[id]/checklists` com filtros via searchParams
- [ ] Task E.4: `ChecklistSessionHistoryCard` com barra de progresso + NC lazy load
- [ ] Task F: Card de acesso rápido no perfil do cliente (somente PJ)
- [ ] Task G: Seção compacta na página do estabelecimento
- [ ] Paginação implementada (limit/offset)
- [ ] `npx tsc --noEmit` → zero erros
- [ ] Auditoria `nutrigestao-security` executada
- [ ] Testado com alto volume de sessões (50+)
