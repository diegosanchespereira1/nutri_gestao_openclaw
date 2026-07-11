# Plano: isolamento por cliente/estabelecimento — Ficha Técnica e Matérias-primas

## Estado

Planejamento — não implementado.

## Contexto

Hoje `technical_recipes` já tem `client_id` (obrigatório), `establishment_id` (opcional) e
`contexto` (`ESTABELECIMENTO` | `REPOSITORIO`), mas isso não é usado de ponta a ponta:

- A listagem (`loadTechnicalRecipesForOwner`) não filtra por cliente — mostra receitas de
  todos os clientes juntas.
- `recipe-form.tsx`, quando o usuário escolhe "Repositório" (`recipeScope = "org"`), **não
  mostra seletor de cliente** — o código escolhe `pjClients[0]?.id` silenciosamente. Um
  comentário no código também afirma (errado) que a receita fica "acessível a todo o tenant";
  na prática ela fica presa ao `client_id` escolhido às cegas.
- O seletor de ingredientes dentro da receita carrega `professional_raw_materials` **sem
  nenhum filtro** — todas as matérias-primas do tenant aparecem em qualquer receita.
- `professional_raw_materials` **não tem `client_id` nem `establishment_id`** — é uma lista
  única por tenant, sem nenhuma separação por cliente.

Decisões já confirmadas com o usuário:

1. Matéria-prima recebe o mesmo modelo de receita: `client_id` obrigatório +
   `establishment_id` opcional + `contexto` (ESTABELECIMENTO/REPOSITORIO), controlado pela
   mesma flag conceitual "usar em todos os estabelecimentos" (repositório do cliente).
2. Migração dos itens já cadastrados (hoje sem cliente) é feita reaproveitando o wizard de
   atualização de preços em massa — adicionando uma coluna "Cliente" (e "Estabelecimento")
   nele, em vez de criar uma tela nova.

### Invariante inegociável: "todos os estabelecimentos" = todos os estabelecimentos **do
mesmo cliente**

A flag "Usar em todos os estabelecimentos" nunca significa todo o tenant — significa **todos
os estabelecimentos daquele cliente específico**, e nada além disso. `contexto = REPOSITORIO`
sempre carrega um `client_id` fixo; o item (receita ou matéria-prima) fica visível/selecionável
apenas nos estabelecimentos vinculados a esse mesmo `client_id`. Em nenhuma hipótese um item em
modo repositório de um cliente aparece, é editável, ou é selecionável a partir de outro cliente
do mesmo tenant — mesmo que os dois pertençam ao mesmo profissional/tenant. Essa regra é
transversal a todo o plano (schema, RLS, loaders, filtros de UI, upload em massa) e deve ser
verificada explicitamente na fase de testes (item 8) e no smoke test manual.

## Risco principal a resolver antes de codar

Como `professional_raw_materials` nunca teve dono por cliente, é possível que uma mesma
matéria-prima esteja hoje ligada (via `technical_recipe_lines`) a receitas de **clientes
diferentes**. Depois da mudança, uma matéria-prima só pode pertencer a um cliente — então
esses casos precisam virar cópias (uma por cliente) com as linhas de receita repontadas para
a cópia certa. Isso só pode ser decidido com dados reais do banco, por isso vira a primeira
tarefa (auditoria), antes de qualquer migração.

## Desenho da solução

### 1. Modelo de dados — `professional_raw_materials`

Nova migração, no mesmo padrão de `20260523140000_technical_recipes_client_scope.sql`:

- `client_id uuid null references clients(id)` — **nullable no início** (fase de transição;
  vira `not null` numa migração de follow-up só depois que a auditoria + reatribuição em
  massa confirmarem zero linhas com `client_id` nulo).
- `establishment_id uuid null references establishments(id)`.
- `contexto` reaproveitando o enum já existente (`ESTABELECIMENTO` / `REPOSITORIO`), com o
  mesmo `CHECK` que liga `contexto` à nulidade de `establishment_id`.
