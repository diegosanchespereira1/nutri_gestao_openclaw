# Story 11.4: Relatório de Dados Pessoais (DSAR — Paciente)

## Contexto

Story 11.2 implementou Log de Auditoria (audit_log) registando todas as ações em dados de paciente. Story 11.3 implementou Consentimentos Digitais com evidência LGPD.

Story 11.4 completa o direito de acesso LGPD Art. 18 permitindo que um profissional gere um **relatório completo (DSAR — Data Subject Access Request)** com todos os dados pessoais de um paciente em formatos exportáveis.

Este relatório será:
- Portável em JSON, CSV, e PDF
- Estruturado com seções (perfil, avaliações, visitas, auditoria, consentimentos)
- Enviável por email ao profissional (para repassar ao paciente)
- Rastreado em audit_log para compliance

## Objetivo

Após Story 11.4, o profissional será capaz de:
- Acessar uma página de DSAR (Data Subject Access Request) filtrada por paciente
- Gerar um relatório completo de dados pessoais em um clique
- Exportar o relatório em JSON (estruturado), CSV (tabular), e PDF (legível)
- Enviar o relatório por email automaticamente ao profissional (que repassa ao paciente)
- Demonstrar compliance com LGPD Art. 18 (Direito de Acesso) em auditorias

## Stack & Convenções

- **Framework:** Next.js 15 App Router, TypeScript strict
- **Styling:** Tailwind CSS + shadcn/ui (Base UI)
- **Auth:** @supabase/ssr (server-side session)
- **Database:** Supabase PostgreSQL com RLS
- **Rota do módulo:** `app/(app)/auditoria/dsar/` (reutilizar estrutura de Story 11.2)
- **PDF Generation:** Supabase Edge Function + python-pdfkit OU jsPDF client-side
- **Email:** Resend (já integrado em Story 4.9)

## Requisitos Funcionais

- **FR64:** Sistema permite ao profissional gerar relatório de dados pessoais de um paciente para atendimento de direitos LGPD
- **FR62:** Log de auditoria das ações (Story 11.2 — já implementado, apenas integrar)
- **FR63:** Consentimentos registados aparecem no relatório (Story 11.3 — já implementado)
- **NFR15:** Retenção e mascaramento (já em Story 11.2)
- **Rastreabilidade:** Geração do DSAR registada em audit_log

## Critérios de Aceitação

### Geração de Relatório Completo

**Given** profissional autenticado acessa página DSAR  
**When** seleciona um paciente e clica "Gerar Relatório"  
**Then** sistema compila dados em tempo real de todas as tabelas relacionadas:
- `patients` (perfil, contato, data nascimento)
- `patient_nutrition_assessments` (avaliações)
- `visits` (histórico de visitas — se Story 4.2 implementada)
- `audit_log` (histórico de acesso/mutações)
- `consent_records` (consentimentos registados)

**And** relatório inclui timestamp de geração e hash de integridade (opcional)

### Formatos de Exportação

**Given** relatório gerado  
**When** profissional clica em "Exportar como JSON" / "CSV" / "PDF"  
**Then** arquivo é baixado com nome: `DSAR_[paciente_id]_[data].json|csv|pdf`

- **JSON:** Estrutura hierárquica com seções
- **CSV:** Versão tabular para importação em Excel (com pivot se necessário)
- **PDF:** Versão legível com logo, cabeçalho, seções colapsáveis

### Envio por Email

**Given** relatório gerado  
**When** profissional clica "Enviar por Email"  
**Then** relatório é enviado para email do profissional (com cópia em anexo JSON/PDF)  
**And** email inclui contexto LGPD explicando o que é DSAR

### Rastreabilidade

**Given** qualquer geração de DSAR  
**Then** evento é registado em `audit_log` com:
- `operation: 'GENERATE_DSAR'`
- `record_id: patient_id`
- `new_values: { export_format: 'json|csv|pdf', generated_at, ... }`

### Isolamento Tenancy

**Given** profissional A acessa DSAR  
**When** tenta gerar relatório de paciente de profissional B  
**Then** sistema nega acesso (RLS + validação)  
**And** evento é registado como tentativa de acesso negado

## Tarefas de Implementação

### Backend / Banco de Dados

- [ ] **Server Action expandido:** `generateCompletePatientDsar(patientId)`
  - Buscar dados em: patients, assessments, visits (se Story 4.2+), audit_log, consent_records
  - Compilar estrutura hierárquica (seções com dados)
  - Gerar timestamp e hash de integridade (SHA-256 dos dados para auditoria)
  - Retornar objeto JSON estruturado

