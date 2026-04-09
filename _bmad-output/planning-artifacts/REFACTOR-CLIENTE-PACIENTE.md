# 🔄 Proposta de Refatoração: Separação de Clientes (PJ) e Pacientes (PF)

## 📋 Resumo Executivo

**Objetivo:** Separar o fluxo de cadastro e gerenciamento de **Clientes** (apenas PJ — empresas, hospitais, clínicas) do fluxo de **Pacientes** (PF — pessoa física), melhorando a usabilidade e deixando a associação Paciente ↔ Cliente opcional.

**Impacto:** Reorganização clara do Epic 2, criando dois fluxos paralelos mas independentes.  
**Prioridade:** Imediata (próximas stories após conclusão de Epic 2.5–2.7).  
**Esforço:** Refactor UI/UX + refinamento de stories existentes (sem mudança crítica de BD).

---

## 🔍 Análise do Estado Atual

### Problema Identificado
Atualmente, Epic 2 mistura:
- **Cadastro de Clientes** (PF e PJ) — Story 2.1
- **Estabelecimentos por PJ** — Story 2.2
- **Pacientes e vínculos** — Story 2.3, 2.4, 2.5

Isto cria confusão:
1. **Usuário abre "Clientes"** → vê tanto pessoa física quanto jurídica juntas
2. **Para adicionar paciente** → precisa navegar através de cliente e estabelecimento, mesmo se apenas quer um paciente independente
3. **Estabelecimentos apenas existem sob PJ** → paciente PF fica orphaned
4. **Fluxo de onboarding não é claro** sobre o papel de cada entidade

### Resultado Desejado
- ✅ **Módulo "Clientes"** → apenas PJ (empresas, hospitais, clínicas) + seus estabelecimentos
- ✅ **Módulo "Pacientes"** → PF (pessoa física) com campo opcional de "Associar a Cliente"
- ✅ **Independência:** Paciente pode existir sem cliente; cliente pode ter 0 ou N pacientes
- ✅ **Navegação clara:** Sidebar separada ou abas bem definidas

---

## 🏗️ Arquitetura Proposta

### Rotas e Navegação

```
app/(app)/
├── clientes/               # Apenas PJ — Empresas, hospitais, clínicas
│   ├── page.tsx           # Lista de clientes (somente PJ)
│   ├── [id]/
│   │   ├── editar.tsx     # Editar cliente PJ
│   │   ├── estabelecimentos/
│   │   │   ├── page.tsx   # Lista de estabelecimentos do cliente
│   │   │   ├── [estId]/editar.tsx
│   │   │   └── criar.tsx
│   │   └── pacientes.tsx  # Pacientes opcionalmente vinculados (read-only link)
│
└── pacientes/              # Pessoa Física — Com associação opcional
    ├── page.tsx           # Lista de pacientes (todos, filtrados por cliente opcional)
    ├── [id]/
    │   ├── editar.tsx     # Editar paciente
    │   ├── avaliacoes/    # Avaliações nutricionais
    │   ├── historico.tsx  # Histórico consolidado
    │   └── vinculos.tsx   # Gerenciar vínculos a clientes/estabelecimentos
```

### Sidebar Navigation

```
Sidebar logado:
┌─ Configuração
├─ Cadastros
│   ├─ Clientes (ícone empresa)
│   └─ Pacientes (ícone pessoa)
├─ Visitas & Checklists
├─ Financeiro
├─ Dashboard
└─ Configurações
```

---

## 📊 Reorganização das Stories no Epic 2

### Bloco A: Clientes (Pessoa Jurídica)

#### Story 2.1a: CRUD de Clientes — Apenas PJ

**Current:** Story 2.1 (mix de PF/PJ)  
**New:** Story 2.1a (PJ apenas)

```
As a profissional,
I want registar clientes jurídicos (empresas, hospitais, clínicas),
So that organizo a minha carteira de atendimento institucional.

Acceptance Criteria:
  Given formulário de criação de cliente
  When submeto dados de cliente PJ (CNPJ, razão social, tipo)
  Then cliente aparece na lista "Clientes" filtrável
  And RLS impede leitura por outro tenant

Changes:
  - Remover campos de PF do formulário (CPF → CNPJ apenas)
  - Adicionar campo "Tipo de Estabelecimento" (opcional aqui, será requerido em estabelecimentos)
  - Listar apenas clientes PJ em app/(app)/clientes/
```

#### Story 2.2 (mantém-se): Estabelecimentos por Cliente PJ

```
As a profissional,
I want associar estabelecimentos a clientes PJ,
So that aplico portarias e visitas por instituição.

Acceptance Criteria:
  Given cliente PJ existente
  When adiciono estabelecimento com tipo (escola, hospital, etc.)
  Then estabelecimento lista sob "app/(app)/clientes/[id]/estabelecimentos"
  And tipo é enum válido do PRD
```