- Trigger espelhando `technical_recipes_set_client_from_establishment()`: quando
  `establishment_id` é definido, `client_id` é derivado automaticamente dele (evita
  inconsistência entre os dois campos).
- Índice único atual `(owner_user_id, lower(btrim(name)))` vira dois índices únicos parciais
  (mesmo padrão dos índices de `technical_recipes`): um para `contexto = 'REPOSITORIO'`
  (único por `client_id` + nome) e outro para `contexto = 'ESTABELECIMENTO'` (único por
  `establishment_id` + nome). Isso permite duas matérias-primas com o mesmo nome em clientes
  diferentes — coisa que hoje é proibida sem necessidade.
- RLS reescrita espelhando a de `technical_recipes` (acesso via `clients.owner_user_id =
  auth.uid()`, com o caminho extra por `establishments` quando `establishment_id` não é nulo).
- **Durante a transição** (enquanto existem linhas com `client_id` nulo): RLS e as telas
  tratam `client_id IS NULL` como "visível em todo o tenant, como é hoje" — isto é, nenhuma
  regressão no dia 1. A UI sinaliza esses itens ("Sem cliente definido") com um aviso e um
  atalho para a planilha de reatribuição.

### 2. Fluxo de reatribuição (migração de dados, sem tela nova)

Reaproveita `app/(app)/importar/materias-primas/atualizar-precos/page.tsx` +
`RawMaterialPriceImportWizard` + `importRawMaterialPricesAction`:

- A planilha baixada ganha as colunas **Cliente** e **Estabelecimento** (nome, não ID —
  resolvido no parser, mesmo padrão de outros imports do projeto que resolvem nome→ID).
  "Estabelecimento" vazio = repositório do cliente (`contexto = REPOSITORIO`).
- Para itens que já têm `client_id`: a coluna Cliente/Estabelecimento é só validação — se a
  planilha vier com um cliente diferente do já cadastrado, a linha é **rejeitada** (mover
  matéria-prima entre clientes não é o propósito deste fluxo; evita mudança acidental).
- Para itens com `client_id` nulo (legado): a coluna Cliente é **obrigatória** e a primeira
  gravação define o cliente definitivo daquele item.
- Para os casos identificados na auditoria (matéria-prima usada por receitas de mais de um
  cliente): a planilha de reatribuição já vem com uma sugestão pré-preenchida baseada no
  cliente mais frequente entre as receitas que usam aquele item, e o relatório da auditoria
  lista os demais clientes afetados, para o usuário decidir se duplica o item.

### 3. Seletor de ingredientes por escopo (`recipe-form.tsx`)

Novo loader (`loadRawMaterialsForScope({ clientId, establishmentId })`) substitui a chamada
atual, sem filtro, a `loadRawMaterialsForOwner()`:

- Receita de estabelecimento → matérias-primas com `establishment_id` igual **ou**
  `contexto = REPOSITORIO` do mesmo `client_id` (herda os itens "padrão do cliente").
- Receita de repositório (`org`) → só matérias-primas com `contexto = REPOSITORIO` do mesmo
  cliente (não faz sentido puxar item de um estabelecimento específico para um template).
- Como cliente/estabelecimento podem mudar interativamente no formulário antes de salvar, a
  lista de ingredientes precisa recarregar quando o usuário troca a seleção — vira uma Server
  Action chamável do client component, não só um loader de carga inicial da página.

### 4. Corrigir o bug do "Repositório" em `recipe-form.tsx`

Quando `recipeScope === "org"`, mostrar um `<select>` de cliente explícito (hoje não existe —
cai silenciosamente em `pjClients[0]`). Corrigir o texto que hoje afirma acesso "a todo o
tenant" — isso está errado e é exatamente o tipo de ambiguidade que a invariante acima proíbe.
Label da flag consolidada como "Usar em todos os estabelecimentos deste cliente" (nunca só
"...os estabelecimentos", para não sugerir tenant inteiro), igual nos dois formulários (receita
e matéria-prima), com texto de apoio reforçando: "Fica disponível em todos os estabelecimentos
de [Nome do Cliente] — nunca em outros clientes."