- [ ] **Server Action para formatação:**
  - `generateDsarJson(patientId)` — retorna JSON estruturado
  - `generateDsarCsv(patientId)` — transforma em CSV tabular (múltiplas abas)
  - `generateDsarPdf(patientId)` — chama Edge Function ou jsPDF

- [ ] **Edge Function (opcional):** `supabase/functions/generate-dsar-pdf/`
  - Recebe dados JSON
  - Renderiza PDF com formatação legível
  - Inclui logo, cabeçalhos, seções colapsáveis
  - Retorna PDF stream para download

- [ ] **Server Action para email:**
  - `sendDsarByEmail(patientId, format)` — usa Resend
  - Template de email LGPD-compliant explicando DSAR
  - Anexa relatório em formato solicitado
  - Registra envio em audit_log

- [ ] **Auditoria:** Registar cada geração de DSAR em `audit_log`
  - Trigger ou manual em Server Action

### Frontend

- [ ] **Página DSAR expandida:** `app/(app)/auditoria/dsar/page.tsx`
  - Se não existir, criar (Story 11.2 tem página básica, expandir)
  - Seletor de paciente (dropdown com listagem)
  - Botões de ação: "Gerar Relatório", "Exportar", "Enviar Email"
  - Indicador de progresso durante geração
  - Histórico de gerações anteriores (data, formato, status)

- [ ] **Componente DsarGenerator:** `components/auditoria/dsar-generator.tsx`
  - Formulário com seletor de paciente
  - Radio buttons para formato (JSON, CSV, PDF)
  - Checkbox opcional: "Enviar por email após gerar"
  - Button "Gerar e Baixar"
  - Loading state com spinner
  - Toast/alert com resultado (sucesso/erro)

- [ ] **Componente DsarPreview (opcional):** `components/auditoria/dsar-preview.tsx`
  - Exibe sumário do relatório antes de exportar
  - Seções expandíveis (Perfil, Avaliações, Visitas, Auditoria, Consentimentos)
  - Confirmar antes de exportar/enviar email

- [ ] **Integração com Story 11.2:**
  - Reutilizar `audit-log-viewer.tsx` para exibir histórico de acesso
  - Adicionar seção "Dados Compilados" com sumário

### Segurança & Compliance

- [ ] **RLS:** Validar que paciente pertence ao utilizador (server-side, em todas as queries)
- [ ] **Audit Log:** Cada geração de DSAR registada com timestamp, format, resultado
- [ ] **Mascaramento:** CPF, datas de nascimento já mascaradas em audit_log (Story 11.2)
- [ ] **Email Security:** Usar template seguro, sem expor dados sensíveis em subject
- [ ] **Hash de Integridade:** SHA-256 dos dados para permitir verificação posterior
- [ ] **Rastreabilidade:** Log de quem gerou, quando, em qual formato

## Arquivos a Criar/Modificar

### Criar

- `lib/actions/dsar.ts` — Server Actions expandidas para DSAR completo
  - `generateCompletePatientDsar(patientId)` — compila todos os dados
  - `generateDsarJson(patientId)` — exporta JSON
  - `generateDsarCsv(patientId)` — exporta CSV
  - `generateDsarPdf(patientId)` — gera PDF
  - `sendDsarByEmail(patientId, format)` — envia email

- `components/auditoria/dsar-generator.tsx` — interface de geração
- `components/auditoria/dsar-preview.tsx` — preview de dados (opcional)

- `lib/types/dsar.ts` — tipos para estrutura do relatório
  - `DsarCompleteReport`, `DsarSection`, `DsarMetadata`

- `supabase/functions/generate-dsar-pdf/index.ts` (opcional) — Edge Function para PDF

### Modificar

- `app/(app)/auditoria/dsar/page.tsx` — expandir com novo componente DsarGenerator
- `lib/types/consent.ts` — adicionar integração de consentimentos ao DSAR
- `_bmad-output/email-templates/dsar-email.html` (criar se não existir) — template de email

## Definição de Pronto (DoD)

- [ ] **Código TypeScript:** `npx tsc --noEmit` sem erros
- [ ] **RLS:** Validado que paciente pertence ao utilizador (nenhum acesso cruzado)
- [ ] **Critérios de Aceitação:** Todos atendidos (geração, exportação, email, auditoria)
- [ ] **Formatos:** JSON, CSV, PDF funcionando
- [ ] **Email:** Enviando com sucesso (testar com Resend)
- [ ] **Auditoria:** Cada DSAR registado em audit_log
- [ ] **Responsivo:** Funciona em mobile (375px) e desktop (1280px)
- [ ] **Acessibilidade:** Labels, aria-labels, foco visível em formulários
- [ ] **Sprint Status:** Atualizar `sprint-status.yaml`: `11-4-relatorio-dados-pessoais-dsar-paciente: done`
- [ ] **Commit:** Código commitado com mensagem referenciando FR64, Story 11.4, LGPD Art. 18

