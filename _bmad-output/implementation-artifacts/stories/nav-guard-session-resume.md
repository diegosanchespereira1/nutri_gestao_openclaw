# Story: Proteção de Navegação e Retomada de Sessão de Checklist

**Prioridade:** P0 — Regressão crítica de dados  
**Área:** `components/checklists/checklist-fill-wizard.tsx` · `app/(app)/checklists/` · `lib/actions/checklist-fill.ts`

---

## 1. Diagnóstico — Causa-Raiz

### O que acontece hoje

1. O usuário inicia um preenchimento → server action `startChecklistFill` cria uma linha em  
   `checklist_fill_sessions` → redireciona para `/checklists/preencher/{SESSION_ID}`.
2. Cada resposta de item (radio conforme/nc/na) dispara `saveFillItemResponse` dentro de  
   `startTransition` — **o dado é salvo no Supabase**.
3. Campos de **nota** e **anotação** só são salvos `onBlur`. Se o usuário navegar antes de  
   tirar o foco do campo, o texto digitado **se perde**.
4. Ao pressionar o botão Voltar do browser, o Next.js App Router navega para a página anterior  
   (ex.: `/checklists`). O catálogo **não detecta que já existe um rascunho** para aquele template  
   + estabelecimento.
5. O usuário seleciona o template novamente e clica "Usar template" → `startChecklistFill`  
   cria uma **nova sessão** → o usuário crê que os dados sumiram (a sessão antiga existe no  
   banco, mas é invisível).

### Resumo dos problemas

| # | Problema | Impacto |
|---|----------|---------|
| A | Texto de nota/anotação perdido se navegar sem blur | Perda real de dado |
| B | Sem interceção do botão Voltar — nenhum aviso ao usuário | UX péssima no mobile |
| C | "Usar template" não checa rascunho existente → cria duplicata | Dado "sumido" para o usuário |
| D | Nenhum indicador de progresso salvo no wizard | Usuário não sabe que dado está seguro |

---

## 2. Escopo da Implementação

### Task A — Auto-save com debounce para nota e anotação

**Problema:** `setNote` e `setAnnotation` só persistem `onBlur`. Em mobile o usuário pode  
clicar em outro item ou no botão Voltar sem o campo perder o foco.

**Solução:** Adicionar debounce de **800 ms** após a última keystroke nos campos de texto.  
O save por `onBlur` permanece como flush imediato (fall-through seguro).

**Arquivo:** `components/checklists/checklist-fill-wizard.tsx`

**Implementação:**
```ts
// Novo hook local — usar useRef + clearTimeout para não criar dependência externa
function useDebouncedCallback(fn: () => void, delay = 800) { ... }

// Substituir onChange de nota/anotação:
onChange={(e) => {
  setNote(item.id, e.target.value);
  debouncedSave(item.id); // flush após 800ms
}}
```

**Critério de aceite:**
- [ ] Digitar em campo de nota e navegar via botão Voltar em menos de 800 ms: dado salvo
- [ ] `saveFillItemResponse` não é chamado mais que 1× por segundo por item

---

### Task B — Guarda de navegação: `beforeunload` + popstate + hook customizado

**Problema:** Nenhuma interceção de navegação acidental — browser back, fechamento de aba,  
reload.

**Solução:** Criar hook `useNavigationGuard` que:
1. Registra `window.addEventListener('beforeunload', ...)` → dispara diálogo nativo do browser  
   ao fechar aba / recarregar.
2. Registra `window.addEventListener('popstate', ...)` → ao pressionar Voltar do browser,  
   **cancela** o evento com `history.pushState` (repõe a URL) e abre um modal customizado.
3. Desativa o guard automaticamente ao dossiê ser aprovado (`formLocked === true`).

**Novo arquivo:** `hooks/use-navigation-guard.ts`

```ts
export function useNavigationGuard(options: {
  active: boolean;            // false quando dossiê aprovado
  onConfirmLeave: () => void; // callback chamado se usuário confirmar saída
}): {
  guardTriggered: boolean;    // true quando modal deve ser exibido
  confirmLeave: () => void;   // chamar para confirmar saída
  cancelLeave: () => void;    // chamar para cancelar (permanecer)
}
```

