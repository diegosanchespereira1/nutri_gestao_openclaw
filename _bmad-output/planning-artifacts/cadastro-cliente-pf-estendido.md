# Cadastro de cliente PF estendido — especificação (histórico)

**Data:** 2026-04-03 (revisão fluxo e glossário na mesma data)  
**Contexto:** O formulário inicial de cliente cobria apenas identificação contratual (tipo PF/PJ, nomes, documento, contactos, notas). Em nutrição clínica/consultoria particular, o **titular do contrato** nem sempre coincide com a **pessoa atendida**, e é frequente existir **responsável legal e financeiro** distinto (ex.: menor, tutela, familiar que paga). São necessários dados clínico-administrativos iniciais e arquivo de exames.

---

## 0. Glossário (linguagem da app vs. mundo real)

Objetivo: **um contrato na carteira** não é a mesma coisa que **uma pessoa no prontuário** nem que **um edifício**. Na UI e na documentação interna usamos termos assim:

| Termo na app | O que é | O que *não* é |
|--------------|---------|----------------|
| **Cliente** (lista *Clientes*) | Registo de **contrato / carteira** com o teu serviço — PF ou PJ. É o “ficheiro comercial + contexto” onde depois ligas unidades e pessoas. | Não confundir com “só o paciente”. Um cliente PF pode ser uma família ou um titular que paga por outrem. |
| **Pessoa física (PF)** | Contrato com **uma pessoa** (particular). Muitas vezes titular = quem come consultas; pode ser diferente (ex.: pai titular, criança atendida). | Não é um “tipo de paciente”; é o **tipo de contrato**. |
| **Pessoa jurídica (PJ)** | **Empresa ou organização** que contrata (escola, clínica, empresa, associação). É a **entidade contratante**, não o lugar físico nem uma pessoa. | O PJ **não** é o estabelecimento. O PJ *tem* estabelecimentos. |
| **Estabelecimento** | **Unidade / local de atuação** vinculado a um **cliente PJ** (ex.: “Escola X — unidade Sul”). Serve portarias, visitas e pacientes institucionais. | Relação 1:1 — cada cliente PJ tem **exatamente 1 estabelecimento** (1 CNPJ = 1 cliente = 1 estabelecimento). Para múltiplas unidades físicas, criar um cliente distinto por unidade. |
| **Paciente** | **Pessoa com ficha clínica** no sistema (evolução, avaliações, histórico). Pode estar ligada a um cliente PF **sem** estabelecimento ou a um **estabelecimento** de um PJ. | “Ter paciente” não exige PJ: em PF, o fluxo típico é criar o cliente e depois **Pacientes** no mesmo registo. |

**Regra mental para o utilizador:** *Primeiro defines **com quem é o contrato** (PF ou PJ). Se for PJ, adicionas **o estabelecimento** (exatamente 1 por cliente — 1 CNPJ = 1 cliente); se uma empresa tiver 3 unidades físicas, cadastra 3 clientes distintos. Em qualquer caso, as **pessoas com ficha clínica** são **Pacientes** ligados a esse contexto.*

### 0.1 Fluxo de cadastro (visão em degraus)

1. **Clientes → Novo cliente** — Escolhe **PF ou PJ** e preenche **identificação do contrato** (titular ou razão social, documentos, contactos).
2. **Se PJ** — Depois de guardar, na ficha do cliente: **Estabelecimentos** (unidades onde atuas).  
   **Se PF** — Na mesma ficha pode completar **pessoa atendida e saúde** (aba única: dados pessoais + saúde inicial + responsável) e **exames**; opcionalmente **Pacientes** para mais do que uma pessoa no mesmo contrato.
3. **Pacientes** — Criar/editar ficha clínica da pessoa (prontuário, visitas, etc.), já no contexto certo (PF direto ou estabelecimento).

Microcopy alvo: no primeiro ecrã, reforçar **“contrato / carteira”** onde ajude (ex.: descrição sob o título), sem substituir o termo *Cliente* na navegação (consistência com o menu).

---

## 1. Princípios

| Princípio | Decisão |
|-----------|---------|
| **Cliente PJ** | Mantém-se foco institucional: **sem** bloco clínico no registo do cliente. Pacientes, dados antropométricos e evolução clínica continuam por **estabelecimento → paciente**, como já definido no modelo (FR6–FR11, Story 2.x). |
| **Cliente PF** | O registo pode representar o **contrato com pessoa física** (particular). Permite-se um **perfil da pessoa atendida** e **responsável** no próprio cliente para captura rápida no primeiro contacto, alinhado a fluxos em que o nutricionista trata o PF como “unidade” de contrato e atendimento. |
| **Sobreposição com Paciente** | Para cliente PF já existia a entidade **Paciente** (opcional, sem estabelecimento). Os campos no **cliente** são **atalho de primeiro contacto** (onboarding); a **ficha clínica completa** continua em **Paciente**. Quando há uma só pessoa no contrato, o utilizador pode pensar “é tudo a mesma pessoa” — a app **não obriga** a criar paciente logo; **melhoria futura:** derivar ou sincronizar paciente “principal” a partir do cliente PF. |
| **LGPD / sensível** | Data de nascimento, sexo, restrições, medicação contínua e ficheiros de exames são **dados de saúde ou relacionados**. Mesmo isolamento por `owner_user_id` (tenant), registo de acesso em evoluções futuras, e políticas de **Storage** restritas ao dono do cliente. |

