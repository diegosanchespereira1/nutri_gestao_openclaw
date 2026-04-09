# WCAG AA Smoke Checklist (Release Gate)

## Objetivo

Checklist rápido para validar acessibilidade nos fluxos críticos antes de release, alinhado a WCAG 2.1 AA, UX-DR14/15 e NFR28-32.

## Escopo de Páginas

- `/login`
- `/forgot-password`
- `/inicio`
- `/pacientes`
- `/visitas`
- `/configuracoes/notificacoes`
- `/configuracoes/deletar-conta`

## Ambiente de Teste

- Desktop: 1280x800 (Chrome atual)
- Mobile: 375x812 (emulação)
- Navegação por teclado: Tab, Shift+Tab, Enter, Space, Esc
- SO com e sem `prefers-reduced-motion`

## Checklist por Página

Para cada rota no escopo, validar:

1. Semântica e nomes acessíveis
   - Título principal com heading claro.
   - Inputs com `label` associado.
   - Botões e links com nome acessível compreensível.

2. Teclado e foco
   - Ordem de Tab lógica.
   - Foco visível em todos os elementos interativos.
   - Ações principais funcionam via teclado.
   - Em modal: foco entra no modal, fica preso nele e retorna ao gatilho ao fechar.

3. Contraste e feedback
   - Texto principal >= 4.5:1.
   - Elementos de UI/ícones essenciais >= 3:1.
   - Erros e estados não dependem apenas de cor.

4. Responsivo
   - Layout funcional em 375px sem quebra crítica.
   - Conteúdo sem overlap em 1280px.
   - Inputs em mobile com tamanho legível (>= 16px quando aplicável).

5. Comportamentos globais
   - Skip link disponível na área logada e funcional.
   - Regiões dinâmicas críticas usam anúncio apropriado (`aria-live`) quando necessário.
   - Animações respeitam `prefers-reduced-motion`.

## Severidade

- **Bloqueante (release block):**
  - Não navegável por teclado.
  - Foco invisível ou perdido em fluxo crítico.
  - Sem nome acessível em ação crítica (submit, confirmar, salvar, excluir).
  - Contraste ilegível em conteúdo principal.
- **Não bloqueante:**
  - Ajustes cosméticos sem perda funcional.
  - Pequenas inconsistências de espaçamento/responsivo sem impacto de leitura/interação.

## Modelo de Registro

Preencher para cada página:

| Página | Resultado | Problemas | Evidência | Responsável | Data |
|---|---|---|---|---|---|
| `/login` | PASS/FAIL | texto curto | link/arquivo | nome | YYYY-MM-DD |

Sugestão para problemas:

- `BLOQ:` para bloqueante
- `NB:` para não bloqueante

## Critério de Aprovação Final

- Aprova release: nenhum item bloqueante aberto nos fluxos críticos.
- Reprova release: 1 ou mais itens bloqueantes.
