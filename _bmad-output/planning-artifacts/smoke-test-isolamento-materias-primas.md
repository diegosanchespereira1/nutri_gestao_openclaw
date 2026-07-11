# Smoke test manual — isolamento por cliente/estabelecimento (Ficha Técnica + Matérias-primas)

Checklist do item 8 de `plano-isolamento-cliente-receitas-materias-primas.md`. Rodar
localmente (`npm run dev` + Supabase local) antes de considerar a feature pronta para
produção. Use dois clientes PJ diferentes do mesmo tenant (login único) para os passos
que exigem comparação entre clientes.

## Pré-requisitos

- [ ] `npx supabase start` rodando e migrações aplicadas (`npx supabase db reset` se
      necessário para pegar `20260830160000_professional_raw_materials_client_scope.sql`).
- [ ] Dois clientes PJ cadastrados no mesmo login (ex.: "Cliente 1" e "Cliente 2"), cada
      um com pelo menos um estabelecimento.
- [ ] `npm run test:rls` verde (testes automatizados de RLS — pré-requisito: `.env.test`
      configurado com as credenciais do Supabase local). Cobre a parte de banco/RLS deste
      checklist; os passos abaixo cobrem a parte de UI que RLS sozinho não valida (o
      isolamento cliente-a-cliente dentro do mesmo tenant é aplicado na camada de
      aplicação, não na policy — ver comentário no novo describe block de
      `tests/rls/isolation.test.ts`).

## 1. Criar matéria-prima por estabelecimento

- [ ] Em `/materias-primas/nova`, selecionar "Estabelecimento" e escolher um estabelecimento
      do Cliente 1.
- [ ] Salvar. Confirmar que a listagem `/materias-primas` mostra o item com o selo do
      estabelecimento (não "Padrão do cliente").
- [ ] Editar o item e confirmar que o campo de escopo aparece travado/somente leitura
      (regra "não é permitido alterar o âmbito depois de definido").

## 2. Criar matéria-prima por repositório do cliente

- [ ] Em `/materias-primas/nova`, selecionar "Usar em todos os estabelecimentos deste
      cliente" e escolher o Cliente 1.
- [ ] Salvar. Confirmar selo "Padrão do cliente" na listagem.
- [ ] Confirmar que o texto de apoio do formulário diz explicitamente "nunca em outros
      clientes" (fix do bug do "Repositório" — antes caía silenciosamente no primeiro
      cliente PJ da lista).

## 3. Confirmar que outro cliente não enxerga o item

- [ ] Abrir `/ficha-tecnica/nova` (ou editar uma receita existente) associada a um
      estabelecimento do **Cliente 2**.
- [ ] No seletor de ingredientes, confirmar que **nenhum** dos dois itens criados nos
      passos 1 e 2 (ambos do Cliente 1) aparece na lista.
- [ ] Trocar o cliente/estabelecimento da receita de volta para o Cliente 1 e confirmar
      que os dois itens voltam a aparecer (o seletor recarrega reativamente — task #84).
- [ ] Repetir o mesmo teste na tela de filtro de `/materias-primas` e `/ficha-tecnica`
      (filtro por cliente/estabelecimento): filtrar pelo Cliente 2 não deve listar os
      itens do Cliente 1.

## 4. Reatribuição de item legado via planilha de preços

- [ ] Ter pelo menos uma matéria-prima **legada** (criada antes desta migração, sem
      cliente definido — aparece com o selo "Sem cliente definido").
- [ ] Ir em `/importar/materias-primas/atualizar-precos`, baixar a planilha.
- [ ] Confirmar que a coluna Cliente vem **em branco** para o item legado e **preenchida**
      para os itens já escopados (passos 1 e 2).
- [ ] Preencher a coluna Cliente do item legado com "Cliente 2" e reenviar.
- [ ] Confirmar que o item passa a aparecer no seletor de ingredientes de uma receita do
      Cliente 2 e **deixa de aparecer** para o Cliente 1.
- [ ] Tentar reenviar a mesma planilha trocando o Cliente de um item **já escopado**
      (passo 1 ou 2) para um cliente diferente — confirmar que a linha é **rejeitada**
      (regra: a planilha nunca move item já escopado entre clientes, só faz a primeira
      atribuição de itens legados).

## 5. Upload em massa (criação) com cliente obrigatório

- [ ] Em `/importar/materias-primas`, baixar o template e confirmar que a coluna Cliente
      é obrigatória e Estabelecimento é opcional (vazio = repositório do cliente).
- [ ] Subir uma planilha com dois itens de mesmo nome em clientes diferentes — confirmar
      que **não** é bloqueado como duplicado (duplicidade agora é escopada por cliente,
      não mais tenant inteiro).

---

Se todos os itens acima passarem, a Fase 3 do plano está validada e a Fase 4
(migração de fechamento — `client_id NOT NULL`) pode ser avaliada assim que a
auditoria (`scripts/database/audit-raw-materials-cross-client.sql`) mostrar zero
itens legados restantes.