## Notas Técnicas

### Estrutura de Dados do DSAR

```json
{
  "metadata": {
    "generated_at": "2026-04-09T21:30:00Z",
    "generated_by": "user_id",
    "data_integrity_hash": "sha256(...)",
    "version": "1.0"
  },
  "patient": {
    "id": "uuid",
    "full_name": "...",
    "document_id": "***.***.***-XX",  // masked
    "date_of_birth": "YYYY-**-**",    // masked
    "contact": { ... }
  },
  "assessments": [
    {
      "id": "uuid",
      "assessment_date": "2026-04-01",
      "data": { ... }
    }
  ],
  "visits": [
    {
      "id": "uuid",
      "visit_date": "2026-04-05",
      "checklist_items": [ ... ]
    }
  ],
  "access_history": [
    {
      "timestamp": "2026-04-01T10:00:00Z",
      "user_id": "uuid",
      "user_email": "prof@example.com",
      "operation": "INSERT|UPDATE|DELETE",
      "table_name": "patients|assessments|...",
      "data_changed": { ... }
    }
  ],
  "consents": [
    {
      "id": "uuid",
      "consent_type": "uso_dados",
      "status": "active|revogado",
      "created_at": "2026-03-01T...",
      "revoked_at": null
    }
  ]
}
```

### Formatação CSV

Usar `papaparse` (já instalado):
- Linha 1: Metadados (generated_at, data_integrity_hash)
- Seção 1: Perfil (colunas: field, value)
- Seção 2: Avaliações (colunas: avaliação_id, data, campo, valor)
- Seção 3: Visitas (colunas: visita_id, data, checklist_item, status, notas)
- Seção 4: Histórico de Acesso (colunas: timestamp, user_email, operação, tabela, dados_alterados)
- Seção 5: Consentimentos (colunas: id, tipo, status, data, revogado_em)

### Geração de PDF

**Opção A (Recomendado):** jsPDF client-side
- Usar `jsPDF` (já pode estar instalado via dependências)
- Renderizar em client (rápido, nenhuma Edge Function necessária)
- Limite: máximo 50 páginas (~500KB) — alertar se exceeder

**Opção B:** Edge Function + wkhtmltopdf
- Requisição à Supabase Edge Function
- Edge Function usa `wkhtmltopdf` (não está pré-instalado)
- Mais lento, mas handles grandes volumes

**Recomendação:** Implementar Opção A primeiro; Opção B em Story futura se necessário.

### Email Template

Estrutura LGPD-compliant:
```
Assunto: Seu Relatório de Dados Pessoais (DSAR) — [Nome Paciente]

Corpo:
---
Prezado [Nome do Profissional],

Em resposta a um pedido de acesso a dados pessoais (conforme LGPD Art. 18 — Direito de Acesso), 
segue em anexo o relatório completo de dados pessoais de:

Paciente: [Nome Paciente]
Data de Geração: [timestamp]
Data de Validade: [data + 30 dias ou conforme política]

O relatório contém:
- Dados pessoais cadastrados
- Histórico de avaliações nutricionais
- Histórico de visitas técnicas
- Histórico completo de acesso aos dados (auditoria)
- Consentimentos registados

Para questões sobre seus dados, responda a este email ou entre em contato.

---
Gerado pelo sistema NutriGestão — Compliance LGPD
```

### Rastreabilidade de Envio

Se email enviado:
```sql
insert into audit_log (
  user_id,
  table_name,
  operation,
  record_id,
  new_values
) values (
  auth.uid(),
  'consent_records',  -- ou 'dsar_exports'
  'DSAR_EMAIL_SENT',
  patient_id,
  jsonb_build_object(
    'format', 'json|csv|pdf',
    'sent_to', professional_email,
    'sent_at', now()
  )
);
```

## Dependências

- **Story 11.2:** Auditoria (audit_log) — para exibir histórico de acesso
- **Story 11.3:** Consentimentos — para incluir consentimentos no relatório
- **Story 4.9:** Resend — para envio de email
- **papaparse:** CSV parsing (já instalado)
- **jsPDF (opcional):** PDF generation client-side

## Referências

- **LGPD Art. 18:** Direito de Acesso — titular direito a confirmar se há tratamento de dados
- **LGPD Art. 19:** Direito de Portabilidade — dados em formato aberto, estruturado, legível
- **Story 11.2:** audit_log — integração com histórico de acesso
- **Story 11.3:** consent_records — integração com consentimentos
- **Story 11.5:** Portabilidade do Profissional — semelhante, mas para dados do profissional
- **Story 11.7:** Exclusão de Conta — utiliza DSAR como base para auditoria pré-exclusão

