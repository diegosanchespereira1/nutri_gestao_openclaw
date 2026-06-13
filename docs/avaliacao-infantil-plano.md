# Plano de Desenvolvimento — Avaliação Nutricional Infantil (0–19 anos)

> Status: proposta de implementação · Autor: planejamento técnico · Data: 2026-06-13
> Projeto: NutriGestão SaaS (Next.js 16 + React 19 + TypeScript strict + Supabase/RLS + shadcn/ui + Recharts + Vitest)

## 1. Objetivo

Criar uma nova modalidade de avaliação nutricional **específica para crianças e adolescentes (0–19 anos)**, usando as curvas de referência OMS/SISVAN (tabelas L,M,S + percentis) como fonte de verdade para classificar o estado nutricional. A avaliação deve:

1. Classificar automaticamente cada indicador antropométrico contra a tabela de referência correta (por sexo e idade em meses).
2. Dar **retorno visual imediato** ao profissional — semáforo (verde/amarelo/vermelho) por indicador + curva de crescimento com o ponto da criança plotado.
3. Permitir ao profissional **escolher o critério** de classificação no preenchimento: **percentil** _ou_ **escore-Z** (mutuamente exclusivos — não há opção "ambos").
4. Manter **histórico completo** de todas as avaliações e exibir a **evolução** de cada indicador ao longo do tempo.
5. Reportar o **IMC** e seu enquadramento (magreza / eutrofia / sobrepeso / obesidade conforme a faixa etária).

### Indicadores no escopo (todos os enviados)

| Sigla | Indicador | Faixas (tabelas) | Sexos |
|-------|-----------|------------------|-------|
| P/I | Peso para idade | 0–5 anos, 5–10 anos | M/F |
| C/I | Comprimento para idade (deitado) | 0–2 anos | M/F |
| E/I | Estatura para idade (em pé) | 2–5 anos, 5–19 anos | M/F |
| IMC/I | IMC para idade | 0–2, 2–5, 5–19 anos | M/F |

> **P/E (Peso para Estatura)** foi marcado como desejado ("todos"), mas **não há tabela enviada** para este indicador. Fica como item de backlog (Fase 6): requer a curva OMS Weight-for-length/height adicional. O plano deixa o motor de classificação genérico o suficiente para acomodá-lo sem refatoração.

## 2. Fonte de dados de referência

> **Estado atual dos dados:** as 16 tabelas em `docs/referencias_avaliacao/` são a **edição "percentis"** das curvas OMS. Portanto, **na entrega inicial só o critério _percentil_ tem dados**. O critério _escore-Z_ fica **arquiteturado e pronto para receber as tabelas depois** (ver §2.2) — sem necessidade de refatorar o motor.

As tabelas (edição percentis) seguem o formato OMS:

```
Year: Month  Month   L         M          S        1st 3rd 5th 15th 25th 50th 75th 85th 95th 97th 99th
0: 0         0       0.3487    3.3464     0.14602   2.3 2.5 2.6 ...
```

**Princípio central (definido com o solicitante):** o sistema **segue exatamente os números escritos nos documentos**. Nada é "inventado" ou recalculado por fórmula estatística. As colunas `L`, `M`, `S` que aparecem nos PDFs são **ignoradas** no caminho de percentil — usamos apenas as colunas de percentil.

- **Percentil (disponível agora):** classifica comparando a medida da criança com as **colunas de percentil que constam na tabela** para o sexo e a idade (em meses). Colunas presentes nos PDFs: **P1, P3, P5, P15, P25, P50, P75, P85, P95, P97, P99**.
  - Para cada avaliação o sistema busca a **linha exata da idade em meses** na tabela do indicador/sexo e verifica entre quais percentis a medida cai. Ex.: se o IMC fica entre a coluna P85 e a P97, a criança está na faixa "sobrepeso".
  - O **percentil aproximado da criança** (ex.: "≈P60") é obtido por **interpolação linear entre as duas colunas vizinhas** da própria tabela — continua sendo só aritmética sobre os números do documento.
  - **Cortes extremos:** os documentos vão de P1 a P99. As sub-faixas SISVAN "magreza acentuada" (<P0,1) e "obesidade grave" (>P99,9) **não existem nesses arquivos**, então **não serão exibidas no modo percentil** — a faixa mais baixa exibida é "abaixo de P3" e a mais alta "acima de P97". Essas sub-faixas extremas só serão habilitadas quando você subir as tabelas de escore-Z. (Confirmar os rótulos finais com a nutricionista — ver §9.)
