# Plano de UX — Visão nutricional consolidada da escola

**Autor:** Sally (UX) com Diego  
**Data:** 2026-09-07  
**Status:** pronto para revisão do stakeholder  
**Escopo:** escolas apenas (`clients.kind = 'pj'` e `business_segment = 'escola'`)  
**DS:** NutriGestão 2.0 (`PageLayout`, `PageHeader`, tokens teal, semáforo já usado na avaliação infantil)

---

## 1. A cena

A nutricionista abre a Escola São José. Não quer 180 laudos. A diretora perguntou:

> Quantos avaliámos? Quantos ainda não? Nesta turma, quantos estão adequados neste indicador — e qual é a média de idade?

Ela precisa de **um retrato da casa**, não do aluno. O laudo individual continua no paciente. Esta página é o irmão consolidado: as mesmas classificações da avaliação, **contadas** para o grupo.

---

## 2. Decisões fechadas

| # | Decisão |
|---|---------|
| 1 | Entram **todos** os pacientes da escola. O consolidado mostra quantos **ainda não têm avaliação**. |
| 2 | De cada aluno usa-se **sempre a avaliação infantil mais recente**. |
| 3 | Há vista da **escola inteira** e recorte por **série/turma**, com **média de idade** em cada recorte. |
| 4 | A tela é a fonte da verdade. A partir dela: **Salvar PDF** e **Imprimir**. |

Fora deste recorte: clínicas, laudos individuais, relatório por aluno (já existe plano à parte em `docs/relatorio-avaliacao-escolar-plano.md`).

---

## 3. O que já existe (e o que isto não é)

| Superfície | Papel | Relação com esta página |
|------------|--------|-------------------------|
| Avaliação do paciente | Classifica cada indicador (SISVAN / OMS) | **Fonte** dos números |
| Laudo PDF do aluno | Retrato de **uma** criança | Não misturar nesta tela |
| Plano “relatório escolar por série” (`docs/relatorio-avaliacao-escolar-plano.md`) | Lista **aluno a aluno** (resumo ou completo) | Irmão, não substituto |
| `client_school_grades` + `patients.school_grade_id` | Série/turma da escola | **Agrupamento** desta vista |
| Edição do cliente-escola | Cadastro + bloco “Séries / turmas” | **Porta de entrada** |

Série e turma no produto são **um único cadastro** (“Série / turma”, ex.: *Maternal II*, *3º ano B*). Não há dois campos separados. O recorte usa essa lista.

---

## 4. Arquitetura da informação

```
Cliente escola (editar)
  └─ [Visão nutricional da escola]  →  /clientes/[id]/visao-nutricional

/clientes/[id]/visao-nutricional
  ├─ Cabeçalho (escola + data de geração)
  ├─ Filtro: Escola inteira | uma série/turma
  ├─ Cobertura (totais + sem avaliação + média de idade)
  ├─ Um bloco por indicador (contagem das faixas SISVAN)
  └─ Tabela por série/turma (quando o filtro é “escola inteira”)
        └─ toque na linha → mesmo ecrã filtrado nessa série/turma
```

Sem item novo na sidebar. O contexto ativo é o **cliente escola**. Rota só resolve se o cliente for escola; caso contrário, voltar à ficha do cliente.

PDF: `/clientes/[id]/visao-nutricional/pdf` (mesmo recorte do filtro na query, ex. `?serie=`).

---

## 5. Regras dos números (o utilizador precisa confiar)

### Universo

- Pacientes ligados àquela escola (`patients.client_id`).
- Sem exclusão silenciosa.

### Avaliação

- Só `patient_child_assessments`.
- Por aluno: a linha com `recorded_at` mais recente.
- Aluno sem nenhuma linha → entra em **Sem avaliação**. Não entra em nenhum gráfico de indicador.

### Indicador

Contar a **classificação já gravada** no `results` da avaliação mais recente. Não recalcular rótulos novos (“nutrido / desnutrido”).

“Nutrido” na conversa da diretora = faixa **adequada / eutrófica** daquele indicador (semaforo verde). As outras faixas aparecem com o nome oficial (baixo IMC, sobrepeso, obesidade, baixa estatura, etc.).

Aluno avaliado mas **sem aquele indicador** (idade fora da tabela, medida em falta, `outOfRange`) → faixa **Sem este indicador**. Assim o total do bloco = avaliados daquele recorte.

Indicadores extra (CB/I, PCT/I, SE/I, PC/I) só aparecem se **pelo menos um** aluno do recorte tiver resultado. P/I, E/I e IMC/I aparecem sempre (núcleo escolar).

### Média de idade

- Idade **hoje**, a partir de `birth_date` (o que a escola pergunta: “qual a média desta turma?”).
- Entram todos os pacientes do recorte **com data de nascimento**, tenham ou não avaliação.
- Sem `birth_date` → **não entram na média**; o cartão mostra “sem data de nascimento: N”.
- Exibir em linguagem humana: **4 anos e 3 meses** (média em meses, arredondada ao mês).
- Números em `tabular-nums`.

### Série/turma

- Agrupa por `school_grade_id`.
- `null` → linha/filtro **Sem série definida** (nunca esconder).
- Ordem: `position` das séries cadastradas; “Sem série definida” por último.

---

## 6. A tela

### Cabeçalho (`PageHeader`)

| | |
|--|--|
| Voltar | Ficha da escola (`/clientes/[id]/editar`) |
| Título | Visão nutricional da escola |
| Descrição | Avaliação mais recente de cada aluno · {nome da escola} |
| Ações | **Imprimir** · **Salvar PDF** |

Imprimir = `window.print()` com CSS de impressão (esconde sidebar, tabs, botões).  
Salvar PDF = descarrega o mesmo retrato (escola + filtro ativo), com rodapé: profissional, data/hora, nome da escola.

