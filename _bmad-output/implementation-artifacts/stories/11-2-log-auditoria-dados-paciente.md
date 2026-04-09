# Story 11.2: Log de Auditoria — Ações em Dados de Pacientes

**Estado:** ready-for-dev  
**Épico:** 11 — Segurança transversal, auditoria e direitos do titular  
**Dependências:** Stories 1.1–2.1b (Auth, Cadastro), 3–4 (Avaliações), 6 (Receitas)  
**Prioridade:** Alta — Compliance LGPD Art. 5(e), Art. 32 (logs de acesso a dados sensíveis)

---

## Contexto

Epic 11 implementa requisitos transversais de segurança, auditoria e conformidade LGPD. Stories 1–10 introduziram operações CRUD em pacientes, avaliações, checklists e receitas. A partir de agora, **cada mutação em dados de paciente** (criar, editar, eliminar, visualizar) deve ser registada num log de auditoria permanente para fins de:

- **Compliance LGPD:** Demonstrar quem acedeu/modificou dados de pacientes (Art. 5(e), Art. 32)
- **Segurança:** Detecção de anomalias (acesso nocturno, bulk downloads, exfiltração)
- **Governança:** Pistas de auditoria para investigação de incidentes
- **Conformidade regulatória:** Portarias sanitárias (hospitais, clínicas) exigem logs

---

## Objetivo

Implementar um sistema de logging de auditoria que:

1. **Registar cada mutação** em tabelas de paciente (`patients`, `patient_nutrition_assessments`, `patient_exams`, `patient_consent`)
2. **Incluir contexto:** quem (user_id), quando (timestamp), o quê (tabela, operação, valores antes/depois)
3. **Ser imutável:** logs não podem ser apagados ou alterados
4. **Mascarar dados sensíveis:** CPF, data de nascimento não aparecem em claro (criptografados ou truncados)
5. **Ser queryável:** profissional pode gerar relatório de quem acedeu aos dados de um paciente específico (DSAR)

Satisfaz **FR62** (log de auditoria), **FR64** (relatório de dados pessoais para DSAR), e **NFR15** (retenção 12 meses, mascaramento de sensíveis).

---

## Stack & Convenções

- **Framework:** Next.js 15, TypeScript strict
- **DB:** Supabase PostgreSQL
- **Logging:** 
  - Triggers PL/pgSQL para auto-logging (imutável, automático)
  - Tabela `audit_log` com RLS para isolamento de tenant
- **Retenção:** 12 meses (configurável via política de retenção)
- **Criptografia:** Campos sensíveis via função de mascaramento SQL
- **Conformidade:** LGPD Art. 5(e), Art. 32; portarias sanitárias

---

## Requisitos Funcionais

**FR62:** Sistema registra log de auditoria de todas as ações em dados de pacientes
- Cada INSERT, UPDATE, DELETE em `patients`, `patient_nutrition_assessments`, `patient_exams`, `patient_consent`
- Registar: user_id (quem), timestamp (quando), tabela (qual), operação (CREATE/READ/UPDATE/DELETE), valores antes/depois
- Imutabilidade: logs não podem ser apagados, apenas marcados como "expirados" após 12 meses

**FR64:** Sistema permite ao profissional gerar relatório de dados pessoais de um paciente para atendimento de direitos LGPD
- Profissional pode solicitar: "Mostre-me quem acedeu aos dados de [paciente X]"
- Relatório inclui: quem, quando, que operação, que dados foram vistos/modificados
- Interface de export: CSV ou PDF
- Ativado após Story 11.3 (consentimentos digitais)

---

## Critérios de Aceitação

### Cenário 1: Auto-logging de INSERT
```gherkin
Given profissional autenticado em app/(app)/pacientes/novo
When submeto novo paciente (nome, CPF, data nascimento)
Then linha é inserida em pacientes
And trigger `audit_log_pacientes_ai` registra:
  - audit_log.user_id = auth.uid()
  - audit_log.timestamp = now()
  - audit_log.tabla = 'pacientes'
  - audit_log.operation = 'INSERT'
  - audit_log.record_id = [id do paciente]
  - audit_log.new_values = {nome, documento_id (truncado), birth_date}
  - audit_log.old_values = NULL
And CPF não aparece em claro (truncado: ***.***.***-XX)
And log é imutável (não posso deletar audit_log)
```