- **Escore-Z (encaixe futuro):** classificará por desvios-padrão (−3/−2/+1/+2/+3) a partir das **tabelas de escore-Z** que você subirá. Enquanto o dataset não existir, o critério aparece desabilitado como "referência ainda não carregada" (ver §4.3 e §7).

### 2.1 Pipeline de ingestão — percentil (script único, offline)

Criar `scripts/reference/build-child-growth-tables.mjs`:

1. Lê cada PDF de `docs/referencias_avaliacao/` (via `pdfplumber`/parser equivalente, ou pré-extração para CSV).
2. Normaliza para um objeto por (indicador × sexo): chave = idade em meses; valor = as **colunas de percentil** daquela linha: `{ p1, p3, p5, p15, p25, p50, p75, p85, p95, p97, p99 }`. (As colunas L,M,S podem ser guardadas inertes apenas para rastreabilidade; não são usadas em runtime.)
3. Emite datasets versionados em `lib/nutrition/child/reference-data/percentile/` como **TS tipado** (não JSON solto), ex.:
   - `imc-for-age.female.ts`, `imc-for-age.male.ts`
   - `weight-for-age.*`, `height-for-age.*`, `length-for-age.*`
4. Gera um **checksum** + contagem de linhas por idade de cada dataset em `reference-data/SOURCES.md`, e um **teste de validação** que confere alguns valores do dataset contra o PDF original (garante que a transcrição está fiel ao documento).

> Os arquivos de dados são **gerados uma vez e versionados** — não há parsing em runtime. App determinístico, testável, sem I/O de PDF em produção.

### 2.2 Encaixe para as referências de escore-Z (a subir depois)

Deixar tudo preparado para o segundo conjunto, **sem código morto que quebre o build**:

1. Diretório irmão `lib/nutrition/child/reference-data/zscore/` com um **`index.ts` que hoje exporta datasets vazios** (mapas vazios por indicador/sexo) + um arquivo `README.md` explicando o formato esperado (mesma chave = idade em meses; valor = as colunas de escore-Z do documento, ex.: `{ sd3neg, sd2neg, sd1neg, sd0, sd1, sd2, sd3 }`).
2. O mesmo script de ingestão ganha um modo `--source=zscore` que, quando você colocar os PDFs/CSVs de escore-Z em `docs/referencias_avaliacao/zscore/`, gera os datasets nesse diretório com a mesma estrutura.
3. Um **registry** central (`reference-data/registry.ts`) expõe `isMethodAvailable(method): boolean` e `getDataset(indicator, sex, method)`. Hoje `isMethodAvailable('zscore') === false`; ao subir as tabelas, passa a `true` automaticamente (basta o dataset deixar de estar vazio).

Assim, ligar o critério escore-Z no futuro é **só popular os arquivos** — nenhuma mudança no motor, nas actions ou na UI.

## 3. Modelo de dados (migração Supabase)

Nova migração `supabase/migrations/<timestamp>_patient_child_assessments.sql`, espelhando o padrão de `patient_geriatric_assessments`.

```sql
create table patient_child_assessments (
  id          uuid        primary key default gen_random_uuid(),
  patient_id  uuid        not null references patients(id) on delete cascade,
  recorded_at timestamptz not null default now(),

  -- Contexto etário (derivado de patients.birth_date + patients.sex, mas
  -- congelado no momento da avaliação para rastreabilidade histórica)
  sex            text    not null check (sex in ('female','male')),
  age_months     integer not null check (age_months >= 0 and age_months <= 240),

  -- Medidas aferidas (entrada manual)
  weight_kg   numeric(6,3) check (weight_kg > 0),
  height_cm   numeric(5,2) check (height_cm > 0),   -- comprimento (deitado) OU estatura (em pé)
  measured_lying boolean,                            -- posição da medida (importante 0–2 vs 2–5)

  -- Critério de classificação escolhido pelo profissional (exclusivo)
  -- Default 'percentile' porque é o único conjunto de referência carregado hoje.
  classification_method text not null default 'percentile'
    check (classification_method in ('percentile','zscore')),

  -- IMC calculado (kg/m²) — congelado
  bmi numeric(5,2),

  -- Resultados congelados por indicador (z-score, percentil e rótulo de classificação)
  -- guardados em JSONB para rastreabilidade do que foi exibido ao profissional
  results jsonb not null default '{}'::jsonb,
  -- shape: { "imc_for_age": {"z": -0.42, "percentile": 33.7, "classification": "eutrofia"}, ... }

  clinical_notes text,
  created_at timestamptz not null default now()
);

comment on table patient_child_assessments is
  'Avaliação nutricional infantil 0–19 anos. Referência: curvas OMS 2006/2007 (LMS) / SISVAN.';
```

