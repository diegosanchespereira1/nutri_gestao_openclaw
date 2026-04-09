# Story 11.5: Portabilidade de Dados do Profissional

## Contexto

Story 11.4 implementou DSAR (Data Subject Access Request) para dados de **pacientes**. Story 11.5 implementa Data Portability para dados do **profissional** (nutricionista).

LGPD Art. 20 garante ao titular o direito de obter uma cópia dos seus dados pessoais em formato estruturado, interoperável e portável.

## Objetivo

Após Story 11.5, o profissional será capaz de:
- Acessar uma página de "Meus Dados" ou "Data Portability"
- Clicar um botão para gerar um pacote completo com todos os seus dados em formatos abertos (JSON, CSV)
- Baixar o pacote contendo:
  - Perfil profissional (nome, CRN, email, contato)
  - Clientes cadastrados (PF/PJ)
  - Estabelecimentos
  - Pacientes (referências apenas, dados completos em DSAR paciente)
  - Consentimentos de pacientes que gerencia
  - Configurações e preferências
  - Histórico de atividades (opcional)
- Demonstrar compliance com LGPD Art. 20 (Data Portability)

## Stack & Convenções

- **Framework:** Next.js 15 App Router, TypeScript strict
- **Styling:** Tailwind CSS + shadcn/ui (Base UI)
- **Auth:** @supabase/ssr (server-side session)
- **Database:** Supabase PostgreSQL com RLS
- **Rota do módulo:** `app/(app)/configuracoes/portabilidade/` (nova rota)
- **Export Formats:** JSON (estruturado), CSV (múltiplas abas)

## Requisitos Funcionais

- **FR65:** Profissional pode exportar todos os seus dados da plataforma em formato aberto a qualquer momento
- **LGPD Art. 20:** Direito de Portabilidade — dados em formato estruturado, interoperável, legível
- **Rastreabilidade:** Cada export registado em `audit_log`
- **Dados inclusos:**
  - Perfil do profissional
  - Clientes (PF/PJ)
  - Estabelecimentos
  - Pacientes (lista + referências)
  - Consentimentos do profissional (se aplicável)
  - Configurações
  - Sumário de métricas (opcional)

## Critérios de Aceitação

### Geração de Pacote de Portabilidade

**Given** profissional autenticado acessa `/app/configuracoes/portabilidade/`  
**When** clica "Gerar Pacote de Dados"  
**Then** sistema compila dados em tempo real:
- Tabela `users` / auth (perfil)
- Tabela `clients` (clientes PF/PJ)
- Tabela `establishments` (estabelecimentos)
- Tabela `patients` (lista de pacientes)
- Tabela `consent_records` (consentimentos que gerencia)
- Tabela `settings` (configurações de preferência)

**And** pacote inclui timestamp de geração e número de registos por seção

### Formatos de Exportação

**Given** pacote gerado  
**When** profissional clica "Baixar como JSON" / "CSV"  
**Then** arquivo é baixado com nome: `MEUS_DADOS_[profissional_id]_[data].json|csv`

- **JSON:** Estrutura hierárquica com seções (RECOMENDADO — portável entre sistemas)
- **CSV:** Versão tabular com abas separadas (importável em Excel)

### Rastreabilidade

**Given** qualquer export de portabilidade  
**Then** evento é registado em `audit_log`:
- `operation: 'DATA_PORTABILITY_EXPORT'`
- `table_name: 'users'` (ou similar)
- `new_values: { format: 'json|csv', records_count: N, ... }`

### Isolamento Tenancy

**Given** profissional A acessa portabilidade  
**When** tenta exportar dados de profissional B  
**Then** sistema nega acesso (Auth + RLS)  
**And** tentativa é registada em audit_log como suspeita

## Tarefas de Implementação

### Backend / Banco de Dados

- [ ] **Server Action:** `generateProfessionalDataPortability(userId?)`
  - Buscar dados em: users, clients, establishments, patients, consent_records, settings
  - Compilar estrutura hierárquica
  - Contar registos por seção para sumário
  - Retornar objeto JSON estruturado

- [ ] **Server Actions para formatação:**
  - `exportPortabilityAsJson(userId?)` — retorna JSON estruturado
  - `exportPortabilityAsCsv(userId?)` — transforma em CSV com abas

- [ ] **Auditoria:** Registar cada export em `audit_log`

### Frontend

- [ ] **Página de Portabilidade:** `app/(app)/configuracoes/portabilidade/page.tsx`
  - Informações sobre LGPD Art. 20
  - Botões de ação: "Gerar Pacote", "Baixar JSON", "Baixar CSV"
  - Indicador de progresso durante geração
  - Sumário do pacote (quantos registos em cada seção)
  - Última data de export (se houver histórico)

- [ ] **Componente DataPortabilityGenerator:** `components/settings/data-portability-generator.tsx`
  - Similar ao DsarGenerator (Story 11.4), mas para profissional
  - Seletor de formato (JSON/CSV)
  - Botão "Gerar e Baixar"
  - Loading state + toast de sucesso

- [ ] **Integração no menu:** Adicionar link em "Configurações" > "Portabilidade"

### Segurança & Compliance

- [ ] **Auth:** Validar que é o próprio profissional solicitando seus dados
- [ ] **RLS:** Verificar isolamento de tenant
- [ ] **Audit Log:** Cada export registado
- [ ] **Mascaramento:** CPF/datas em campos sensíveis (herdado de Story 11.2)
- [ ] **GDPR/LGPD:** Documentar processamento em `legal/portabilidade.md`