### Bloco B: Pacientes (Pessoa Física)

#### Story 2.1b: Cadastro de Pacientes — PF Independente

**New story** (desmembrada de 2.1 + 2.3)

```
As a profissional,
I want registar pacientes pessoa física,
So that acompanho indivíduos independentemente de cliente institucional.

Acceptance Criteria:
  Given formulário de criação de paciente
  When submeto dados de PF (CPF, data nascimento, etc.) **sem cliente obrigatório**
  Then paciente aparece em app/(app)/pacientes/ filtrável
  And posso opcionalmente vincular a um cliente PJ na página de edição
  And RLS impede leitura por outro tenant

Changes:
  - Campo "Cliente" é **OPTIONAL** (não required)
  - Paciente pode ter 0 ou 1 cliente (no modelo: client_id pode ser NULL)
  - Fluxo de criação simplificado: 3-4 campos obrigatórios apenas
  - Vínculo a cliente pode ser feito depois, em "Gerenciar Vínculos"
```

#### Story 2.3 (refinado): Vínculos Paciente ↔ Cliente/Estabelecimento

**Current:** Story 2.3 (vínculos durante criação)  
**Refined:** Story 2.3 (vínculos em modelo flexible)

```
As a profissional,
I want vincular um paciente a um cliente ou estabelecimento,
So that posso rastrear atendimento em contextos específicos.

Acceptance Criteria:
  Given paciente PF existente
  When acesso app/(app)/pacientes/[id]/vinculos
  Then vejo opção de "Associar a Cliente" (dropdown com clientes PJ)
  And posso também especificar estabelecimento do cliente
  And vínculo é persistido (pacient.client_id + patient.establishment_id)
  And posso remover vínculo sem deletar paciente
  And um paciente pode estar vinculado a **no máximo 1 cliente** no modelo atual
    (ou N clientes se design futuro o permitir)

Model:
  patients table:
    - client_id: UUID | NULL (FK → clients)
    - establishment_id: UUID | NULL (FK → establishments)
    - recorded_at: timestamp
```

#### Story 2.4 (mantém-se): Perfil Nutricional e Avaliações

```
As a profissional,
I want completar perfil nutricional do paciente com formulários de avaliação,
So that suporto acompanhamento.

Changes:
  - Localização: app/(app)/pacientes/[id]/editar (formulário) + app/(app)/pacientes/[id]/avaliacoes (histórico)
  - Não quebra logicamente — paciente agora é entidade de 1º nível
```

#### Story 2.5 (refinado): Histórico Consolidado

**Current:** Story 2.5 (consolidado multi-estabelecimento)  
**Refined:** Story 2.5 (consolidado por paciente, opcionalmente filtrado)

```
As a profissional,
I want ver histórico completo de um paciente,
So that tenho visão única de atendimentos.

Changes:
  - Rota: app/(app)/pacientes/[id]/historico (não mais sub-rota de cliente)
  - Se paciente tem vínculo: mostra "Atendimentos no cliente X" como filtro opcional
  - Se paciente sem vínculo: mostra "Atendimentos independentes"
  - Timeline consolida tudo (visitas, avaliações, checklists, prescriptions)
```

### Bloco C: Funcionalidades Transversais

#### Story 2.6 (refinado): Importação CSV/Excel

```
As a profissional,
I want importar clientes PJ, estabelecimentos e pacientes via ficheiro,
So that migro do Excel rapidamente.

Changes:
  - Mapeador distingue: abas ou seções para "Clientes", "Estabelecimentos", "Pacientes"
  - Pacientes: coluna "Cliente" é OPCIONAL; se vazia, paciente criado sem vínculo
  - Validação: garante CNPJ para clientes, CPF para pacientes
  - Relatório de erros por linha e tipo de entidade
```

#### Story 2.7 (mantém-se): Wizard de Onboarding

```
As a novo utilizador,
I want completar wizard de configuração inicial,
So that passo a usar a plataforma rapidamente.

Changes:
  - Step 1: "Qual é o seu tipo de trabalho?" → "Autônomo com Clientes" ou "Atendo Pacientes Individuais" ou "Ambos"
  - Step 2: "Cadastre o seu primeiro cliente PJ" (se selecionou "Clientes" no passo 1) — **OPTIONAL**
  - Step 3: "Cadastre o seu primeiro paciente" — pode vir da seção "Clientes" (click → criar paciente vinculado) ou direto em "Pacientes"
  - Step 4: Sugestão de portarias by Estado + tipo de estabelecimento (se tem cliente institucional)
```

---

## 🔧 Impacto no Modelo de Dados (Minimal)

### Alterações Necessárias