**RLS** — replicar exatamente o padrão corrigido em `20260725100003_fix_assessment_rls_for_independent_patients.sql` (verificação por `p.user_id = workspace_account_owner_id()`, suportando paciente independente sem `client_id`):

```sql
alter table patient_child_assessments enable row level security;

create policy "patient_child_select_own" on patient_child_assessments
  for select to authenticated using (
    exists (select 1 from patients p
      where p.id = patient_child_assessments.patient_id
        and p.user_id = (select workspace_account_owner_id())));

create policy "patient_child_insert_own" on patient_child_assessments
  for insert to authenticated with check ( /* idem */ );
-- + update/delete restritas ao owner, conforme política vigente do projeto
```

Índice: `create index on patient_child_assessments (patient_id, recorded_at desc);`

> **Decisão de design — resultados congelados:** percentil/classificação (e, no futuro, z-score) são **determinados na aplicação** a partir das colunas do documento e gravados em `results` no momento do INSERT. Motivo: rastreabilidade clínica (a classificação exibida não muda se a tabela de referência for atualizada depois) e LGPD/auditoria. O recálculo continua disponível em runtime para a tela, mas o histórico preserva o que foi decidido.

## 4. Camada de domínio (funções puras — `lib/nutrition/child/`)

Tudo aqui é **puro e sem I/O**, 100% testável. Estrutura:

```
lib/nutrition/child/
  percentile.ts          # percentileForValue(...) e valueForPercentile(...) por interpolação nas colunas do doc
  percentile.test.ts
  age.ts                 # ageInMonths(birthDate, recordedAt), resolução de tabela por idade
  age.test.ts
  reference.ts           # getReference(indicator, sex, ageMonths, method) → linha de colunas | null
  reference.test.ts
  classify.ts            # classifyByPercentile(...)  [classifyByZScore(...) chega na fase z-score]
  classify.test.ts
  assess.ts              # assessChild(input) → orquestra tudo, devolve resultados por indicador
  assess.test.ts
  reference-data/
    percentile/          # datasets TS gerados (disponível agora — §2.1)
    zscore/              # placeholder vazio + README (encaixe futuro — §2.2)
    registry.ts          # isMethodAvailable(method), getDataset(indicator, sex, method)
  types.ts
```

### 4.1 `percentile.ts` — só aritmética sobre os números do documento

Sem fórmulas estatísticas. Dada a linha de percentis do documento para a idade/sexo (`{p1,p3,...,p99}`):

```ts
// Em qual percentil cai a medida da criança? Interpola linearmente entre as
// duas colunas vizinhas da tabela. Abaixo de P1 → "<P1"; acima de P99 → ">P99".
export function percentileForValue(
  value: number,
  row: PercentileRow,
): { percentile: number | null; below: "P1" | null; above: "P99" | null };

// Valor correspondente a um percentil de coluna (usado para desenhar a curva):
// retorna direto o número tabelado (P3, P15, P50, P85, P97).
export function valueForPercentile(p: PercentileKey, row: PercentileRow): number;
```

> A **curva de crescimento** é desenhada plotando, mês a mês, as próprias colunas P3/P15/P50/P85/P97 do documento — nenhum cálculo, só os valores escritos na tabela.

### 4.2 `classify.ts` — faixas por percentil (somente colunas existentes)

