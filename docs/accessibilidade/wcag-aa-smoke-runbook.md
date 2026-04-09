# Runbook Rápido - Smoke WCAG AA (10-15 min)

## Pré-condições

- App rodando em `http://localhost:3000`
- Sessão de teste disponível (para rotas protegidas)
- Chrome aberto com DevTools

## Ferramentas

- Teclado (Tab, Shift+Tab, Enter, Space, Esc)
- DevTools:
  - Lighthouse (Acessibilidade)
  - Inspector para contraste

## Passo 1 - Login (`/login`)

1. Abrir `/login`.
2. Pressionar `Tab` continuamente e verificar:
   - foco visível em todos os controles;
   - ordem lógica (email -> senha -> entrar -> links).
3. Pressionar `Enter` no botão `Entrar` (sem preencher) e validar mensagem de erro legível.
4. Verificar contraste visual dos textos principais e botão primário.

Resultado esperado: sem perda de foco, sem elementos inacessíveis por teclado.

## Passo 2 - Recuperação (`/forgot-password`)

1. Abrir `/forgot-password`.
2. Verificar label no campo email.
3. Navegar só por teclado e submeter.
4. Confirmar mensagem de retorno clara (status/erro) e legível.

Resultado esperado: fluxo completo sem mouse.

## Passo 3 - Início (`/inicio`)

1. Com sessão ativa, abrir `/inicio`.
2. Pressionar `Tab` no início da página e acionar skip link.
3. Confirmar que o foco vai para `#conteudo-principal`.
4. Navegar por atalhos/cards com teclado e validar foco visível.

Resultado esperado: skip link funcional e sem trap de foco.

## Passo 4 - Pacientes (`/pacientes`)

1. Abrir `/pacientes`.
2. Navegar por teclado no formulário de filtros.
3. Validar rótulos e acionamento por Enter no botão `Filtrar`.
4. Tabular até lista e abrir um item por teclado.

Resultado esperado: formulário e lista acessíveis por teclado.

## Passo 5 - Visitas (`/visitas`)

1. Abrir `/visitas`.
2. Confirmar navegação por teclado nas ações principais da agenda.
3. Se houver modal/drawer, validar:
   - foco entra no modal;
   - `Esc` fecha;
   - foco retorna ao gatilho.

Resultado esperado: sem perda de foco e sem bloqueio de navegação.

## Passo 6 - Preferências (`/configuracoes/notificacoes`)

1. Abrir rota e validar redirecionamento correto quando sem sessão (`/login`).
2. Com sessão ativa, navegar por teclado nas preferências.
3. Forçar estado de erro (quando possível) e validar anúncio de erro.
4. Validar loading com feedback não silencioso.

Resultado esperado: feedback dinâmico perceptível e fluxo navegável por teclado.

## Passo 7 - Exclusão de Conta (`/configuracoes/deletar-conta`)

1. Abrir rota.
2. Navegar por teclado até `Solicitar Exclusão`.
3. Abrir modal e validar:
   - foco inicial no modal;
   - tab cycle preso no modal;
   - `Esc` fecha;
   - foco retorna ao botão de abertura.
4. Simular erro e confirmar mensagem acessível.

Resultado esperado: modal com gerenciamento de foco correto.

## Passo 8 - Responsividade (375px)

Para cada rota crítica:

1. DevTools -> Toggle Device -> largura 375.
2. Verificar:
   - sem conteúdo sobreposto;
   - sem corte de CTA principal;
   - texto legível;
   - controles acionáveis por toque (alvo adequado).

Resultado esperado: uso funcional em mobile sem quebra crítica.

## Passo 9 - Critério de Aprovação

- Aprovar release: nenhum `BLOQ`.
- Reprovar release: >= 1 `BLOQ`.

Classificação:

- `BLOQ`: teclado/foco/semântica crítica/contraste ilegível.
- `NB`: ajuste visual sem impacto funcional.

## Template de Registro Rápido

| Página | Resultado | Problemas | Evidência | Responsável | Data |
|---|---|---|---|---|---|
| `/login` | PASS/FAIL | BLOQ/NB | print/link | nome | YYYY-MM-DD |

