# Tooling de agentes (Cursor / Claude / BMad)

Este repositório usa várias pastas para **skills** e planeamento. Não confundir com código da aplicação Next.js.

## Fonte canónica das skills BMad

- **Cursor:** [`.cursor/skills/`](../.cursor/skills/) — espelho completo das skills BMad usadas no IDE.
- **Removido:** `.github/skills/` era duplicata idêntica; os workflows em `.github/workflows/` não referenciam essa pasta.

Para workflows BMad e dados partilhados, as skills apontam para **`_bmad/`** na raiz (ex.: `_bmad/bmm/config.yaml`). **Não mover `_bmad/`** sem atualizar todas as referências `{project-root}/_bmad/...` nas skills.

## NutriGestão (Claude Code / skills do produto)

- [`.claude/skills/`](../.claude/skills/) — skills `nutrigestao-*` e boas práticas Supabase.
- Ficheiros `.skill` na raiz foram consolidados aqui (`nutrigestao-dev.skill`, etc.).

## Planeamento e sprint

- **`_bmad-output/`** na raiz — PRD, epics, stories, `sprint-status.yaml`. As skills `nutrigestao-sprint` e `nutrigestao-review` leem caminhos relativos a esta pasta.

## Outros

- **`agents/`** — documentação de agentes (ex. devops) com links para `_bmad-output/`.
- **`.agents/skills/`** — skills adicionais (ex. postgres best practices), separadas do BMad.

## CI/CD

A pasta `.github/` contém apenas **workflows** e configuração (Dependabot, etc.). Não há dependência de skills em `.github/skills/`.