Classificação por **percentil**, usando apenas as colunas P3/P15/P85/P97 que constam nos documentos. Rótulos em PT-BR, **a confirmar com a nutricionista** (ver §9). As sub-faixas extremas (magreza acentuada / obesidade grave) ficam **indisponíveis no modo percentil** e só entram com as tabelas de escore-Z.

**IMC/Idade — 0 a 5 anos:**
| Faixa de Percentil | Classificação |
|---|---|
| < P3 | Magreza |
| ≥ P3 e ≤ P85 | Eutrofia |
| > P85 e ≤ P97 | Risco de sobrepeso |
| > P97 | Sobrepeso/obesidade |

**IMC/Idade — 5 a 19 anos:**
| Faixa de Percentil | Classificação |
|---|---|
| < P3 | Magreza |
| ≥ P3 e ≤ P85 | Eutrofia |
| > P85 e ≤ P97 | Sobrepeso |
| > P97 | Obesidade |

> Quando as tabelas de escore-Z forem carregadas, o modo z-score acrescenta as sub-faixas "magreza acentuada" (z<−3) e "obesidade grave" (z>+3), conforme SISVAN.

**Peso/Idade — 0 a 10 anos:**
| Faixa de Percentil | Classificação |
|---|---|
| < P3 | Baixo peso para a idade |
| ≥ P3 e ≤ P97 | Peso adequado |
| > P97 | Peso elevado para a idade |

**Estatura(Comprimento)/Idade — 0 a 19 anos:**
| Faixa de Percentil | Classificação |
|---|---|
| < P3 | Baixa estatura para a idade |
| ≥ P3 | Estatura adequada para a idade |

Mapa de cor (semáforo) por classificação:
- **Verde** → eutrofia / peso adequado / estatura adequada
- **Amarelo** → magreza, risco de sobrepeso, sobrepeso, baixo peso, baixa estatura, peso elevado
- **Vermelho** → sobrepeso/obesidade, e (no modo z-score) magreza acentuada, obesidade grave, muito baixo peso, muito baixa estatura

### 4.3 `assess.ts` (orquestrador)

```ts
type ChildAssessmentInput = {
  sex: "female" | "male";
  ageMonths: number;
  weightKg: number | null;
  heightCm: number | null;
  measuredLying: boolean | null;
  method: "percentile" | "zscore";
};

type IndicatorResult = {
  indicator: "weight_for_age" | "height_for_age" | "length_for_age" | "bmi_for_age";
  percentile: number | null;   // percentil aproximado da criança (modo percentil)
  z: number | null;            // preenchido só no modo z-score (fase futura)
  classification: string | null;
  color: "green" | "yellow" | "red" | null;
  outOfRange: boolean;          // idade/critério sem cobertura na tabela
};

function assessChild(input: ChildAssessmentInput): {
  bmi: number | null;
  indicators: IndicatorResult[];
};
```

Regras:
- Seleciona automaticamente C/I (0–2, deitado) vs E/I (≥2, em pé); registra a posição de medida informada (a transição aos 24 meses fica explícita no formulário, sem ajustes "mágicos" que fujam do documento).
- `method='percentile'` (hoje): compara a medida com as colunas do documento → `percentile` preenchido, `z` nulo. `method='zscore'`: bloqueado enquanto `registry.isMethodAvailable('zscore')===false` (a UI nem oferece a opção).
- `outOfRange = true` quando a idade excede a cobertura da tabela do indicador (ex.: P/I acima de 10 anos) → UI mostra "fora da faixa de referência" em vez de classificar erroneamente. Os demais indicadores ainda classificam normalmente.

## 5. Tipos (`lib/types/child-assessments.ts`)

`ChildAssessmentRow` (espelha colunas da tabela), `ChildIndicator`, `ChildClassification`, `ClassificationMethod`, e mapas de label/cor (padrão dos `*_LABELS` já usados em `geriatric-assessments.ts`).

## 6. Server actions (`lib/actions/child-assessments.ts`)