Deve:
1. `window.addEventListener('beforeunload', handler)` → retornar string não-vazia para aviso nativo
2. `window.addEventListener('popstate', handler)` → ao detectar popstate:
   - Repor a URL via `history.pushState(null, '', window.location.href)`
   - Definir `guardTriggered = true` (para mostrar o modal)
3. Limpar listeners no cleanup do `useEffect`

**Arquivo:** `components/checklists/checklist-fill-wizard.tsx`

**Modal "Sair do preenchimento?"** (Dialog shadcn/ui):
```
Título:      Sair do preenchimento?
Descrição:   Suas respostas foram salvas automaticamente. Você pode retomar
             este preenchimento quando quiser — basta selecionar o mesmo
             template e estabelecimento no catálogo.

[Ficar na página]       variant outline  → cancelLeave()
[Sair — rascunho salvo] variant default  → confirmLeave() → router.push(backHref)
```

**Critério de aceite:**
- [ ] Pressionar Voltar no browser Android/iOS enquanto preenchendo abre o modal.
- [ ] Clicar "Sair" via modal navega corretamente sem data loss.
- [ ] Fechar aba do browser mostra o aviso nativo do browser.
- [ ] Após aprovar o dossiê, o guard é desativado (não bloqueia navegação).
- [ ] Guard não é ativado em páginas que não são o wizard.

---

### Task C — Interceção de sessão em aberto ao clicar "Usar template"

**Contexto da mudança:**  
A checagem não deve ser apenas para o usuário que criou a sessão — deve abranger **qualquer  
usuário do mesmo cliente/estabelecimento** (ex.: membros da equipe). Se alguém já iniciou  
um rascunho com respostas salvas para aquele template + estabelecimento, qualquer outro  
acesso ao mesmo combo deve ser avisado antes de criar uma sessão duplicada.

**Condição de ativação:** apenas quando houver ao menos **1 resposta salva** em  
`checklist_fill_item_responses`. Rascunhos vazios (sessão criada, zero respostas) são ignorados.

---

#### C.1 — Migration: nova RLS policy de leitura por estabelecimento

A policy atual de SELECT em `checklist_fill_sessions` só permite `user_id = auth.uid()`.  
Para que o owner veja sessões iniciadas por membros da equipe (e vice-versa), adicionar:

**Novo arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_checklist_fill_sessions_select_by_establishment.sql`

```sql
-- Permite leitura de sessões de preenchimento para qualquer usuário que
-- seja owner do cliente dono do estabelecimento (cobre equipe compartilhada).
-- A policy original "checklist_fill_sessions_select_own" permanece e o Supabase
-- combina políticas SELECT com OR — sem remoção da proteção existente.
create policy "checklist_fill_sessions_select_establishment_owner"
  on public.checklist_fill_sessions for select
  to authenticated
  using (
    exists (
      select 1
      from public.establishments est
      join public.clients cl on cl.id = est.client_id
      where
        est.id = checklist_fill_sessions.establishment_id
        and cl.owner_user_id = (select auth.uid())
    )
  );
```

> **Segurança:** O join `establishments → clients → owner_user_id` garante isolamento total  
> por tenant. Um usuário nunca acessa sessões de clientes que não lhe pertencem.  
> A policy original `checklist_fill_sessions_select_own` continua ativa (OR lógico).

---

#### C.2 — Nova server action: `checkExistingOpenFillSession`

**Arquivo:** `lib/actions/checklist-fill.ts` (adicionar ao arquivo existente)

```ts
export type ExistingOpenSession = {
  id: string;
  updated_at: string;
  response_count: number;  // total de respostas salvas nesta sessão
  started_by_me: boolean;  // true se session.user_id === auth.uid()
};

/**
 * Verifica se já existe sessão em aberto (dossier_approved_at IS NULL) para o par
 * estabelecimento + template, com ao menos 1 resposta salva.
 * Escopo: qualquer sessão cujo estabelecimento pertence a um cliente do usuário atual.
 * Retorna a sessão mais recente elegível, ou null se não houver nenhuma.
 */