### Cenário 2: Auto-logging de UPDATE
```gherkin
Given paciente já existe
When profissional edita nome ou contacto
Then audit_log registra:
  - operation = 'UPDATE'
  - old_values = {nome anterior, contacto anterior}
  - new_values = {nome novo, contacto novo}
  - user_id, timestamp preenchidos
```

### Cenário 3: Auto-logging de DELETE
```gherkin
Given paciente com avaliações e exames
When profissional clica "Eliminar" e confirma
Then DELETE cascata remove paciente
And audit_log registra:
  - operation = 'DELETE'
  - old_values = {todos os dados do paciente}
  - new_values = NULL
And logs da avaliações/exames deletadas também registadas (cascade audit)
```

### Cenário 4: Mascaramento de Sensíveis
```gherkin
Given audit_log criado com CPF ou data nascimento
When admin/auditor consulta audit_log via SQL
Then CPF aparece como ***.***.***-XX
And data nascimento aparece como YYYY-**-**
And nome completo aparece em claro (não é sensível)
```

### Cenário 5: Retenção de 12 Meses
```gherkin
Given log de auditoria criado há 13 meses
When sistema executa job de retenção (diário)
Then log é marcado como "expirado" (soft-delete via status)
And não é mais queryável no relatório de auditoria
And dados históricos continuam na tabela (compliance)
```

### Cenário 6: Relatório de Acesso (DSAR)
```gherkin
Given paciente com histórico de avaliações e exames
When profissional solicita "Relatório de quem acedeu aos dados de [Paciente X]"
Then sistema gera:
  - Lista: [user_id, nome_profissional, timestamp, operação]
  - Exemplo: "João (user 123) viu os dados em 2026-04-01 10:30"
  - CSV ou PDF, exportável
And relatório mostra apenas dados de pacientes que o solicitante é responsável
```

### Cenário 7: RLS em audit_log
```gherkin
Given tenant A criou log de auditoria
When tenant B tenta SELECT audit_log
Then apenas vê logs de tenant B (policy: user_id = auth.uid())
And zero acesso cross-tenant a histórico de auditoria
```

---

## Tarefas de Implementação

### Backend / Banco de Dados

- [ ] **Migração SQL**: Criar tabela `audit_log`
  ```sql
  CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'READ')),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired'))
  );
  ```

- [ ] **Índices de Performance**
  ```sql
  CREATE INDEX audit_log_user_created_idx 
    ON public.audit_log (user_id, created_at DESC);
  CREATE INDEX audit_log_table_record_idx 
    ON public.audit_log (table_name, record_id);
  CREATE INDEX audit_log_expires_idx 
    ON public.audit_log (expires_at) WHERE status = 'active';
  ```

- [ ] **RLS Policy**: audit_log acessível apenas ao próprio tenant
  ```sql
  CREATE POLICY "audit_log_select_own" ON public.audit_log
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
  ```

- [ ] **Triggers PL/pgSQL** para auto-logging de `patients`, `patient_nutrition_assessments`, `patient_exams`, `patient_consent`
  - Trigger de INSERT: `audit_log_pacientes_ai`
  - Trigger de UPDATE: `audit_log_pacientes_au`
  - Trigger de DELETE: `audit_log_pacientes_ad`
  - Função auxiliar: `mask_sensitive_fields(jsonb)` para truncar CPF/data

- [ ] **Função de Mascaramento**
  ```plpgsql
  CREATE OR REPLACE FUNCTION mask_sensitive_fields(data JSONB)
    RETURNS JSONB AS $$
  BEGIN
    IF data ? 'document_id' THEN
      data := jsonb_set(data, '{document_id}', 
        to_jsonb((data->>'document_id')[:6] || '***-' || (data->>'document_id')[-2:]));
    END IF;
    IF data ? 'birth_date' THEN
      data := jsonb_set(data, '{birth_date}', 
        to_jsonb((data->>'birth_date')[:5] || '**-**'));
    END IF;
    RETURN data;
  END;
  $$ LANGUAGE plpgsql;
  ```

- [ ] **Job de Retenção**: Cron job diário que marca logs com > 12 meses como `expired`
  - Via Supabase Cron Extensions ou via Edge Function acionada diariamente