Espelhar `adult-nutrition-assessments.ts`:
- `loadChildAssessmentsForPatient(patientId)` → `{ rows }` ordenado por `recorded_at desc`.
- `createChildAssessmentAction(_prev, formData)`:
  1. Auth + `getWorkspaceAccountOwnerId`; valida posse do paciente.
  2. `parseDec` para peso/altura; deriva `age_months` de `birth_date` (fallback: campo manual).
  3. Chama `assessChild(...)` → calcula `bmi` e `results`.
  4. INSERT com `results` congelado; `revalidatePath` da página do paciente.
  - Reutiliza os helpers `parseDec`/validação já existentes; valida `classification_method`.
- `deleteChildAssessmentAction(id)` conforme política do projeto.

## 7. UI / Componentes (`components/pacientes/`)

| Componente | Papel |
|---|---|
| `child-assessment-form.tsx` | Formulário: sexo (default de `patients.sex`), idade (auto de `birth_date`, editável), peso, altura, posição de medida, **seletor de método (percentil _ou_ escore-Z — escolha única)**, notas. Mostra **resultado em tempo real** (client-side `assessChild`) antes de salvar. |
| `child-assessment-result-cards.tsx` | Semáforo: um card por indicador com badge colorido, valor de Z e/ou percentil, e o rótulo (ex.: "IMC/Idade · Eutrofia · z=−0,4 · P34"). |
| `child-growth-curve.tsx` | Curva de crescimento (Recharts): linhas de percentil P3/P15/P50/P85/P97 (geradas via `valueFromZ`) + ponto da criança. Uma curva por indicador (tabs/sub-seleção). |
| `child-assessment-history-item.tsx` | Item de histórico (padrão dos `*-history-item.tsx`). |
| `child-assessments-section.tsx` | Lista + botão "Nova avaliação infantil". |
| `assessment-evolution-charts.tsx` | **Estender** com `ChildChartPoint` (z/percentil de cada indicador ao longo do tempo) — reaproveita `EmptyChart`/tooltip existentes (mín. 2 avaliações). |
| `nutrition-assessments-tabs.tsx` | **Adicionar aba "Avaliação Infantil"**, exibida condicionalmente. |

### 7.1 Gating por idade

Em `nutrition-assessments-tabs.tsx` há o padrão `showAdultTabs`. Adicionar `showChildTab` calculado pela idade do paciente (`birth_date`): criança/adolescente (<19 anos) mostra a aba infantil; ≥19 mostra adulto/idoso. Default seguro quando `birth_date` é nulo: mostrar todas as abas.

## 8. Plano de Testes Unitários (Vitest)

Testes colocados ao lado de cada módulo (padrão `adult-anthropometry.test.ts`). Comando: `npm test` (Vitest). Metas: **cobrir 100% das ramificações de classificação** e garantir que os datasets refletem fielmente os números dos PDFs.

### 8.1 `percentile.test.ts`
- `percentileForValue`: medida igual à coluna P50 → percentil ≈50; igual à P85 → ≈85 (usa valores reais de uma linha do PDF).
- Interpolação: medida entre P50 e P75 → percentil entre 50 e 75, proporcional.
- Abaixo de P1 → `{ below: "P1" }`; acima de P99 → `{ above: "P99" }`.
- `valueForPercentile` devolve exatamente o número tabelado da coluna pedida (sem cálculo).

### 8.2 `age.test.ts`
- `ageInMonths` em datas-limite (nascido no dia, 1 mês exato, viradas de ano bissexto).
- Resolução de tabela: 23m → C/I 0–2; 24m → E/I 2–5; 60m → tabela 5–19; idade > cobertura → `null`/outOfRange.

### 8.3 `reference.test.ts`
- `getReference` retorna a linha de percentis correta para (indicador, sexo, idade) conhecidos extraídos do PDF (conferir alguns valores célula a célula).
- Idade fora de faixa → `null`. Sexo inválido → `null`.
- `registry.isMethodAvailable('percentile') === true` e `('zscore') === false` no estado atual.

### 8.4 `classify.test.ts` (o mais crítico)
- **Tabela parametrizada (`it.each`)** com valores **logo abaixo e logo acima** de cada coluna de corte, por indicador e faixa etária, usando os valores reais de uma linha do PDF:
  - IMC 5–19: medida < P3→magreza; entre P3 e P85→eutrofia; entre P85 e P97→sobrepeso; > P97→obesidade.
  - IMC 0–5: variante com "risco de sobrepeso".
  - P/I 0–10: cortes P3 e P97.
  - E/I e C/I: corte P3.