### 5. Filtro por cliente — Ficha Técnica

- `recipe-list-filters.tsx` ganha um combobox de cliente (reaproveitando o padrão de
  `financial-charge-client-picker.tsx`), com filtro adicional de estabelecimento em cascata
  quando o cliente selecionado tiver mais de um.
- `loadTechnicalRecipesForOwner()` ganha parâmetros `clientId`/`establishmentId` opcionais,
  aplicados via `.eq(...)`.
- Estado do filtro na URL (`?cliente=...&estabelecimento=...`), mesmo padrão já usado para
  `filtro=favoritos|templates`.

### 6. Filtro por cliente — Matérias-primas

Mesmo combobox de cliente/estabelecimento na listagem `/materias-primas`, com um selo por
linha indicando "Padrão do cliente" vs. o nome do estabelecimento específico, e um selo
"Sem cliente definido" (com link para a planilha de reatribuição) enquanto durar a transição.

`raw-material-form.tsx` (criar/editar) ganha o mesmo bloco "Onde fica esta matéria-prima?"
(estabelecimento vs. repositório do cliente) já usado em `recipe-form.tsx`, com cópia
idêntica para consistência.

### 7. Upload em massa (criação) com cliente obrigatório

`raw-material-import-parser.ts` / template de criação / `import-raw-materials.ts`:

- Template ganha colunas **Cliente** (obrigatória) e **Estabelecimento** (opcional).
- Parser resolve nome de cliente/estabelecimento → IDs (rejeita linha se não encontrar
  correspondência exata, mesmo padrão de erro já usado nas outras colunas).
- Detecção de duplicidade por nome passa a ser escopada por
  `(client_id[, establishment_id])`, não mais tenant inteiro — dois clientes podem ter
  "Arroz branco" sem conflito.

### 8. Testes e verificação

- RLS: novos testes em `tests/rls/` para `professional_raw_materials` (cliente A não
  enxerga/edita matéria-prima do cliente B), espelhando os testes já existentes de
  `technical_recipes` caso existam.
- `tsc --noEmit` (checagem já padrão neste projeto) depois de cada bloco de mudança.
- Smoke test manual: criar matéria-prima por estabelecimento, criar por repositório do
  cliente, confirmar que a lista de ingredientes de uma receita de outro cliente não mostra
  esse item, rodar a planilha de reatribuição num item legado e confirmar que ele passa a
  respeitar o filtro.

## Faseamento (para não gerar falhas em produção)

1. **Fase 1 — Schema**: migração aditiva (colunas nullable, trigger, RLS com fallback para
   `client_id IS NULL`, índices únicos novos). Nenhuma regressão: tudo que funciona hoje
   continua funcionando, só passa a existir a possibilidade de escopar.
2. **Fase 2 — Auditoria**: script/relatório somente leitura listando matérias-primas usadas
   por receitas de mais de um cliente — define o tamanho real do problema de duplicação antes
   de liberar a reatribuição em massa para o usuário.
3. **Fase 3 — UI e fluxos**: filtros de cliente (Ficha Técnica e Matérias-primas), correção do
   bug do Repositório, seletor de ingredientes escopado, upload em massa com coluna Cliente,
   planilha de reatribuição estendida.
4. **Fase 4 — Fechamento**: depois que o usuário reatribuir os itens legados (sem prazo
   forçado pelo sistema, mas com aviso visível), migração de follow-up torna `client_id`
   `NOT NULL`, remove o fallback de RLS/UI e remove o selo "Sem cliente definido".

## Fora de escopo deste plano

- Mover uma matéria-prima já escopada de um cliente para outro (feature separada, se for
  necessária no futuro).
- Qualquer mudança em pacientes/avaliações — este plano cobre só ficha técnica e
  matérias-primas.