### Frontend

- [ ] **Componente de Visualização**: `components/auditoria/audit-log-viewer.tsx`
  - Tabela com filtros: por paciente, por data, por operação
  - Paginação eficiente (1000s de logs)
  - Botão de export CSV/PDF

- [ ] **Página DSAR**: `app/(app)/auditoria/paciente/[id]/page.tsx`
  - Mostra "Quem acedeu aos dados de [Paciente X]"
  - Profissional seleciona paciente, vê timeline
  - Export para o paciente cumprir direito de DSAR

- [ ] **Server Action**: `lib/actions/audit.ts`
  ```typescript
  export async function loadAuditLogForPatient(
    patientId: string,
    filters?: { startDate?: string; endDate?: string }
  ): Promise<{ rows: AuditLogRow[] }>;

  export async function exportAuditLogCsv(patientId: string): Promise<blob>;
  ```

### Segurança & Compliance

- [ ] **RLS testado**: Confirmar que nenhum tenant acessa logs de outro
- [ ] **Imutabilidade de logs**: INSERT allowed, UPDATE/DELETE bloqueados por RLS (apenas timestamp/expires_at editáveis)
- [ ] **Criptografia em repouso**: Supabase AES-256 padrão
- [ ] **LGPD Art. 5(e)**: Documentar que logs servem a accountability
- [ ] **LGPD Art. 32**: Logs fazem parte da segurança de dados sensíveis (protegidos por RLS + AES-256)
- [ ] **Retenção**: Validar que job de retenção executa e marca corretamente
- [ ] **Auditoria da auditoria**: Logs de modificações em audit_log registro próprio (imutabilidade)

---

## Arquivos a Criar/Modificar

### Criar
- `supabase/migrations/20260409170000_audit_log.sql` — tabela, triggers, RLS, índices
- `components/auditoria/audit-log-viewer.tsx` — visualização de logs
- `app/(app)/auditoria/page.tsx` — página raiz de auditoria
- `app/(app)/auditoria/paciente/[id]/page.tsx` — DSAR por paciente
- `lib/actions/audit.ts` — queries e exports de auditoria
- `lib/types/audit.ts` — tipos TypeScript para AuditLogRow

### Modificar
- `lib/supabase/server.ts` — se necessário, helper para contexto de auditoria
- Potencialmente adicionar `ip_address` e `user_agent` aos Server Actions (para logging)

---

## Definição de Pronto (DoD)

- [ ] Tabela `audit_log` criada com RLS funcional
- [ ] Triggers de INSERT/UPDATE/DELETE funcionais em 4+ tabelas de paciente
- [ ] Mascaramento de CPF/data de nascimento confirmado
- [ ] Retenção de 12 meses implementada e testada
- [ ] Página de DSAR queryável e exportável (CSV/PDF)
- [ ] TypeScript sem erros
- [ ] RLS testado: tenant A não vê logs de tenant B
- [ ] Documentação: como consultar/interpretar audit_log
- [ ] Sprint status atualizado para `done`
- [ ] Performance validada: queries em audit_log < 2s para 10k registos

---

## Notas de Implementação

1. **Trigger vs. Application Log:** Triggers no DB garantem imutabilidade (melhor para compliance). Application logs (estruturados no backend) são complementares para debugging.

2. **Performance:** `audit_log` pode crescer rapidamente (1.000+ inserções/dia). Índices e particionamento por `created_at` são essenciais.

3. **GDPR/LGPD Art. 17 (Right to Be Forgotten):** Logs de auditoria são **obrigatorios** de manter para compliance. Não podem ser eliminados a pedido do data subject — apenas mascarados ou expirados após 12 meses. Documente isto.

4. **Escalabilidade futura:** Se volumes crescerem (> 1M eventos/mês), considerar:
   - Particionamento de `audit_log` por month
   - Archiving em coldStorage após 12 meses
   - Data Lake para análise histórica

---

**Estimativa:** L (2–3 dias) — Triggers + RLS + views/exports  
**Complexidade:** Média — SQL avançado (JSONB, triggers), data compliance exigem atenção  
**Risco:** Baixo — Feature isolada, sem impacto em fluxos existentes