export async function checkExistingOpenFillSession(input: {
  establishmentId: string;
  templateId: string | null;
  customTemplateId: string | null;
}): Promise<ExistingOpenSession | null>
```

**Lógica obrigatória da implementação:**
1. Autenticar — retornar `null` se não houver sessão de usuário.
2. Validar posse do estabelecimento com `assertEstablishmentOwned` existente — retornar `null`  
   se o usuário não for owner do cliente dono do estabelecimento.
3. Buscar em `checklist_fill_sessions` onde:
   - `establishment_id = input.establishmentId`
   - `(template_id = input.templateId OR custom_template_id = input.customTemplateId)`
   - `dossier_approved_at IS NULL`
   - Ordenar por `updated_at DESC`
4. Para cada sessão encontrada, contar linhas em `checklist_fill_item_responses` WHERE  
   `session_id = session.id`.
5. Retornar a **primeira sessão com `response_count > 0`**.
6. Preencher `started_by_me = (session.user_id === user.id)`.
7. Se nenhuma sessão elegível → retornar `null`.

---

#### C.3 — Mudança no ChecklistCatalog: interceptar "Usar template"

**Arquivo:** `components/checklists/checklist-catalog.tsx`

O botão "Usar template" **não deve mais fazer submit de form diretamente**.  
Converter para fluxo assíncrono no cliente:

```
onClick "Usar template"
  → setCheckingSession(true)
  → chama checkExistingOpenFillSession (server action)
  → setCheckingSession(false)
  → se null       → submete startFillAction via programmatic form submit
  → se não null   → setPendingTemplateId(t.id); setConflictSession(result); abre Dialog
```

**Estados adicionais no componente:**
```ts
const [checkingSession, setCheckingSession] = useState(false);
const [conflictSession, setConflictSession] = useState<ExistingOpenSession | null>(null);
const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
```

**Dialog "Preenchimento em andamento" (shadcn/ui `<Dialog>`):**

```
Ícone:   AlertCircle (text-amber-500) — destaque visual de atenção

Título:  Preenchimento em andamento

Texto:   Já existe um preenchimento em aberto para este template neste
         estabelecimento, com {response_count} resposta(s) salva(s).
         Última alteração: [tempo relativo em pt-BR — ex.: "há 23 minutos"].

         [Se started_by_me = false]:
         "⚠ Este preenchimento foi iniciado por outro membro da equipe."

Botões (em ordem de destaque):
  1. [Ver e continuar preenchimento]   variant default
       → router.push('/checklists/preencher/{conflictSession.id}')
       → fecha dialog

  2. [Cancelar e iniciar novo]         variant outline (com texto em destructive)
       → fecha dialog
       → submete startFillAction com pendingTemplateId + establishmentId

  3. [Fechar]                          variant ghost
       → fecha dialog, não faz nada, usuário permanece no catálogo
