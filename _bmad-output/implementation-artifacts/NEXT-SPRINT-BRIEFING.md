# 📋 Next Sprint Briefing — Refatoração Cliente vs Paciente

## 🎯 Visão Geral

O Epic 2 foi reorganizado para **separar completamente Clientes (PJ) de Pacientes (PF)**, criando dois fluxos independentes e melhorando a UX.

**Estado:** Sprint 8 (estimado)  
**Prioridade:** Imediata  
**Duração:** 2–3 sprints (Stories 2.1a + 2.1b + 2.3)

---

## 📊 Próximas 2 Stories (Ready-for-Dev)

### Story 2.1a: CRUD de Clientes — Apenas Pessoa Jurídica
**Arquivo:** `_bmad-output/implementation-artifacts/stories/2-1a-crud-clientes-apenas-pj.md`

```
🎯 Objetivo: Refactor de app/(app)/clientes/ para listar APENAS PJ
             (empresas, hospitais, clínicas com CNPJ)

📦 Escopo:
   ✅ Criar lista filtrável de clientes PJ
   ✅ Formulário com validação CNPJ
   ✅ Editar/eliminar cliente
   ✅ RLS isolamento (seu tenant só vê seus clientes)
   ✅ Sidebar: "Clientes" aponta para /clientes/ (PJ apenas)

⏱️ Estimativa: 1–2 dias
🔗 Depende de: Nada (independente)
🚀 Desbloqueia: Story 2.2 (Estabelecimentos)
```

**Arquivos a criar/modificar:**
```
Criar:
  app/(app)/clientes/page.tsx
  app/(app)/clientes/[id]/editar/page.tsx
  components/clientes/client-form.tsx
  lib/actions/clients.ts
  lib/utils/validation.ts (validação CNPJ)

Modificar:
  app/(app)/layout.tsx (sidebar)
  lib/types/clients.ts (se não existir)
```

---

### Story 2.1b: Cadastro de Pacientes — Pessoa Física Independente
**Arquivo:** `_bmad-output/implementation-artifacts/stories/2-1b-cadastro-pacientes-pf-independente.md`

```
🎯 Objetivo: Criar novo módulo app/(app)/pacientes/ para PF
             com cliente OPCIONAL (não obrigatório)

📦 Escopo:
   ✅ Criar lista filtrável de pacientes PF
   ✅ Formulário simples: Nome, CPF, Data Nascimento
   ✅ Campo "Cliente" é OPCIONAL (pode deixar vazio)
   ✅ Validação CPF + mascaramento
   ✅ Editar/eliminar paciente
   ✅ RLS isolamento
   ✅ Ícone/badge "Independente" para pacientes sem cliente

⏱️ Estimativa: 1–2 dias (similar a 2.1a)
🔗 Depende de: Nada (independente)
🚀 Desbloqueia: Story 2.3 (Vínculos)

⚠️ BREAKING CHANGE: Paciente agora é entidade de 1º nível
                    (antes estava sub-rota de cliente/estabelecimento)
```

**Arquivos a criar/modificar:**
```
Criar:
  app/(app)/pacientes/page.tsx
  app/(app)/pacientes/[id]/editar/page.tsx
  components/pacientes/patient-form.tsx
  lib/utils/validation.ts (validação CPF)

Modificar:
  lib/actions/patients.ts (criar/editar/deletar)
  app/(app)/layout.tsx (sidebar)
  lib/types/patients.ts (se não existir)
```

---

## 🔄 Stories que Vão Ser Refinadas (Após 2.1a/2.1b)

| Story | Mudança | Impacto |
|-------|---------|--------|
| **2.2** | Mantém-se (Estabelecimentos por PJ) | ✅ Sem mudança lógica |
| **2.3** | "Vínculos Paciente ↔ Cliente" | Agora paciente pode estar sem cliente inicialmente |
| **2.4** | Perfil Nutricional | Rota muda: `/pacientes/[id]/editar` (não mais sub-rota) |
| **2.5** | Histórico Consolidado | Rota muda: `/pacientes/[id]/historico` |
| **2.6** | Importação CSV | Adaptação para pacientes sem cliente |
| **2.7** | Wizard Onboarding | Pergunta: "Apenas pacientes" ou "Clientes + Pacientes"? |

---

## 📍 Nova Arquitetura de Rotas