- Cada classificação mapeia para a **cor** esperada.
- Teste de fronteira: medida exatamente igual ao valor da coluna P3 cai na faixa "≥P3" (eutrofia), não "magreza".

### 8.5 `assess.test.ts` (integração de domínio)
- IMC calculado corretamente e classificado (criança eutrófica, sobrepeso, obesa) com base nas colunas do documento.
- `method='percentile'` → `percentile` preenchido e `z` nulo.
- `method='zscore'` enquanto indisponível → indicador marcado como "referência ainda não carregada" (sem quebrar).
- Idade fora de faixa de um indicador → `outOfRange=true`, demais indicadores ainda classificam.
- Entradas inválidas (peso/altura nulos ou ≤0) → resultado nulo sem exceção.

### 8.6 Parsing do formulário / server action
- Teste unitário dos helpers `parseDec`/derivação de `age_months` e validação de `classification_method` (rejeita valor inválido).
- (RLS coberto separadamente em `vitest.config.rls.ts` — adicionar caso garantindo que paciente de outro workspace não lê/escreve `patient_child_assessments`.)

### 8.7 (Opcional, recomendado) E2E Playwright
- Fluxo: abrir paciente criança → nova avaliação → preencher → ver semáforo + curva → salvar → conferir no histórico e no gráfico de evolução. Segue o padrão de `e2e/`.

## 9. Riscos / pontos a validar antes do merge

1. **Rótulos de classificação**: confirmar com a nutricionista os rótulos das faixas de §4.2 (a literatura varia entre 0–5 e 5–19 anos). É decisão clínica.
2. **Cortes extremos ausentes no documento**: "magreza acentuada" (<P0,1) e "obesidade grave" (>P99,9) não têm coluna nas tabelas de percentil → **não exibidos no modo percentil**, só quando as tabelas de escore-Z forem carregadas.
3. **Posição de medida** na transição dos 24 meses (comprimento deitado × estatura em pé) — registrada explicitamente no formulário.
4. **Fidelidade da transcrição dos PDFs** — checksum + contagem de linhas por mês no script de ingestão e teste que confere uma amostra de células contra o PDF.

## 10. Fases de entrega (stories)

1. **Ingestão de dados (percentil)**: script + datasets TS versionados + `SOURCES.md` + teste de fidelidade ao PDF. Criar também o diretório `zscore/` vazio + `registry.ts` (encaixe futuro). (Fundação, sem UI.)
2. **Motor de domínio**: `percentile`, `age`, `reference`, `classify`, `assess` + **todos os testes unitários** (§8.1–8.5). Critério de aceite: `npm test` verde.
3. **Persistência**: migração + RLS + tipos + server actions + teste RLS.
4. **UI**: formulário com cálculo em tempo real + semáforo + curva de crescimento (linhas de percentil do documento). Seletor de método mostra só "percentil" enquanto z-score indisponível.
5. **Histórico & evolução**: seção de histórico + extensão dos gráficos de evolução + aba condicional por idade.
6. **Backlog**: carregar tabelas de **escore-Z** (ativa o segundo critério e as sub-faixas extremas); indicador **P/E** (requer tabela OMS adicional); export PDF do laudo infantil.

## Fontes

- [Diagnóstico da obesidade infantil — ABESO](https://abeso.org.br/wp-content/uploads/2019/12/552fe98518b8a.pdf)
- [Notas técnicas SISVAN — Datasus/Tabnet](http://tabnet.datasus.gov.br/cgi-win/SISVAN/CNV/notas_sisvan.html)
- [Apostila de Avaliação Nutricional — PUC Goiás](https://professor.pucgoias.edu.br/SiteDocente/admin/arquivosUpload/14052/material/Apostila%20Avalia%C3%A7%C3%A3o%20Nutricional.pdf)
- [Score Z ou Percentil em crianças — Portal de Nutrição](https://portaldenutricao.com/avaliacao-antropometrica-em-criancas-quando-utilizar-score-z-ou-percentil/)
- Tabelas de referência OMS/SISVAN: `docs/referencias_avaliacao/` — **edição percentis** (P1…P99). As tabelas de escore-Z serão adicionadas posteriormente pelo usuário.