```

**Função auxiliar (sem biblioteca externa):**
```ts
function formatRelativeTime(iso: string): string {
  // Calcular diferença em ms → formatar como "há X minutos", "há X horas", "há X dias"
  // Locale pt-BR. Sem Intl.RelativeTimeFormat para compatibilidade iOS < 14.
}
```

**Critério de aceite:**
- [ ] Clicar "Usar template" sem rascunho existente (ou rascunho vazio) → segue normalmente, sem dialog.
- [ ] Clicar "Usar template" com ≥1 resposta salva → dialog aparece com dados corretos.
- [ ] Dialog exibe tempo relativo em pt-BR correto.
- [ ] Dialog exibe aviso de "outro membro da equipe" quando `started_by_me = false`.
- [ ] "Ver e continuar" navega para a sessão existente sem criar nova.
- [ ] "Cancelar e iniciar novo" cria nova sessão (sessão antiga permanece no banco — não deletar).
- [ ] Enquanto `checkingSession = true`, botão "Usar template" exibe spinner e fica disabled.
- [ ] Isolamento de tenant: usuário não vê sessões de clientes alheios.

---

### Task D — Indicador de auto-save no wizard

**Problema:** Usuário não sabe se os dados estão sendo salvos → ansiedade → pressiona Voltar.

**Solução:** Exibir indicador discreto no topo do wizard:
- `saving`: spinner SVG inline + "Salvando…" (`text-muted-foreground text-xs`)
- `saved`: ícone check verde + "Salvo" (`text-green-600 text-xs`) — some após 2 s
- `error`: ícone alerta + "Erro ao salvar — verifique a conexão" (`text-destructive text-xs`)
- `idle`: nada exibido

**Arquivo:** `components/checklists/checklist-fill-wizard.tsx`

```tsx
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
```

**Critério de aceite:**
- [ ] Ao marcar um item, indicador mostra "Salvando…" e depois "✓ Salvo"
- [ ] Indicador visível em mobile (junto ao cabeçalho do wizard, não cobre conteúdo)
- [ ] Indicador desaparece após 2 s no estado "salvo"

---

## 3. Arquivos a Modificar/Criar

| Arquivo | Ação |
|---------|------|
| `components/checklists/checklist-fill-wizard.tsx` | Modificar — Tasks A, B, D |
| `components/checklists/checklist-catalog.tsx` | Modificar — Task C.3 |
| `hooks/use-navigation-guard.ts` | Criar — Task B |
| `lib/actions/checklist-fill.ts` | Modificar — Task C.2 (nova action) |
| `supabase/migrations/YYYY…_checklist_fill_sessions_select_by_establishment.sql` | Criar — Task C.1 |

---

## 4. Plano de Testes

### 4.1 Testes manuais obrigatórios (mobile first)

| Cenário | Passos | Resultado esperado |
|---------|--------|--------------------|
| Back com nota incompleta | Digitar nota → pressionar Voltar antes do blur | Modal guard aparece; ao clicar "Sair" dado está salvo |
| Back com radio marcado | Marcar Conforme → pressionar Voltar imediatamente | Modal guard aparece |
| Fechar aba | Marcar item → fechar aba | Aviso nativo do browser aparece |
| Retomar sessão (mesmo usuário) | Ir ao catálogo → selecionar mesmo template → "Usar template" | Dialog de conflito aparece com tempo relativo correto |
| Retomar sessão (outro usuário / equipe) | Membro da equipe acessa mesmo template/estabelecimento | Dialog mostra "outro membro da equipe" |
| Rascunho vazio | Clicar "Usar template" após sessão criada mas sem respostas | Sem dialog — cria nova sessão normalmente |
| Iniciar novo | Dialog → "Cancelar e iniciar novo" | Nova sessão criada; sessão antiga permanece no banco |
| Continuar | Dialog → "Ver e continuar" | Navega para sessão existente com dados preservados |
| Dossiê aprovado | Aprovar → pressionar Voltar | Sem modal guard (guard inativo) |
| Offline | Desligar rede → marcar item | Indicador mostra "⚠ Erro ao salvar" |

### 4.2 TypeScript & build

```bash
npx tsc --noEmit
```

Zero erros.

### 4.3 Segurança — Auditoria obrigatória

**Executar a skill `nutrigestao-security`** após implementação para auditar:
- Nova RLS policy `checklist_fill_sessions_select_establishment_owner` — validar que o join  
  `establishments → clients → owner_user_id` está correto e não vaza dados entre tenants.
- `checkExistingOpenFillSession` — confirmar que `assertEstablishmentOwned` está na primeira  
  linha (antes de qualquer query de dados).
- `history.pushState` no `useNavigationGuard` — sem vetor de open redirect.
- Debounce save — verificar que `session_id` ownership é revalidado no server action.
- Input de nota/anotação — truncamento em `MAX_CHECKLIST_ITEM_ANNOTATION_CHARS` deve  
  acontecer tanto no client (UX) quanto no server action (segurança).

---

## 5. Restrições e Decisões de Design

1. **Migration necessária (apenas RLS)** — Adicionar policy SELECT de leitura por establishment.  
   Nenhuma alteração de schema (colunas/tabelas).
2. **Sem biblioteca externa** — `useNavigationGuard` com vanilla `addEventListener`.  
   `formatRelativeTime` implementada inline sem `Intl.RelativeTimeFormat` (compatibilidade iOS).
3. **Guard só no wizard** — Não interferir na navegação normal do catálogo.
4. **Mobile back button é prioridade** — `popstate` é o evento correto para Android Chrome  
   e Safari iOS (hardware e software back).
5. **Não bloquear navegação de forma absoluta** — Usuário sempre pode escolher sair.  
   iOS Safari não permite bloqueio incondicional de `beforeunload`.
6. **Sessão antiga não é deletada ao iniciar nova** — Preservar histórico. Futura página  
   de histórico poderá listar sessões antigas.
7. **`started_by_me`** — Campo informativo para transparência; não altera permissões.

---

## 6. Prompt de Implementação (copiar e colar no agente de dev)

```
Você é o desenvolvedor full-stack do projeto NutriGestão SaaS (Next.js 15 + TypeScript strict
+ Supabase + shadcn/ui). Implemente a Story "Proteção de Navegação e Retomada de Sessão de
Checklist". Siga as convenções do projeto: RLS em todo acesso Supabase, TypeScript strict,
sem `any`, Server Actions com "use server".

