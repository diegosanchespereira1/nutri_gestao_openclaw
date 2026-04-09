# Story 11.3: Registo de Consentimentos Digital

## Contexto

Story 11.2 (Log de Auditoria) foi concluída, implementando log imutável de mutações em dados de paciente com RLS e mascaramento de campos sensíveis. 

Story 11.3 completa o compliance LGPD com um sistema de consentimento digital que permite:
- Colecionar e armazenar evidência de consentimento do paciente/responsável para uso de dados
- Registar consentimento com timestamp, IP, user-agent para rastreabilidade legal
- Suportar fluxos de consentimento para menores (responsável legal) e maiores (paciente)
- Integração com Supabase com RLS para isolamento multi-tenant

## Objetivo

Após Story 11.3, o profissional será capaz de:
- Coletar consentimento digital ao cadastrar ou editar um paciente
- Demonstrar evidência de consentimento LGPD (FR63) a auditores/DPA
- Gerenciar consentimentos para menores com coleta obrigatória de responsável legal (LGPD Art. 14)
- Revogar consentimentos e registar razão da revogação

## Stack & Convenções

- **Framework:** Next.js 15 App Router, TypeScript strict
- **Styling:** Tailwind CSS + shadcn/ui (Base UI)
- **Auth:** @supabase/ssr (server-side session)
- **Database:** Supabase PostgreSQL com RLS em todas as tabelas de tenant
- **Rota do módulo:** Integrada em `app/(app)/pacientes/` (fluxo do cadastro existente)
- **Valores de consentimento:** Tipos específicos (uso_dados, compartilhamento_externo, pesquisa, etc.)

## Requisitos Funcionais

- **FR63:** Sistema coleta e registra consentimento digital do paciente/responsável para uso de dados
- **FR49:** Sistema coleta consentimento LGPD do responsável legal ao cadastrar paciente menor de idade
- **NFR15:** Log de consentimento com retenção, mascaramento de campos sensíveis
- **NFR28–30:** Acessibilidade WCAG AA em fluxo de consentimento

## Critérios de Aceitação

### Armazenamento de Consentimento

**Given** paciente novo ou existente  
**When** profissional completa o cadastro ou acessa edição  
**Then** sistema solicita aceite de consentimento em modal ou seção dedicada  
**And** consentimento é guardado na tabela `consent_records` com timestamp, IP, user-agent  
**And** tabela isolada por RLS (`user_id = auth.uid()`)

### Fluxo para Menores

**Given** paciente com `date_of_birth` inferior a 18 anos  
**When** profissional tenta guardar o cadastro  
**Then** sistema bloqueia até obter consentimento explícito do responsável legal  
**And** campo obrigatório "Nome do Responsável" é necessário  
**And** aceite registado com flag `is_parental_consent = true`

### Fluxo para Maiores

**Given** paciente ≥ 18 anos  
**When** profissional acessa cadastro/edição  
**Then** consentimento é solicitado ao paciente (no próprio formulário ou modal)  
**And** sem bloqueio obrigatório se recusar (soft consent) — permite continuar com aviso legal

### Revogação de Consentimento

**Given** consentimento já registado  
**When** paciente/responsável revoga (via portal externo ou profissional revoga em admin)  
**Then** novo registo em `consent_records` com `status = 'revogado'` e `revocation_reason`  
**And** antigo registo permanece imutável (nunca delete, apenas `status = 'revogado'`)

### Rastreabilidade Legal

**Given** qualquer consentimento coletado  
**Then** registo contém: `patient_id`, `user_id` (profissional/responsável), `consent_type`, `timestamp`, `ip_address`, `user_agent`, `status`, `revocation_reason`  
**And** campo `consent_type` é enum: `uso_dados`, `compartilhamento_externo`, `pesquisa`, `etc.`

## Tarefas de Implementação

### Backend / Banco de Dados

- [ ] **Migração SQL:** Criar tabelas `consent_records` e `consent_types`
  - `consent_records`: id, patient_id, user_id, consent_type, status (active/revogado), timestamp, ip_address, user_agent, document_reference, revocation_reason, created_at, updated_at
  - RLS: `user_id = auth.uid()` para SELECT/INSERT/UPDATE
  - Trigger: Imutabilidade — DELETE bloqueado, UPDATE apenas para status/revocation_reason
  - Índice: (patient_id, user_id, created_at) para queries eficientes
  - Coluna `is_parental_consent` em `patients` para flag de menor

- [ ] **Server Actions:** Implementar em `lib/actions/consent.ts`
  - `recordConsent(patientId, consentType, ipAddress?, userAgent?)` — cria novo registo
  - `revokeConsent(consentRecordId, revocationReason)` — revoga (soft-delete com status)
  - `loadPatientConsents(patientId)` — lista consentimentos ativos de um paciente
  - `validateMinorConsent(patientId)` — verifica se paciente menor tem consentimento parental válido
  - Todas com validação de auth e RLS

- [ ] **Types:** Criar `lib/types/consent.ts`
  - `ConsentRecord` type baseado na tabela
  - `ConsentType` enum: `uso_dados`, `compartilhamento_externo`, `pesquisa`, etc.
  - `ConsentStatus` enum: `active`, `revogado`

### Frontend

- [ ] **Componente ConsentModal:** `components/consent/consent-modal.tsx`
  - Modal com texto legal (LGPD Art. 7, consentimento livre, específico, informado, etc.)
  - Checkbox obrigatório "Li e aceito"
  - Button submeter e cancelar
  - Props: `isOpen`, `patientId`, `onAccept`, `onCancel`, `isParentalConsent` (ajusta título/texto)
  - Loading state durante submit

