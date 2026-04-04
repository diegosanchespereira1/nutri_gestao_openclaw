# Teste de usabilidade — cadastro de cliente (2 utilizadores)

**Data do artefacto:** 2026-04-03  
**Contexto:** Formulário de novo/editar cliente com separação por **tabs** (Identificação, Pessoa atendida e saúde, Exames, Notas). O separador **Pessoa atendida e saúde** agrega o antigo Atendimento + Clínico.  
**Objetivo:** Validar se o fluxo reduz carga cognitiva e se o botão **Guardar** global é compreendido.

---

## 1. Como usar este documento

| Fase | O que fazer |
|------|-------------|
| **Com equipe** | Conduzir **2 sessões** (15–25 min cada) com o roteiro abaixo, gravar áudio/vídeo com consentimento, preencher a folha de observação. |
| **Pré-sessão** | Ler a **secção 6** (revisão heurística simulada): são achados antecipados para comparar com o que os utilizadores reais disserem. |

**Ambiente:** aplicação em staging ou local, conta de nutricionista válida, dados fictícios (LGPD).

---

## 2. Perfis dos dois participantes

### Participante 1 — “Consultoria particular com menor”

- **Persona:** Nutricionista que atende **cliente PF**; o **titular** é o pai/mãe; a **pessoa atendida** é criança; há **responsável** igual ao titular ou explícito; quer registar **restrição alimentar** e **anexar um PDF** de exame antigo.
- **Objetivo da sessão:** perceber se encontra todos os campos sem se perder nos tabs e se confia que **um único Guardar** grava tudo.

### Participante 2 — “Institucional rápido”

- **Persona:** Nutricionista que só precisa de **cliente PJ** (escola/clínica), razão social, CNPJ opcional, **notas internas**; não usa blocos clínicos.
- **Objetivo da sessão:** perceber se os **dois tabs** (Identificação + Notas) são suficientes e se o switch PF→PJ é óbvio.

**Recrutamento:** 2 profissionais (ou 1 real + 1 proxy interno), preferencialmente com experiência em SaaS ou formulários longos.

---

## 3. Roteiro comum (facilitador)

1. **Contexto (2 min)** — “Estamos a testar o ecrã, não a si. Não há respostas certas ou erradas.”
2. **Pensar em voz alta** — pedir que narre o que espera em cada passo.
3. **Tarefas** — enunciados na secção 4; não ajudar salvo bloqueio total após 1 min (então dica mínima).
4. **Perguntas finais (3 min)**  
   - “Sentiu que precisava de botões ‘Seguinte’ entre tabs?”  
   - “Ficou claro que **Guardar** envia todos os separadores?”  
   - “O que mudaria?”

**Gravação:** opcional; anotar **citações literais** para decisões de produto.

---

## 4. Tarefas por participante

### Participante 1 (PF / menor / exame)

| # | Tarefa | Sucesso |
|---|--------|--------|
| T1 | Ir a **Clientes → Novo cliente**. | Chega ao formulário. |
| T2 | Manter **Pessoa física**; preencher **titular** (nome obrigatório). | Sem erro de validação. |
| T3 | Ir ao tab **Pessoa atendida e saúde**; indicar **nome da criança** como pessoa atendida. | Campo encontrado em &lt; 30 s. |
| T4 | No **mesmo** tab, preencher **data de nascimento** e **uma restrição alimentar** (secções seguintes). | Dados visíveis sem mudar de separador. |
| T5 | Ir ao tab **Exames**; anexar **um ficheiro** (PDF ou imagem pequena). | Input de ficheiro localizado. |
| T6 | Ir a **Notas**; escrever uma nota interna. | — |
| T7 | Clicar **Criar cliente** (ou Guardar). | Redirecionamento ou sucesso sem dúvida sobre “perdi dados noutros tabs”. |

### Participante 2 (PJ / rápido)

| # | Tarefa | Sucesso |
|---|--------|--------|
| T1 | **Novo cliente**; mudar para **Pessoa jurídica**. | Tabs extra (Pessoa atendida e saúde, Exames) **desaparecem**. |
| T2 | Preencher **razão social** e **nome fantasia** opcional. | — |
| T3 | Abrir **Notas**; texto interno. | Tab **Notas** encontrado sem confusão. |
| T4 | **Criar cliente**. | Fluxo completo em poucos minutos. |

---

## 5. Folha de observação (por sessão)

**Participante:** ___ **Data:** ___ **Duração:** ___

| Métrica | Nota (1–5 ou ✓/✗) |
|---------|-------------------|
| Concluiu tarefas sem ajuda | |
| Confiança no “um guardar para tudo” (inferida ou dita) | |
| Nº de hesitações nos tabs | |
| Erros de clique / tab errado | |
| Comentário sobre navegação (tabs vs wizard) | |

**Citações úteis:**  

**Bloqueios:**  

**Ideias de melhoria:**  

---

## 6. Revisão heurística simulada (2 percursos — pré-sessão)

*Esta secção **não substitui** utilizadores reais: simula dois percursos com base na UI atual, para antecipar riscos.*

### 6.1 Percurso A (alinhado ao Participante 1)

| Heurística | Observação | Severidade |
|------------|------------|------------|
| Visibilidade do estado | O texto no cabeçalho do cartão diz que pode preencher por qualquer ordem e guardar no fim — **boa** pista para “um submit”. | Baixa |
| Correspondência com o mundo real | Secções “Titular”, “Quem recebe a consulta”, “Dados pessoais”, “Responsável” alinham com linguagem do domínio. | Baixa |
| Controlo e liberdade | Sem “Seguinte/Anterior”; utilizador pode saltar tabs — **adequado** para peritos; risco de **saltar tab obrigatório implícito** só há `legal_name` required na Identificação. | Média |
| Reconhecimento vs memória | Ícones nos tabs ajudam escaneabilidade; rótulos em português claros. | Baixa |
| Prevenção de erros | Ficheiros só validados no servidor (tamanho); utilizador pode descobrir tarde — aceitável no MVP. | Média |
| **Risco específico** | Utilizador pode não perceber que **inputs de ficheiro** noutro tab entram no mesmo submit até tentar — mitigado pelo texto do rodapé em modo criação. | Média |

### 6.2 Percurso B (alinhado ao Participante 2)

| Heurística | Observação | Severidade |
|------------|------------|------------|
| Flexibilidade | PJ reduz a **2 tabs** — **forte** para fluxo rápido. | Baixa |
| Consistência | Ao mudar PF→PJ, o tab ativo volta a **Identificação** — evita painel “fantasma”; pode **surpreender** se estava a ler outro tab. | Média |
| Eficiência | Poucos cliques até criar cliente PJ. | Baixa |

### 6.3 Recomendações prioritárias (backlog UX)

1. **Pós-teste com reais:** se ≥1 participante duvidar do guardar global, considerar texto explícito no rodapé: *“Inclui todos os separadores.”* (já parcialmente coberto).  
2. Se PF→PJ causar confusão, **toast** ou **microcópia** ao mudar tipo: *“Os separadores Pessoa atendida e Exames foram ocultados.”*  
3. Opcional: botão **“Seguinte tab”** só se os testes reais pedirem wizard; evitar duplicar modelo mental.

---

## 7. Histórico

| Data | Alteração |
|------|-----------|
| 2026-04-03 | Criação: protocolo 2 utilizadores + revisão heurística dupla. |
| 2026-04-03 | Alinhamento à UI: tab única **Pessoa atendida e saúde**; tarefas T3–T4 no mesmo separador. |