─── CONTEXTO ───────────────────────────────────────────────────────────────────

Arquivos principais:
- Wizard (client):   components/checklists/checklist-fill-wizard.tsx
- Catálogo (client): components/checklists/checklist-catalog.tsx
- Server actions:    lib/actions/checklist-fill.ts
- Tipos:             lib/types/checklist-fill.ts

Bug: usuário pressionou Voltar no mobile → voltou ao catálogo → selecionou mesmo template →
startChecklistFill criou nova sessão → achou que dados sumiram. Os dados existiam no banco
mas o catálogo não detectava o rascunho em aberto.

─── TASK A — Debounce de 800ms nos campos nota e anotação ──────────────────────

Arquivo: components/checklists/checklist-fill-wizard.tsx

Crie função local useDebouncedCallback(fn, delay) usando useRef + setTimeout (sem lib externa).
Aplicar nos onChange de nota e anotação: persistir 800ms após última keystroke.
O onBlur permanece como flush imediato — não remover.

─── TASK B — Hook useNavigationGuard ────────────────────────────────────────────

Crie hooks/use-navigation-guard.ts:

  export function useNavigationGuard(options: {
    active: boolean;
    onConfirmLeave: () => void;
  }): { guardTriggered: boolean; confirmLeave: () => void; cancelLeave: () => void }

Deve:
1. window.addEventListener('beforeunload', ...) → retornar string não-vazia (aviso nativo)
2. window.addEventListener('popstate', ...) → repor URL via history.pushState + guardTriggered=true
3. Limpar listeners no cleanup do useEffect

No checklist-fill-wizard.tsx, usar o hook (active = !formLocked) e renderizar Dialog shadcn/ui
quando guardTriggered === true:
  Título:  "Sair do preenchimento?"
  Texto:   "Suas respostas foram salvas automaticamente. Você pode retomar quando quiser."
  Botões:  [Ficar na página] outline → cancelLeave()
           [Sair — rascunho salvo] default → confirmLeave() → router.push(backHref)

─── TASK C — Interceção de sessão em aberto ao clicar "Usar template" ───────────

C.1 — Migration RLS
Criar supabase/migrations/YYYYMMDDHHMMSS_checklist_fill_sessions_select_by_establishment.sql:

  create policy "checklist_fill_sessions_select_establishment_owner"
    on public.checklist_fill_sessions for select
    to authenticated
    using (
      exists (
        select 1 from public.establishments est
        join public.clients cl on cl.id = est.client_id
        where est.id = checklist_fill_sessions.establishment_id
          and cl.owner_user_id = (select auth.uid())
      )
    );

C.2 — Server action em lib/actions/checklist-fill.ts:

  export type ExistingOpenSession = {
    id: string;
    updated_at: string;
    response_count: number;
    started_by_me: boolean;
  };

  export async function checkExistingOpenFillSession(input: {
    establishmentId: string;
    templateId: string | null;
    customTemplateId: string | null;
  }): Promise<ExistingOpenSession | null>

  Lógica obrigatória:
  1. Autenticar — null se sem usuário
  2. assertEstablishmentOwned() — null se não for owner
  3. Buscar checklist_fill_sessions WHERE establishment_id, template match, dossier_approved_at IS NULL
  4. Para cada sessão, contar respostas em checklist_fill_item_responses
  5. Retornar a sessão mais recente com response_count > 0, com started_by_me = (user_id === auth.uid())
  6. null se nenhuma elegível

