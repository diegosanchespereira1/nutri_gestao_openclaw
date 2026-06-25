# Cobertura de testes unitários (lib testável)

## Meta

**≥85% de linhas** no escopo testável de `lib/`, medido com Vitest + `@vitest/coverage-v8`.

## Comandos

```bash
npm run test              # testes sem relatório
npm run test:coverage     # testes + relatório (texto + HTML)
npm run test:coverage:watch
```

Relatório HTML: `coverage/index.html` (pasta ignorada pelo git).

## Scope (denominador)

Incluído: `lib/**/*.ts`

Excluído:

- `lib/**/*.test.ts`
- `lib/actions/**` — server actions + Supabase
- `lib/supabase/**`
- `lib/server/**`
- `lib/nutrition/child/reference-data/**` — tabelas WHO estáticas
- `lib/types/**` — só tipos
- `lib/constants/**` — constantes estáticas

## CI

O workflow `.github/workflows/ci.yml` publica o artefacto `coverage-report` após `npm run test:coverage`. **Não bloqueia PRs** por threshold (fase informativa).

Excluído adicionalmente (I/O e integrações):

- `lib/env/**`, `lib/email/**`, `lib/client/**`, `lib/mobile/**`, `lib/profile/**`, `lib/tenant/**`, `lib/security/**`
- Sync de ficheiros (`*-sync.ts`, `photo-sync.ts`, `logo-sync.ts`, etc.)
- PDFs de integração pesada (`build-approved-dossier-pdf.ts`, `technical-recipe-pdf-export.ts`)
- Storage/checklist loaders com Supabase (`workspace-template-persist`, `load-page-data`, etc.)
- Navegação browser, cookies Next.js, DOM e loaders Supabase pontuais (`app-build-navigate.ts`, `navigation-pending.ts`, `profile-context-cookie.ts`, `download-csv.ts`, `workspace.ts`, etc. — ver `vitest.config.ts`)
- Ficheiros `.bak.ts`

## Baseline

| Data | Linhas (scope) | Cobertura |
|------|----------------|-----------|
| Jun/2026 (início do plano) | ~9.500 (scope amplo) | ~13% |
| Jun/2026 (após Fase 0, scope testável inicial) | ~7.000 | ~49% |
| Jun/2026 (conclusão) | **6.094** | **86,4%** |

Comando de verificação: `npm run test:coverage` → linha `All files` no output (meta **≥85%** atingida).

## Convenções

- Co-localizar `foo.test.ts` junto de `foo.ts`
- Vitest puro; evitar mock de Supabase nos unitários
- Testes RLS: `npm run test:rls` (scope separado)