- [ ] **Componente ConsentHistory:** `components/consent/consent-history.tsx`
  - Lista de consentimentos por paciente (admin view)
  - Colunas: Data, Tipo, Status, IP, Ação Revogar
  - Badge visível para "Revogado" vs "Ativo"
  - Opção de revogar com modal de motivo

- [ ] **Integração no Cadastro de Pacientes:** `app/(app)/pacientes/[id]/page.tsx` ou form
  - Ao submeter form de novo paciente, validar `validateMinorConsent()` se idade < 18
  - Se não houver consentimento parental, bloquear submit com erro claro
  - Para maiores, sugerir consentimento em modal pós-cadastro (soft) ou inline

- [ ] **Portal Externo (Futura Story 9.3):** Link "Gerenciar Consentimentos" 
  - Permitir revogação de consentimentos pelo próprio paciente/responsável
  - (Escopo pode ser expandido em Story 11.7 ou 9.3+)

### Segurança & Compliance

- [ ] **RLS Policy:** Validar que pacientes não veem consentimentos de outros (via patient_id → user_id)
- [ ] **LGPD:** Armazenar IP e user-agent para rastreabilidade (Art. 32 — documentação de acesso)
- [ ] **Imutabilidade:** Garantir que consentimentos já registados não podem ser alterados (trigger DELETE bloqueado, UPDATE restrito)
- [ ] **Auditoria:** Cada recordConsent / revokeConsent registado em `audit_log` (Story 11.2 já implementa)
- [ ] **Mascaramento:** IP truncado em views públicas (ex: 192.168.***.*** se expostos em relatórios)

## Arquivos a Criar/Modificar

### Criar

- `supabase/migrations/20260409HHMMSS_consent_records_table.sql` — tabelas + RLS + triggers
- `lib/types/consent.ts` — types e enums
- `lib/actions/consent.ts` — Server Actions
- `components/consent/consent-modal.tsx` — modal de coleta
- `components/consent/consent-history.tsx` — histórico de consentimentos
- `app/(app)/pacientes/[id]/consent-section.tsx` — seção integrada no cadastro

### Modificar

- `lib/types/patient.ts` — adicionar campos `is_parental_consent`, `parental_consent_name`, `date_of_birth` (já existe)
- `supabase/migrations/20260409HHMMSS_patients_consent_fields.sql` — alter table patients se necessário
- `app/(app)/pacientes/[id]/page.tsx` ou form existente — integrar validação de consentimento antes do submit
- `.env.example` — documentar que IP/user-agent recolhidos para compliance

## Definição de Pronto (DoD)

- [ ] **Código TypeScript:** `npx tsc --noEmit` sem erros, sem `any`, tipos explícitos
- [ ] **RLS:** Verificado que `SELECT * FROM consent_records` sem WHERE retorna vazio para outro tenant
- [ ] **Critérios de Aceitação:** Todos atendidos (consentimento, menores, revogação, rastreabilidade)
- [ ] **Acessibilidade:** Modal com labels, foco visível, aria-required em checkbox obrigatório
- [ ] **Responsivo:** Funciona em mobile (375px) e desktop (1280px)
- [ ] **LGPD:** Documentar processamento em `legal/consentimento.md` — LPR, legitimidade, base legal (Art. 7)
- [ ] **Sprint Status:** Atualizar `sprint-status.yaml`: `11-3-registo-consentimentos-digital: done`
- [ ] **Commit:** Código commitado com mensagem referenciando FR63, Story 11.3, LGPD compliance

## Notas Técnicas

### Retenção de Dados
- Consentimentos ativos: guardar indefinidamente (ou até 5 anos pós-exclusão de conta)
- Consentimentos revogados: guardar 3 anos (comprova revogação, não recoleta)
- Cumpre NFR15 (retenção 12 meses de auditoria) e direito ao apagamento (FR69)

### IP e User-Agent
- Colecionar via Server Action: `headers().get('x-forwarded-for')` ou `request.headers`
- User-Agent: `headers().get('user-agent')`
- Truncar IP em views públicas: `192.168.***.***` para privacy
- Nunca expor em relatórios públicos — apenas em admin view ou DSAR report (Story 11.4)

### Validação de Menores
- Usar `patients.date_of_birth` (já existe)
- Idade = hoje - date_of_birth (anos completos)
- Se < 18 anos: flag `is_parental_consent = true` obrigatório antes de guardar

### Fluxo de Integração Sugerido
1. Profissional cria novo paciente (`POST /pacientes`)
2. Formulário validado, mas antes de guardar:
   - Se idade < 18: modal de consentimento com campo "Nome do Responsável"
   - Se idade ≥ 18: modal soft (aviso, pode prosseguir sem aceitar formalmente)
3. Ao aceitar: `recordConsent(patientId, 'uso_dados', ip, ua)` + guardar `is_parental_consent` na tabela patients
4. Paciente criado com sucesso

---

## Referências

- **LGPD Art. 7:** Consentimento como base legal de tratamento
- **LGPD Art. 14:** Consentimento para dados de crianças (até 12 anos)
- **LGPD Art. 32:** Segurança e medidas técnicas (rastreabilidade)
- **FR49, FR63:** Requisitos de consentimento (epics.md)
- **NFR15:** Retenção 12 meses com mascaramento
- **Story 11.2:** Auditoria de log já existente (integra consentimentos nela)
- **Story 11.4:** DSAR report futura (inclui consentimentos na exportação)
- **Story 11.7:** Exclusão de conta (apaga dados pós-retenção, consentimentos preservados como prova)