C.3 — Modificar components/checklists/checklist-catalog.tsx:

  Adicionar estados: checkingSession, conflictSession: ExistingOpenSession | null, pendingTemplateId

  Converter botão "Usar template" de form submit para onClick assíncrono:
    → setCheckingSession(true)
    → const existing = await checkExistingOpenFillSession(...)
    → setCheckingSession(false)
    → se null: submeter startFillAction programaticamente
    → se não null: setPendingTemplateId; setConflictSession; abrir Dialog de conflito

  Dialog "Preenchimento em andamento":
    Ícone AlertCircle amber
    Texto: "{response_count} resposta(s) salva(s) · Última alteração: [formatRelativeTime(updated_at)]"
    Se started_by_me = false: "⚠ Iniciado por outro membro da equipe."
    Botões (em ordem):
      [Ver e continuar preenchimento] default → router.push('/checklists/preencher/{id}')
      [Cancelar e iniciar novo]       outline  → submeter startFillAction com pendingTemplateId
      [Fechar]                        ghost    → fecha sem ação

  Implementar formatRelativeTime(iso: string): string sem Intl.RelativeTimeFormat:
    → diferença em ms → "há X minutos" / "há X horas" / "há X dias" / "agora mesmo"

  Enquanto checkingSession = true: botão "Usar template" mostra spinner e fica disabled.

─── TASK D — Indicador de auto-save no wizard ───────────────────────────────────

Arquivo: components/checklists/checklist-fill-wizard.tsx

Estado: saveStatus: 'idle' | 'saving' | 'saved' | 'error'
- Antes de saveFillItemResponse → 'saving'
- Após sucesso → 'saved' → setTimeout 2000ms → 'idle'
- Após erro → 'error'

Renderizar junto ao cabeçalho (abaixo do nome do template):
- saving: spinner SVG + "Salvando…" text-muted-foreground text-xs
- saved:  check verde + "Salvo" text-green-600 text-xs
- error:  alerta + "Erro ao salvar — verifique a conexão" text-destructive text-xs
- idle:   nada

─── TESTES MANUAIS OBRIGATÓRIOS ─────────────────────────────────────────────────

1. Mobile DevTools: pressionar Voltar durante preenchimento → modal guard aparece
2. Marcar item → voltar ao catálogo → selecionar mesmo template → "Usar template" → dialog de conflito aparece
3. Dialog "Ver e continuar" → navega para sessão existente com dados preservados
4. Dialog "Iniciar novo" → nova sessão criada; antiga permanece no banco
5. Rascunho vazio (sem respostas): "Usar template" → sem dialog, cria sessão normalmente
6. Fechar aba → aviso nativo do browser
7. Aprovar dossiê → Voltar → sem modal guard
8. npx tsc --noEmit → zero erros

─── SEGURANÇA — OBRIGATÓRIO APÓS IMPLEMENTAÇÃO ──────────────────────────────────

Executar a skill `nutrigestao-security` para auditar:
1. Nova RLS policy — join establishments→clients→owner_user_id não vaza dados entre tenants
2. checkExistingOpenFillSession — assertEstablishmentOwned é a primeira verificação
3. history.pushState no useNavigationGuard — sem open redirect
4. Debounced save — session ownership revalidado no server action

─── CONVENÇÕES ──────────────────────────────────────────────────────────────────

- TypeScript strict, sem any
- Server actions com "use server" + auth no início
- Client components com "use client"
- shadcn/ui Dialog, Button, Card existentes
- Ícones: lucide-react
- Sem novas dependências npm
```

---

## 7. Checklist de Revisão (pós-implementação)

- [ ] Task A: debounce 800ms em nota e anotação
- [ ] Task B: `useNavigationGuard` criado e integrado no wizard
- [ ] Task B: Dialog "Sair?" funciona no mobile (Android e iOS)
- [ ] Task C.1: Migration RLS criada com policy `checklist_fill_sessions_select_establishment_owner`
- [ ] Task C.2: `checkExistingOpenFillSession` com `assertEstablishmentOwned` como primeira validação
- [ ] Task C.3: Botão "Usar template" interceptado; Dialog de conflito renderiza corretamente
- [ ] Task C.3: `started_by_me = false` exibe aviso de "outro membro da equipe"
- [ ] Task C.3: Rascunho vazio (0 respostas) não dispara dialog
- [ ] Task D: Indicador de auto-save nos 3 estados
- [ ] `npx tsc --noEmit` → zero erros
- [ ] Auditoria de segurança via skill `nutrigestao-security` executada
- [ ] Testado em mobile (Chrome DevTools ou dispositivo físico)
