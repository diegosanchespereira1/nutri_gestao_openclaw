# Estrutura do repositório NutriGestão

Este documento descreve o layout intencional do projeto e o que **não** deve ser movido sem revisão completa de tooling.

## Aplicação Next.js + Capacitor

| Caminho | Descrição |
|---------|-----------|
| `app/` | App Router (rotas, layouts, API routes) |
| `components/` | Componentes React por domínio + `components/ui/` (shadcn) |
| `lib/` | Lógica, server actions (`lib/actions/`), Supabase, utilitários. Domínio **clientes**: helpers em `lib/clientes/` (logo, enriquecimento de lista, normalização de linha). |
| `hooks/` | React hooks partilhados |
| `public/` | Ficheiros estáticos servidos pelo Next (inclui `public/fonts/` referenciados em código) |
| `supabase/` | Migrações, `config.toml`, seeds |
| `tests/` | Testes RLS e integração (`tests/rls/`) |
| `scripts/` | Scripts auxiliares (base de dados, PDF, mobile) |

### Convenções em `lib/` e `components/`

- `lib/actions/` — Server Actions (Next.js `"use server"`).
- `lib/types/` — Tipos TypeScript partilhados entre domínios.
- `lib/<domínio>/` — Lógica pura do domínio (ex.: `lib/clientes/`, `lib/checklists/`).
- `components/<domínio>/` — UI alinhada ao mesmo domínio (ex.: `components/clientes/`).
- Testes unitários co-localizados: `lib/**/*.test.ts` (configurado em `vitest.config.ts`).

Alias TypeScript: `@/*` → raiz do repositório (`tsconfig.json`). Não alterar sem atualizar Vitest, ESLint e imports em massa.

## Mobile (Capacitor)

| Caminho | Descrição |
|---------|-----------|
| `android/`, `ios/` | Projetos nativos geridos pelo Capacitor CLI. **Android:** não fixar `org.gradle.java.home` a um path do macOS — o CI usa `JAVA_HOME` (Temurin 21). No Mac com Java 25+, exportar `JAVA_HOME="$(/usr/libexec/java_home -v 21)"` antes do Gradle. |
| `assets/` | Ícones e splash para `capacitor-assets` |
| `capacitor.config.ts` | Configuração do shell WebView |
| `scripts/mobile/` | Scripts Node para validação e dev no dispositivo |

## O que não mover sem plano dedicado

1. **`app/`, `components/`, `lib/` para `src/`** — quebra centenas de imports `@/` e o layout Docker standalone.
2. **`_bmad/`** — skills BMad referenciam `{project-root}/_bmad/...`.
3. **`_bmad-output/`** — skills NutriGestão (`.claude/skills/`) referenciam artefatos de sprint e stories aqui.
4. **`android/`, `ios/`**, ficheiros Gradle/Xcode referenciados em CI (`.github/workflows/`).
5. **`public/fonts/`** — caminhos hardcoded em geração de PDF (ex. `lib/pdf/dossier-pdf.ts`).

## Scripts SQL de referência

Ficheiros grandes de schema/dados para importação manual ou homologação:

- `scripts/database/schema.sql`
- `scripts/database/data.sql`
- `scripts/database/roles.sql`

Comentários operacionais: `scripts/supabase-selfhost-wipe-for-reimport.sql`, `scripts/homolog-cloud-dump-auth-compat.sql`.

## Documentação de produto

- Índice geral: [docs/README.md](../README.md)
- Deploy e produção: [docs/deployment/](../deployment/)
- Segurança: [docs/security/](../security/)