---

## 2. Campos no modelo `clients` (aplicáveis quando `kind = 'pf'`)

Todos opcionais salvo onde a UI indique obrigatoriedade de negócio local.

### 2.1 Pessoa atendida (quando diferente do titular)

- **`attended_full_name`** (texto, opcional): nome completo da pessoa que será acompanhada nutricionalmente. Se vazio, assume-se que a pessoa atendida é o **titular** identificado em `legal_name`.

### 2.2 Dados clínicos básicos (pessoa atendida)

- **`birth_date`** (data, opcional)  
- **`sex`** (`female` \| `male` \| `other`, opcional)  
- **`dietary_restrictions`** (texto longo, opcional): alergias, intolerâncias, restrições culturais/religiosas, preferências relevantes.  
- **`chronic_medications`** (texto longo, opcional): medicamentos de uso contínuo (nome, dose se conhecida — texto livre; não substitui prescrição médica).

### 2.3 Responsável legal e financeiro (quando não é o titular)

Um único bloco para a figura que **representa** e/ou **pagamento** quando difere do titular em `legal_name` / contactos principais.

- **`guardian_full_name`** (opcional)  
- **`guardian_document_id`** (opcional; texto, sem validação estrita de CPF nesta fase)  
- **`guardian_email`**, **`guardian_phone`** (opcionais)  
- **`guardian_relationship`** (opcional): ex. “Mãe”, “Tutor legal”, “Filho responsável”.

**Regra de uso:** Se todos os campos de responsável estiverem vazios, entende-se que o titular (`legal_name`, `email`, `phone`, `document_id`) é também o responsável legal/financeiro pela pessoa atendida.

---

## 3. Exames (anteriores e pedidos/agendados)

Não armazenar binários na tabela relacional: usar **Supabase Storage** + metadados.

### 3.1 Tabela `client_exam_documents`

- Ligação a `clients.id` (cascade on delete).  
- **`category`**: `previous` (exames já realizados / histórico) ou `scheduled` (pedidos, agendados ou “a realizar”).  
- **`storage_path`**, **`original_filename`**, **`content_type`**, **`file_size`** (opcional).  
- **`notes`** (opcional): ex. data do exame, laboratório.

### 3.2 Bucket `client-exams`

- Privado (`public = false`).  
- Caminho sugerido: `{owner_user_id}/{client_id}/{uuid}_{filename_sanitizado}`.  
- Políticas: apenas o profissional dono do cliente (via prefixo `auth.uid()` e validação na app) pode inserir/ler/apagar objetos coerentes com os seus clientes.

---

## 4. Interface (resumo)

**Objetivo UX (rev.):** dados **pessoais da pessoa atendida** (nome, nascimento, sexo) **no mesmo sítio** que o resto do perfil inicial de consulta, para menos saltos entre separadores.

- **PF — separadores sugeridos (tabs):**  
  1. **Identificação** — Tipo PF/PJ, **titular do contrato** (nome, documento, email, telefone).  
  2. **Pessoa atendida e saúde** — *Um único separador* com fieldsets nesta ordem: **Quem recebe a consulta** (nome se ≠ titular) → **Dados pessoais** (data nascimento, sexo) → **Notas de saúde iniciais** (restrições, medicação contínua) → **Responsável legal/financeiro** (só quando ≠ titular).  
  3. **Exames** — anexos.  
  4. **Notas** — internas.  

- **PJ:** apenas **Identificação** + **Notas** (blocos PF ocultos). Depois, na ficha: **Estabelecimentos**.  

- **Textos de ajuda:** menores e tutela; **titular** = contrato e fatura; **pessoa atendida** = quem vem à consulta; **PJ** = quem assina o contrato, **não** a unidade física (essa é **Estabelecimento**).

---

## 5. Rastreio em relação ao PRD (sugestão de novos FR)

Para incorporação futura no `prd.md`:

- **FR-X:** Cliente PF pode registar data de nascimento, sexo, restrições alimentares e medicação contínua da pessoa atendida.  
- **FR-Y:** Cliente PF pode registar responsável legal e financeiro quando distinto do titular.  
- **FR-Z:** Cliente PF pode anexar documentos classificados como exames anteriores ou exames pedidos/agendados, com metadados e armazenamento seguro.

---

## 6. Histórico de revisões

| Data | Alteração |
|------|-----------|
| 2026-04-03 | Primeira versão: especificação e alinhamento modelo dados + storage + UI. |
| 2026-04-03 | Glossário (cliente/contrato, PJ vs estabelecimento, paciente), fluxo em degraus, fusão UI **Atendimento** + **Clínico** num separador **Pessoa atendida e saúde** com ordem de fieldsets otimizada para dados pessoais juntos. |
