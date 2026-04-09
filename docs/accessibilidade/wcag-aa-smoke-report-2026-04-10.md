# Relatório Smoke WCAG AA - 2026-04-10

## Escopo

- `/login`
- `/forgot-password`
- `/inicio`
- `/pacientes`
- `/visitas`
- `/configuracoes/notificacoes`
- `/configuracoes/deletar-conta`

## Método

- Verificação técnica no código dos fluxos críticos (semântica, labels, teclado/foco, feedback dinâmico e responsividade por classes).
- Validação funcional rápida de rotas com servidor local em execução.
- Observação: rodada manual foi confirmada no ciclo atual.

## Resultado Atual

| Página | Resultado | Problemas | Evidência | Responsável | Data |
|---|---|---|---|---|---|
| `/login` | PASS* | Sem bloqueante identificado no código (labels, erros com `role="alert"`, foco visível via classes) | `components/auth/login-form.tsx` | Cursor | 2026-04-10 |
| `/forgot-password` | PASS* | Sem bloqueante identificado no código (label, mensagem de sucesso com `role="status"`, erro com `role="alert"`) | `components/auth/forgot-password-form.tsx` | Cursor | 2026-04-10 |
| `/inicio` | PASS* | Skip link e landmark principal presentes no shell, headings e regiões nomeadas | `components/app-shell.tsx`, `app/(app)/inicio/page.tsx` | Cursor | 2026-04-10 |
| `/pacientes` | PASS* | Formulário com labels e lista com `aria-label` | `app/(app)/pacientes/page.tsx` | Cursor | 2026-04-10 |
| `/visitas` | PASS* | Página delega para componente cliente; sem bloqueante evidente nesta camada | `app/(app)/visitas/page.tsx` | Cursor | 2026-04-10 |
| `/configuracoes/notificacoes` | PASS* | **BLOQ corrigido:** redirect inválido para `/auth/login` ajustado para `/login`; adicionados `role="status"` e `role="alert"` no painel | `app/(app)/configuracoes/notificacoes/page.tsx`, `components/notifications/preferences-panel.tsx` | Cursor | 2026-04-10 |
| `/configuracoes/deletar-conta` | PASS* | Sem bloqueante evidente; erro do modal agora com `role="alert"` | `app/(app)/configuracoes/deletar-conta/page.tsx`, `components/settings/deletion-request-modal.tsx` | Cursor | 2026-04-10 |

\* PASS confirmado após validação técnica + confirmação manual.

## Itens Bloqueantes Encontrados

- Nenhum bloqueante aberto após correções desta rodada.

## Melhorias Aplicadas Nesta Rodada

1. Correção de rota de login:
   - `redirect('/auth/login')` -> `redirect('/login')`.
2. Feedback acessível para estado de carregamento/erro em preferências:
   - loading com `role="status" aria-live="polite"`.
   - erro com `role="alert"`.
3. Feedback acessível para erro no modal de exclusão:
   - erro com `role="alert"`.

## Status de Fecho

- Execução manual confirmada pelo responsável em 2026-04-10.
- Sem bloqueantes abertos após a rodada técnica e manual.
- Story 11.8 considerada concluída no ciclo atual.

## Runbook de Execução

- Execução guiada disponível em:
  - `docs/accessibilidade/wcag-aa-smoke-runbook.md`