```
Antes (misturado):
  app/(app)/clientes/
    └─ [id]/
       ├─ pacientes/           ❌ Pacientes era sub-rota
       └─ estabelecimentos/

Depois (separado):
  app/(app)/clientes/              ← Apenas PJ
    ├─ page.tsx                    (lista de clientes)
    └─ [id]/
       ├─ editar.tsx              (editar cliente)
       └─ estabelecimentos/        (suas instituições)

  app/(app)/pacientes/             ← Apenas PF, independente
    ├─ page.tsx                    (lista de pacientes)
    ├─ [id]/
    │  ├─ editar.tsx              (editar paciente)
    │  ├─ avaliacoes/             (nutricionais)
    │  ├─ historico.tsx           (consolidado)
    │  └─ vinculos.tsx            (associar a cliente)
```

---

## 🎬 Sequência de Execução Recomendada

### Sprint 8 (Semana 1–2)
1. **Implementar Story 2.1a** (Clientes PJ)
   - Refactor `/clientes/` para listar apenas PJ
   - Validação CNPJ
   - RLS + testes isolamento

2. **Implementar Story 2.1b** (Pacientes PF)
   - Criar `/pacientes/` como módulo independente
   - Validação CPF + mascaramento
   - RLS + testes isolamento

3. **Validar em staging**
   - Testar dois profissionais: cada um vê apenas seus dados
   - Testar paciente criado sem cliente
   - Testar paciente criado com cliente opcional

### Sprint 9 (Semana 3)
4. **Implementar Story 2.3** (Vínculos)
   - Permitir associar paciente a cliente/estabelecimento
   - Remover vínculo
   - Histórico rastreia vínculo

5. **Atualizar rotas das stories 2.4–2.5**
   - Mover `/pacientes/[id]/avaliacoes` para novo local
   - Confirmar `/pacientes/[id]/historico` funciona

### Sprint 10 (Semana 4)
6. **Atualizar CSV importer** (Story 2.6)
   - Pacientes: coluna "Cliente" é opcional

7. **Refinar Wizard** (Story 2.7)
   - Detectar tipo de trabalho: "Clientes" vs "Pacientes" vs "Ambos"
   - Fluxo simplificado por tipo

---

## 🔐 Checklist de Segurança (Crítico)

- [ ] RLS: Profissional A **NÃO** vê clientes/pacientes de Profissional B
- [ ] RLS: Testes automatizados cobrem isolamento multi-tenant
- [ ] Validação CNPJ: Rejeita formatos inválidos
- [ ] Validação CPF: Rejeita formatos inválidos + calcula dígito verificador
- [ ] XSS: Inputs sanitizados antes de render
- [ ] LGPD: Campos sensíveis (CPF, data nascimento) não aparecem em toasts
- [ ] CPF mascarado em lists: `XXX.XXX.XXX-XX`

---

## 📚 Documentação de Referência

```
Estrutura Prompt (para futuras tasks):
  👉 _bmad-output/planning-artifacts/TASK-PROMPT-TEMPLATE.md

Proposta Completa de Refatoração:
  👉 _bmad-output/planning-artifacts/REFACTOR-CLIENTE-PACIENTE.md

Story Files (Prontos para Dev):
  👉 _bmad-output/implementation-artifacts/stories/2-1a-crud-clientes-apenas-pj.md
  👉 _bmad-output/implementation-artifacts/stories/2-1b-cadastro-pacientes-pf-independente.md

Sprint Status (Atualizado):
  👉 _bmad-output/implementation-artifacts/sprint-status.yaml
```

---

## ✅ Definition of Ready (Stories 2.1a e 2.1b)

Ambas as stories estão **ready-for-dev**:
- ✅ Story files criados com tarefas detalhadas
- ✅ Aceitação clara (Given/When/Then)
- ✅ Arquivos a criar/modificar listados
- ✅ Estimativa: M (1–2 dias cada)
- ✅ Sem dependências bloqueadoras
- ✅ RLS requirements explícitos

---

## 🚀 Próximo Passo?

**Opção 1:** Chamar `nutrigestao-dev` para **implementar Story 2.1a imediatamente**
```bash
skill: nutrigestao-dev
Implementar Story 2.1a — CRUD Clientes PJ
```

**Opção 2:** Revisar story files + validar com o time antes de começar

**Qual prefere?**