### Filtro

Segmented control ou `Select`:

- **Escola inteira** (padrão)
- Uma opção por série/turma + **Sem série definida** (só se existirem alunos nessa situação)

Mudar o filtro atualiza cobertura, indicadores e esconde a tabela-resumo (essa tabela só faz sentido na vista escola).

### Fileira de cobertura (mini-KPIs)

Quatro cartões, valor grande + rótulo:

| Card | Valor |
|------|--------|
| Alunos na escola / na turma | total do recorte |
| Avaliados | com ≥ 1 avaliação infantil |
| Sem avaliação | total − avaliados (nunca esconder o zero) |
| Média de idade | “4 anos e 3 meses” + hint se houver N sem nascimento |

No telemóvel: grelha 2×2. No desktop: uma fileira.

Percentagem de cobertura (ex. “82% avaliados”) pode ir como texto pequeno no card Avaliados — não é um quinto card.

### Blocos por indicador

Cada indicador é um `Card`:

1. Título: nome + sigla (`IMC para idade · IMC/I`)
2. Barra empilhada horizontal (proporção das faixas) **e** lista de contagens ao lado/abaixo
3. Cada faixa: cor do semáforo já usada na avaliação **+ texto** (nunca só cor)
4. Ordem das faixas: a mesma lógica clínica do motor (baixo → adequado → elevado / sobrepeso → obesidade), depois **Sem este indicador**

Exemplo que a diretora lê em 5 segundos:

> **IMC para idade**  
> Adequado ou eutrófico — 120  
> Baixo IMC — 25  
> Sobrepeso — 20  
> Obesidade — 15  
> Sem este indicador — 0

Totais do bloco = número de **avaliados** do recorte (não o total de alunos). Os “sem avaliação” ficam só no KPI de cobertura — para não parecer que “sem avaliação” é uma classificação nutricional.

### Tabela por série/turma (só na vista “Escola inteira”)

| Série / turma | Alunos | Avaliados | Sem avaliação | Média de idade |
|---------------|--------|-----------|---------------|----------------|
| Maternal II   | 28     | 26        | 2             | 3 anos e 8 meses |
| 3º ano B      | 31     | 31        | 0             | 8 anos e 2 meses |
| Sem série definida | 4 | 1     | 3             | — |

Linha clicável → aplica o filtro dessa série/turma (mesmo ecrã, scroll ao topo).  
Sem drill-down para nomes de alunos nesta versão (isso é o laudo / a lista de pacientes).

### Estados

| Estado | Tratamento |
|--------|------------|
| Escola sem pacientes | `EmptyState`: “Ainda não há alunos nesta escola.” CTA: ver pacientes / cadastrar |
| Há alunos, ninguém avaliado | KPIs (avaliados 0, sem avaliação = total) + indicadores vazios com texto: “Nenhuma avaliação registada. Os totais acima já mostram quem falta.” |
| Série sem alunos | Não listar no filtro (exceto se for a série ativa por URL residual → empty da série) |
| Loading | skeleton dos 4 KPIs + 3 cards de indicador |
| Cliente não é escola | redirect para a ficha; esta rota não existe para clínica/hospital |
| PDF a gerar | botão em *A gerar…*; falha com “Tentar outra vez” (padrão da spec: assíncrono visível) |

---

## 7. Entrada no produto

Na ficha da escola (`/clientes/[id]/editar`), junto do bloco **Séries / turmas** (já só visível quando `business_segment = 'escola'`):

- Botão secundário/outline: **Ver visão nutricional**
- Opcional no header da ficha, à direita: o mesmo CTA (visível no desktop; no mobile fica no bloco de séries)

Não criar tab nova ao lado de Dados / Financeiro / Checklists — aquela navegação é cadastro, não relatório.

---

## 8. Responsivo e impressão

### Mobile (375)

- Header empilhado; PDF e Imprimir em coluna, alvos ≥ 44px
- KPIs 2×2
- Indicadores em coluna única; barra + lista de faixas empilhadas
- Tabela de séries: cards por linha (não tabela apertada)

### Desktop (1280)

- Header em linha
- KPIs numa fileira
- Indicadores em grelha 2 colunas
- Tabela real, números alinhados à direita

### Impressão / PDF

- Cabeçalho: logo do profissional (se existir) + nome da escola + “Visão nutricional consolidada” + recorte (escola ou série) + data
- Mesmos números da tela; sem navegação
- Quebra de página entre indicadores se necessário; não cortar um card ao meio
- Rodapé: “Gerado no NutriGestão em {data} · {profissional}”
- Sem nomes de alunos (LGPD: este retrato é agregado)

---

## 9. Fora de âmbito (v1)

- Clínica / outro segmento
- Lista nominativa ao clicar numa faixa (ex.: “ver os 15 com obesidade”)
- Comparar duas datas / evolução da escola no tempo
- Escolher outra avaliação que não a mais recente
- Recalcular idade na data da avaliação (idade clínica) — fica nota para v2 se a nutricionista pedir
- Relatório aluno-a-aluno (plano já existente, outro entregável)

---

## 10. Critérios de aceite da experiência

1. Na escola, a profissional chega à visão em **um toque** a partir da ficha.
2. Em **menos de 10 segundos** lê: quantos alunos, quantos avaliados, quantos faltam, média de idade.
3. Cada indicador responde: **quantos em cada faixa oficial**, sem rótulo inventado.
4. Filtrar uma série/turma muda cobertura, idade e indicadores; a soma das séries fecha com o total da escola (incluindo “Sem série definida”).
5. **Imprimir** e **Salvar PDF** reproduzem o mesmo retrato que está no ecrã, sem nomes de crianças.