## Arquivos a Criar/Modificar

### Criar

- `lib/actions/portability.ts` — Server Actions para portabilidade
- `lib/types/portability.ts` — tipos para estrutura de portabilidade
- `components/settings/data-portability-generator.tsx` — interface
- `app/(app)/configuracoes/portabilidade/page.tsx` — página principal

### Modificar

- `app/(app)/configuracoes/page.tsx` — adicionar link para portabilidade
- `components/app-shell.tsx` — adicionar item "Portabilidade" no menu (se for sidebar)
- `lib/actions/audit.ts` — integração com audit logging (minor)

## Definição de Pronto (DoD)

- [ ] **Código TypeScript:** `npx tsc --noEmit` sem erros
- [ ] **Auth:** Validado que profissional só vê seus próprios dados
- [ ] **Critérios de Aceitação:** Todos atendidos (geração, exportação, auditoria)
- [ ] **Formatos:** JSON, CSV funcionando
- [ ] **Auditoria:** Cada export registado em audit_log
- [ ] **Responsivo:** Funciona em mobile (375px) e desktop (1280px)
- [ ] **Sprint Status:** Atualizar `sprint-status.yaml`: `11-5-portabilidade-dados-profissional: done`
- [ ] **Commit:** Código commitado com mensagem referenciando FR65, Story 11.5, LGPD Art. 20

## Notas Técnicas

### Estrutura de Dados de Portabilidade

```json
{
  "metadata": {
    "generated_at": "2026-04-09T23:00:00Z",
    "generated_by": "user_id",
    "version": "1.0",
    "lgpd_article": "Art. 20"
  },
  "professional": {
    "id": "user_id",
    "full_name": "...",
    "email": "...",
    "crn": "...",
    "phone": "...",
    "created_at": "2026-01-01T...",
    "subscription_plan": "...",
    "is_active": true
  },
  "clients": {
    "count": 5,
    "data": [
      {
        "id": "client_id",
        "name": "...",
        "type": "PF|PJ",
        "document": "***.***.***-XX",  // mascarado
        "created_at": "..."
      }
    ]
  },
  "establishments": {
    "count": 3,
    "data": [
      {
        "id": "establishment_id",
        "name": "...",
        "type": "hospital|escola|...",
        "client_id": "..."
      }
    ]
  },
  "patients": {
    "count": 25,
    "data": [
      {
        "id": "patient_id",
        "full_name": "...",
        "linked_to": "client_id|establishment_id"
      }
    ]
  },
  "consents": {
    "count": 10,
    "data": [
      {
        "patient_id": "...",
        "type": "uso_dados",
        "status": "active"
      }
    ]
  },
  "settings": {
    "theme": "light|dark",
    "language": "pt-PT|en-US",
    "email_notifications": true,
    "push_notifications": false
  }
}
```

### Formatação CSV

```
=== DADOS PESSOAIS ===
Campo,Valor
Nome,João Silva
Email,joao@example.com
CRN,123456
...

=== CLIENTES ===
ID,Nome,Tipo,Documento
client_1,Empresa X,PJ,**.***.***-XX
...

=== ESTABELECIMENTOS ===
ID,Nome,Tipo,Cliente ID
est_1,Hospital Y,hospital,client_1
...

=== PACIENTES ===
ID,Nome,Vinculado a
pat_1,Maria Silva,client_1
...

=== CONSENTIMENTOS ===
Paciente ID,Tipo,Status
pat_1,uso_dados,active
...

=== CONFIGURAÇÕES ===
Tema,Idioma,Notificações Email
light,pt-PT,true
```

### Comparação com Story 11.4 (DSAR Paciente)

| Aspecto | Story 11.4 (DSAR) | Story 11.5 (Portabilidade) |
|---------|---|---|
| **Titular** | Paciente | Profissional |
| **Dados** | Perfil + avaliações + auditoria | Perfil + clientes + estabelecimentos + pacientes |
| **Auditoria** | Histórico de acesso completo | Apenas configurações + metadados |
| **Formato** | JSON, CSV | JSON, CSV |
| **Email** | Enviado automaticamente | Manual (não enviar por default) |
| **Contexto Legal** | LGPD Art. 18 (Direito de Acesso) | LGPD Art. 20 (Portabilidade) |

## Dependências

- **Story 11.2:** Auditoria (audit_log) — para registar exports
- **Story 11.4:** DSAR Report — reutilizar padrões de geração/exportação
- **Nenhuma dependência crítica** — pode ser implementada independente

## Sequência de Implementação Sugerida

1. **Tipos** → `lib/types/portability.ts`
2. **Server Actions** → `lib/actions/portability.ts`
3. **Componentes** → `data-portability-generator.tsx`
4. **Página** → `app/(app)/configuracoes/portabilidade/page.tsx`
5. **Navegação** → Adicionar link em menu/sidebar
6. **Testes & Auditoria** → Registar em audit_log
7. **Commit & Review**

## Referências

- **LGPD Art. 20:** Direito de Portabilidade — dados em formato estruturado, interoperável, legível
- **Story 11.4:** DSAR Report — reutilizar padrões de geração/exportação
- **Story 11.7:** Exclusão de Conta — portabilidade é pré-requisito para exclusão (permitir export antes de deletar)
- **GDPR Art. 20:** Similar à LGPD Art. 20 (ambas requerem portabilidade)
