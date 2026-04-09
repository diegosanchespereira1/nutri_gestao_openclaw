# Story 11.8: Smoke de Acessibilidade WCAG AA

## Contexto

As stories anteriores cobriram fluxos críticos de autenticação, área logada, pacientes, visitas, financeiro e compliance LGPD. Esta story foca em **gate de release**: verificar rapidamente requisitos essenciais de acessibilidade (UX-DR14, UX-DR15, NFR28–32) antes de publicar.

O objetivo não é uma auditoria completa; é um **smoke test repetível** para detectar regressões graves de acessibilidade.

## Objetivo

Após a story 11.8, a equipe será capaz de:

- Executar checklist único de acessibilidade WCAG AA nos fluxos críticos.
- Registrar resultado por fluxo (pass/fail/evidência).
- Bloquear release quando houver falha crítica (teclado, foco, contraste, semântica).

## Requisitos Funcionais

- Validar **NFR28** (WCAG 2.1 AA) nos fluxos principais.
- Validar **NFR29** (contraste mínimo 4.5:1 para texto e 3:1 para UI).
- Validar **NFR30** (navegação por teclado).
- Validar **NFR31** (funcionamento entre 375px e 1920px).
- Validar **NFR32** (texto legível, tamanho base >= 16px em formulários mobile).
- Validar **UX-DR14** (responsividade mobile-first).
- Validar **UX-DR15** (skip link, foco em modais, aria-live quando aplicável, respeito a reduced motion).

## Critérios de Aceitação

### 1. Checklist unificado disponível

**Given** a equipe prepara um release  
**When** precisar validar acessibilidade  
**Then** existe checklist versionado em repositório com:

- Escopo de páginas críticas.
- Procedimento de execução manual.
- Critérios de aprovação/reprovação.
- Campo para evidências e observações.

### 2. Cobertura mínima de fluxos críticos

**Given** o smoke test é executado  
**When** o relatório é preenchido  
**Then** cobre no mínimo:

- Login (`/login`)
- Recuperação de acesso (`/forgot-password`)
- Início (`/inicio`)
- Pacientes (`/pacientes`)
- Visitas (`/visitas`)
- Configurações de notificações (`/configuracoes/notificacoes`)
- Exclusão de conta (`/configuracoes/deletar-conta`)

### 3. Critérios de bloqueio de release

**Given** o checklist foi executado  
**When** existir falha crítica  
**Then** release é bloqueado até correção.

Falhas críticas:

- Navegação por teclado quebrada (Tab/Shift+Tab/Enter/Esc).
- Foco invisível ou preso em modal.
- Botão/campo sem nome acessível.
- Contraste abaixo de AA em texto primário.

### 4. Evidência rastreável

**Given** execução concluída  
**When** status for registrado  
**Then** cada fluxo contém:

- Resultado (Pass/Fail).
- Data e responsável.
- Evidência mínima (descrição, screenshot ou vídeo curto).
- Lista de issues abertas quando houver falhas.

## Tarefas de Implementação

- [x] Criar checklist em `docs/accessibilidade/wcag-aa-smoke-checklist.md`.
- [x] Definir matriz de fluxos críticos com validações por teclado, foco, contraste e responsividade.
- [x] Definir critérios de severidade (bloqueante vs não bloqueante).
- [x] Definir template de evidência para execução recorrente.
- [x] Executar checklist no ambiente alvo e anexar evidências desta release.

## Definição de Pronto (DoD)

- [x] Checklist de smoke WCAG AA criado e versionado.
- [x] Fluxos críticos e critérios de bloqueio documentados.
- [x] Roteiro de execução manual objetivo (sem ambiguidade).
- [x] Execução real realizada e evidências anexadas no ciclo de release.

## Notas

- Este artefato é intencionalmente manual para reduzir custo e acelerar triagem.
- Pode evoluir para automação (ex.: axe em E2E) após estabilização do backlog.