```sql
-- Existente: clients table já tem "type" (PF/PJ)
-- Nova logica: rota /clientes/ filtra ONLY PJ

-- Existente: patients table já tem client_id (nullable)
-- Já suporta paciente sem cliente! Apenas refactor UI para valorizar isto.

-- Novo (OPTIONAL para futuro):
-- ALTER TABLE patients ADD COLUMN establishment_id UUID 
--   REFERENCES establishments(id) ON DELETE SET NULL;
-- (Já pode existir se implementado em 2.3)
```

### Breaking Changes
- ❌ **Nenhum** — o modelo de dados já suporta esta separação
- ✅ Apenas refactor UI/rotas + stories reorganizadas

---

## 📍 Nova Árvore de Stories no Epic 2

```
Epic 2: Cadastro Operacional, Onboarding e Importação
├─ 2.1a: CRUD Clientes — Apenas PJ (REFACTOR)
├─ 2.1b: Cadastro Pacientes — PF Independente (NEW)
├─ 2.2: Estabelecimentos por Cliente PJ (KEPT)
├─ 2.3: Vínculos Paciente ↔ Cliente/Estabelecimento (REFINED)
├─ 2.4: Perfil Nutricional e Avaliações (REFINED ROUTING)
├─ 2.5: Histórico Consolidado por Paciente (REFINED)
├─ 2.6: Importação CSV/Excel (REFINED)
└─ 2.7: Wizard de Onboarding (REFINED)
```

---

## 🎯 Benefícios da Refatoração

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Clareza** | Clientes + Pacientes misturados | Módulos separados, independentes |
| **Fluxo de criação** | "Criar cliente" → "Criar établecimento" → "Criar paciente" | "Criar paciente" em 3 cliques; vínculo opcional depois |
| **Flexibilidade** | Paciente obrigado a ter cliente | Paciente pode ser independente |
| **Navegação** | Estabelecimento é sub-rota de cliente | Paciente é entidade de 1º nível |
| **Onboarding** | Não diferencia tipos de trabalho | Detecta: "Autônomo + Clientes" ou "Consultoria Pacientes" |

---

## 🚀 Plano de Execução

### Fase 1: Stories Reorganizadas (2–3 sprints)
1. Refactor Story 2.1 → 2.1a (clientes PJ) + 2.1b (pacientes)
2. Refactor rota `/clientes/` → listar apenas PJ
3. Refactor rota `/pacientes/` → listar PF com filtro "Cliente"
4. Atualizar stories 2.3–2.7

### Fase 2: Validação (1 sprint)
- [ ] Testes: usuário com paciente sem cliente funciona
- [ ] Testes: usuário com paciente vinculado a cliente funciona
- [ ] Importação CSV: pacientes sem cliente importa corretamente
- [ ] RLS: nenhum cross-tenant leak

### Fase 3: Go-live
- Deploy com feature flags se necessário
- Migrar dados antigos (se cliente_id NULL, paciente já fica independente)

---

## 📋 Checklist de Implementação

- [ ] Ler e validar este documento com o time
- [ ] Criar story files para 2.1a, 2.1b (usar template TASK-PROMPT-TEMPLATE.md)
- [ ] Refactor componentes: ClientsList, PatientsList
- [ ] Refactor rotas: app/(app)/clientes/, app/(app)/pacientes/
- [ ] Atualizar sidebar navigation
- [ ] Refactor formulários: ClientForm (PJ apenas), PatientForm (PF, cliente optional)
- [ ] Atualizar CSV importer
- [ ] Atualizar wizard onboarding
- [ ] Testes: RLS, fluxos de criação/edição
- [ ] Documentação: atualizar PRD/epics.md
- [ ] Sprint status: marcar stories como `in-progress`

---

## 🤔 FAQ

**P: E se um paciente tiver sido atendido em 2 clientes diferentes?**  
R: Modelo atual suporta 1 cliente por paciente. Para múltiplos: criar issue futura ou usar "Vínculos Múltiplos" em 2.3.

**P: Vamos deletar clientes PF do sistema?**  
R: Não. Se houver dados históricos, fazer migração: clientes PF → `type='PF'` ficam inativos em `/clientes/`, mas mantêm-se na BD.

**P: Isto quebra relatórios / financeiro (Epic 8)?**  
R: Não. Epic 8 continua usando `clients` + `patients` conforme hoje; esta refatoração apenas muda UX.

**P: Como fica o estabelecimento se não temos cliente?**  
R: Estabelecimentos **sempre** vinculados a cliente PJ. Paciente pode estar em estabelecimento **opcionalmente** (via `patient.establishment_id`).

---

## 📚 Referências

- PRD: `_bmad-output/planning-artifacts/prd.md` (FR6–FR11)
- UX Design: `_bmad-output/planning-artifacts/ux-design-specification.md`
- Sprint Status: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Task Template: `_bmad-output/planning-artifacts/TASK-PROMPT-TEMPLATE.md`
