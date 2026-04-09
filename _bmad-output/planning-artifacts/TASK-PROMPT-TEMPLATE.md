# 📋 Prompt Estruturado para Atividades e Épicos — NutriGestão

Use este template para capturar, organizar e priorizar atividades, stories e épicos de forma estruturada e clara.

---

## 🎯 Seção 1: Identificação da Atividade

### O que está sendo trabalhado?
- **Tipo:** [ ] Bug | [ ] Feature | [ ] Refactoring | [ ] Tech Debt | [ ] Épico | [ ] Story | [ ] Task
- **ID (se aplicável):** `[Epic-X.Y ou TASK-XXX]`
- **Título:** _[Uma linha clara do objetivo]_
- **Descrição Breve:** _[2–3 linhas do que será feito]_

### Contexto & Motivação
- **Por quê?** _[Problema a resolver, oportunidade, feedback do usuário, etc.]_
- **Impacto:** [ ] Crítico | [ ] Alto | [ ] Médio | [ ] Baixo
- **Urgência:** [ ] Imediata | [ ] Próximas 2 sprints | [ ] Backlog | [ ] Futura

---

## 📐 Seção 2: Requisitos e Aceitação

### Requisitos Funcionais (FRs)
```
Listar cada FR associado (copiar da spec do PRD ou criar novo se não existir):

[ ] FR-XXX: Descrição breve
[ ] FR-YYY: Descrição breve
[ ] FR-ZZZ: Descrição breve
```

### User Stories (formato padrão)
```
As a [PERSONA],
I want [AÇÃO],
So that [BENEFÍCIO].

Acceptance Criteria:
  Given [CONTEXTO]
  When [AÇÃO]
  Then [RESULTADO]
  And [VALIDAÇÃO ADICIONAL]
```

### Critérios de Aceitação Detalhados
- [ ] **Critério 1:** _[Descrição mensurável]_
- [ ] **Critério 2:** _[Descrição mensurável]_
- [ ] **Critério 3:** _[Descrição mensurável]_

### Dependências
- [ ] Nenhuma
- [ ] Depende de: `[Lista de outros tasks/stories com links]`
- [ ] Bloqueia: `[Quais atividades dependem desta?]`

---

## 🏗️ Seção 3: Design & Decisões Técnicas

### Desenho de Solução
```
Breve descrição da abordagem:
- Componentes/módulos envolvidos
- Fluxos principais
- Alterações na BD (se aplicável)
- Padrões de código a usar
```

### Stack & Convenções Confirmadas
- **Tecnologia:** [Framework, libs, DB, etc.]
- **Padrões:** [RLS, Server Actions, Types, etc.]
- **Riscos ou Trade-offs:** _[Se houver escolhas entre opções]_

### Checklist de Segurança & Compliance
- [ ] RLS validado (multi-tenant isolation)
- [ ] LGPD considerada (dados sensíveis mascarados?)
- [ ] Validação de entrada (XSS, SQL injection)
- [ ] Auditoria de mutações em dados de paciente
- [ ] Testes de permissão entre tenants

---

## ✅ Seção 4: Plano de Implementação

### Tarefas (Sub-tasks)
```
Dividir em itens accionáveis (não mais que 1-2 dias de trabalho cada):

### Backend / Banco de Dados
  - [ ] Migration SQL (se aplicável)
  - [ ] RLS policies
  - [ ] Server Actions / API endpoints

### Frontend
  - [ ] Componentes a criar/editar
  - [ ] Páginas/rotas
  - [ ] Formulários + validação
  - [ ] Estados (loading, error, success)

### Integração & QA
  - [ ] Testes unitários
  - [ ] Testes de integração
  - [ ] Testes E2E (se crítico)
  - [ ] Review de código

### Documentação & Deploy
  - [ ] README / comentários no código
  - [ ] Atualizar sprint-status.yaml
  - [ ] Preparar migration (se for refactor)
```

### Arquivos a Criar/Modificar
```
- lib/actions/xxx.ts
- lib/types/xxx.ts
- components/xxx/yyy.tsx
- app/(app)/[module]/[page].tsx
- supabase/migrations/YYYYMMDD_description.sql
```

---

## 📊 Seção 5: Estimativa & Priorização

### Estimativa
- **Complexity:** [ ] XS (< 4h) | [ ] S (4-8h) | [ ] M (1-2d) | [ ] L (3-5d) | [ ] XL (> 5d)
- **Esforço em story points:** _[1, 2, 3, 5, 8, 13, 21, etc.]_

### Prioridade
- **MoSCoW:** [ ] Must | [ ] Should | [ ] Could | [ ] Won't
- **Dependências bloqueadoras:** _[Sim/Não; se sim, listar]_

### Sequência no Épico
```
Se parte de um épico, indicar a ordem:
 Épico X
  └─ X.1 (done / in-progress / backlog)
  └─ X.2 (done / in-progress / backlog)  ← Próximo
  └─ X.3 (backlog)
```

---

## 🎬 Seção 6: Execução & Entrega

### Definition of Done (DoD)
- [ ] Código escrito e revisado (TypeScript sem erros)
- [ ] RLS testado (nenhum cross-tenant leak)
- [ ] Critérios de aceitação atendidos
- [ ] Testes passando (unit + E2E se aplicável)
- [ ] Sprint status atualizado
- [ ] Documentação completa
- [ ] Ready for production (sem TODOs críticos)

### Validação Pós-Merge
```
Como validar que isto funciona:
1. [Passo 1 de teste manual]
2. [Passo 2 de teste manual]
3. [Verificar logs, alertas, etc.]
```

### Sign-off
- **Implementador:** _[Nome]_
- **Revisor:** _[Nome]_
- **Data Conclusão:** _[YYYY-MM-DD]_

---

## 📝 Notas Adicionais

### Decisões Tomadas
- _[Registar escolhas importantes e por quê]_

### Próximos Passos
- [ ] _[Task / story seguinte no épico]_
- [ ] _[Validação em produção]_
- [ ] _[Feedback de utilizadores]_

### Referências Úteis
- PRD: `_bmad-output/planning-artifacts/prd.md`
- Arquitetura: `_bmad-output/planning-artifacts/architecture.md`
- UX Design: `_bmad-output/planning-artifacts/ux-design-specification.md`
- Sprint Status: `_bmad-output/implementation-artifacts/sprint-status.yaml`

---

## 💡 Dicas de Uso

1. **Para uma nova Feature:**
   - Preencha seções 1–3 completamente
   - Procure dependências em sprint-status.yaml
   - Discuta com o time antes de começar desenvolvimento

2. **Para um Bug:**
   - Seção 1: Clareza do problema + reprodução
   - Seção 2: Critérios de "corrigido"
   - Seção 4: Testes para evitar regressão

3. **Para um Épico (múltiplas stories):**
   - Seção 1: Visão geral do épico
   - Seção 2: FRs do épico (agregadas)
   - Seção 4: Tarefas de gestão do épico (criar story files, etc.)
   - Depois, preencher este template **por cada story**

4. **Para Refactoring:**
   - Seção 3: Justificar trade-offs técnicos
   - Seção 4: Plano de migração com zero-downtime
   - Seção 5: Estimar bem (refactoring tende a demorar mais)
