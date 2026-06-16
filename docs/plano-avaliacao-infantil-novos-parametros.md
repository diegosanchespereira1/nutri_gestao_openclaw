# Plano de Implementação — Novos Parâmetros da Avaliação Infantil

**Projeto:** NutriGestão SaaS  
**Data:** 2026-06-15  
**Base:** Curvas WHO Child Growth Standards (PDFs em `/Downloads/Curvas_Sistema`)

---

## 1. Contexto e escopo

### 1.1 Situação atual

A avaliação nutricional infantil (`patient_child_assessments`) já suporta 4 indicadores:

| Indicador | Sigla | Faixa de idade |
|---|---|---|
| `weight_for_age` | P/I | 0–120 meses |
| `height_for_age` | E/I | 0–228 meses |
| `bmi_for_age` | IMC/I | 0–228 meses |
| `weight_for_height` | P/E | por estatura |

### 1.2 Novos parâmetros solicitados

Quatro novos indicadores extraídos dos PDFs em `Curvas_Sistema`:

| Indicador | Sigla | Medida | Unidade | Faixa de idade |
|---|---|---|---|---|
| `arm_circumference_for_age` | CB/I | Circunferência do braço | cm | 3–60 meses |
| `triceps_skinfold_for_age` | PCT/I | Prega cutânea tricipital | mm | 3–60 meses |
| `subscapular_skinfold_for_age` | SE/I | Prega subescapular | mm | 3–60 meses |
| `head_circumference_for_age` | PC/I | Perímetro cefálico | cm | 0–60 meses |

### 1.3 Arquivos de referência disponíveis

Cada indicador possui PDFs por sexo (Meninas/Meninos) e por critério (Perc/EscoreZ):

```
Curvas_Sistema/
├── Circunferencia do braço/
│   ├── Meninas/Tabela_CB_meninas_Perc_3meses-5anos.pdf
│   ├── Meninas/Tabela_CB_meninas_EscoreZ_3meses-5anos.pdf
│   ├── Meninos/Tabela_CB_meninos_Perc_3meses-5anos.pdf
│   └── Meninos/Tabela_CB_meninos_EscoreZ_3meses-5anos.pdf
├── Tríceps/
│   ├── Meninas/Tabela_PCT_meninas_Perc_3meses-5anos.pdf
│   ├── Meninas/Tabela_PCT_meninas_EscoreZ_3meses-5anos.pdf
│   ├── Meninos/Tabela_PCT_meninos_Perc_3meses-5anos.pdf
│   └── Meninos/Tabela_PCT_meninos_EscoreZ_3meses-5anos.pdf
├── Subescapular/
│   ├── Meninas/Tabela_SE_meninas_Perc_3meses-5anos.pdf
│   ├── Meninas/Tabela_SE_meninas_EscoreZ_3meses-5anos.pdf
│   ├── Meninos/Tabela_SE_meninos_Perc_3meses-5anos.pdf
│   └── Meninos/Tabela_SE_meninos_EscoreZ_3meses-5anos.pdf
└── Perímetro cefálico/
    ├── 0-5 anos/
    │   ├── Meninas/Tabela_PC_meninas_Perc_0-5anos.pdf
    │   ├── Meninas/Tabela_PC_meninas_EscoreZ_0-5anos.pdf
    │   ├── Meninos/Tabela_PC_meninos_Perc_0-5anos.pdf
    │   └── Meninos/Tabela_PC_meninos_EscoreZ_0-5anos.pdf
    └── 0-13 semanas/   ← resolução semanal (fase futura, se necessário)
        └── ...
```

---

## 2. Regra de exibição por faixa etária

### 2.1 Lógica no formulário de nova avaliação

```
ageMonths = (data_avaliacao - data_nascimento) em meses completos

Exibir campos de CB, PCT, SE:
  → ageMonths >= 3  AND  ageMonths <= 60

Exibir campo de PC:
  → ageMonths >= 0  AND  ageMonths <= 60

Caso a criança ainda NÃO tenha data de nascimento informada:
  → exibir todos os campos (mesmo comportamento de "sem categoria" atual)
```

### 2.2 Histórico de avaliações anteriores

Avaliações realizadas quando a criança estava dentro da faixa etária **sempre aparecem** no histórico, mesmo que a criança já tenha ultrapassado os 60 meses. Os campos ficados congelados em `results` (JSONB) garantem rastreabilidade completa.

---

## 3. Arquitetura da implementação

### Camadas afetadas (por ordem de dependência)

```
1. lib/nutrition/child/types.ts           ← novos indicadores no union type
2. lib/nutrition/child/reference-data/    ← 16 arquivos de dados extraídos dos PDFs
3. lib/nutrition/child/reference-data/percentile/index.ts  ← registrar novos datasets
4. lib/nutrition/child/reference-data/zscore/index.ts      ← registrar novos datasets
5. lib/nutrition/child/classify.ts        ← regras de classificação para novos indicadores
6. lib/nutrition/child/labels.ts          ← labels, siglas e unidades
7. lib/nutrition/child/assess.ts          ← incluir novos indicadores no orquestrador
8. supabase/migrations/                   ← nova migração com 4 colunas
9. lib/types/child-assessments.ts         ← novos campos no ChildAssessmentRow
10. lib/actions/child-assessments.ts      ← parse e persistência dos novos campos
11. components/pacientes/child-assessment-form.tsx  ← campos condicionais no formulário
12. tests/                                ← testes unitários
```

---

## 4. Plano detalhado por etapa

---

### Etapa 1 — Tipos (`types.ts`)

**Arquivo:** `lib/nutrition/child/types.ts`

Estender o union type `ChildIndicator`:

```ts
// ANTES
export type ChildIndicator =
  | "weight_for_age"
  | "height_for_age"
  | "bmi_for_age"
  | "weight_for_height";

// DEPOIS
export type ChildIndicator =
  | "weight_for_age"
  | "height_for_age"
  | "bmi_for_age"
  | "weight_for_height"
  | "arm_circumference_for_age"
  | "triceps_skinfold_for_age"
  | "subscapular_skinfold_for_age"
  | "head_circumference_for_age";
```

Nenhum outro tipo precisa mudar — `ChildIndicatorResult`, `PercentileRow` e `PercentileTable` são genéricos o suficiente.

---

### Etapa 2 — Dados de referência (16 arquivos TypeScript)

**Diretório:** `lib/nutrition/child/reference-data/`

Extrair via script Python os dados de cada PDF, seguindo o padrão já adotado (arrays de 11 valores alinhados a `PERCENTILE_KEYS`). Os valores devem ser copiados literalmente do documento — nenhum arredondamento ou recálculo.

#### 2a. Arquivos percentil a criar:

```
percentile/arm-circumference-for-age.female.ts   ← CB meninas (meses 3–60)
percentile/arm-circumference-for-age.male.ts     ← CB meninos (meses 3–60)
percentile/triceps-skinfold-for-age.female.ts    ← PCT meninas (meses 3–60)
percentile/triceps-skinfold-for-age.male.ts      ← PCT meninos (meses 3–60)
percentile/subscapular-skinfold-for-age.female.ts ← SE meninas (meses 3–60)
percentile/subscapular-skinfold-for-age.male.ts  ← SE meninos (meses 3–60)
percentile/head-circumference-for-age.female.ts  ← PC meninas (meses 0–60)
percentile/head-circumference-for-age.male.ts    ← PC meninos (meses 0–60)
```

#### 2b. Arquivos escore-Z a criar (mesma estrutura, 7 colunas: -3SD a +3SD):

```
zscore/arm-circumference-for-age.female.ts
zscore/arm-circumference-for-age.male.ts
zscore/triceps-skinfold-for-age.female.ts
zscore/triceps-skinfold-for-age.male.ts
zscore/subscapular-skinfold-for-age.female.ts
zscore/subscapular-skinfold-for-age.male.ts
zscore/head-circumference-for-age.female.ts
zscore/head-circumference-for-age.male.ts
```

#### 2c. Formato dos arquivos (exemplo CB meninas percentil):

```ts
import type { PercentileTable } from "../../types";

/** Gerado a partir de Tabela_CB_meninas_Perc_3meses-5anos.pdf (WHO Child Growth Standards).
 *  Colunas: p1, p3, p5, p15, p25, p50, p75, p85, p95, p97, p99
 *  Faixa: meses 3–60 (3 meses a 5 anos). Não editar à mão.
 */
export const armCircumferenceForAgeFemale: PercentileTable = {
  3:  [10.8, 11.2, 11.4, 12.0, 12.3, 13.0, 13.8, 14.2, 14.9, 15.3, 15.8],
  4:  [11.1, 11.5, 11.7, 12.3, 12.6, 13.4, 14.1, 14.6, 15.3, 15.7, 16.3],
  // ... até mês 60
  60: [13.6, 14.2, 14.5, 15.3, 15.8, 16.9, 18.0, 18.6, 19.7, 20.1, 21.0],
};
```

#### 2d. Atualizar os índices:

**`percentile/index.ts`** — adicionar as 8 novas entradas:
```ts
export const PERCENTILE_TABLES: Record<string, PercentileTable> = {
  // ... existentes ...
  "arm_circumference_for_age:female": armCircumferenceForAgeFemale,
  "arm_circumference_for_age:male":   armCircumferenceForAgeMale,
  "triceps_skinfold_for_age:female":  tricepsSkinfoldForAgeFemale,
  "triceps_skinfold_for_age:male":    tricepsSkinfoldForAgeMale,
  "subscapular_skinfold_for_age:female": subscapularSkinfoldForAgeFemale,
  "subscapular_skinfold_for_age:male":   subscapularSkinfoldForAgeMale,
  "head_circumference_for_age:female": headCircumferenceForAgeFemale,
  "head_circumference_for_age:male":   headCircumferenceForAgeMale,
};
```

**`zscore/index.ts`** — idem para os datasets de escore-Z.

---

### Etapa 3 — Labels e unidades (`labels.ts`)

**Arquivo:** `lib/nutrition/child/labels.ts`

```ts
export const CHILD_INDICATOR_LABELS: Record<ChildIndicator, string> = {
  // ... existentes ...
  arm_circumference_for_age:     "Circunferência do braço para idade",
  triceps_skinfold_for_age:      "Prega cutânea tricipital para idade",
  subscapular_skinfold_for_age:  "Prega subescapular para idade",
  head_circumference_for_age:    "Perímetro cefálico para idade",
};

export const CHILD_INDICATOR_SHORT: Record<ChildIndicator, string> = {
  // ... existentes ...
  arm_circumference_for_age:     "CB/I",
  triceps_skinfold_for_age:      "PCT/I",
  subscapular_skinfold_for_age:  "SE/I",
  head_circumference_for_age:    "PC/I",
};

export const CHILD_INDICATOR_UNIT: Record<ChildIndicator, string> = {
  // ... existentes ...
  arm_circumference_for_age:     "cm",
  triceps_skinfold_for_age:      "mm",
  subscapular_skinfold_for_age:  "mm",
  head_circumference_for_age:    "cm",
};
```

---

### Etapa 4 — Classificação (`classify.ts`)

**Arquivo:** `lib/nutrition/child/classify.ts`

Adicionar os novos `case` no switch de `classifyByPercentile`. Os pontos de corte seguem o mesmo padrão P3/P97 já adotado para os indicadores existentes, com terminologia compatível com o Procedimento de Avaliação Nutricional.

> ⚠️ **Atenção clínica:** Os rótulos abaixo são propostas baseadas na literatura WHO e devem ser **validados pela equipe clínica** antes do deploy em produção.

```ts
case "arm_circumference_for_age": {
  if (value < p3)  return { classification: "CB baixa para a idade",     color: "yellow" };
  if (value < p97) return { classification: "CB adequada para a idade",   color: "green"  };
  return              { classification: "CB elevada para a idade",   color: "yellow" };
}

case "triceps_skinfold_for_age": {
  if (value < p3)  return { classification: "PCT baixa para a idade",    color: "yellow" };
  if (value < p97) return { classification: "PCT adequada para a idade",  color: "green"  };
  return              { classification: "PCT elevada para a idade",  color: "yellow" };
}

case "subscapular_skinfold_for_age": {
  if (value < p3)  return { classification: "SE baixa para a idade",     color: "yellow" };
  if (value < p97) return { classification: "SE adequada para a idade",   color: "green"  };
  return              { classification: "SE elevada para a idade",   color: "yellow" };
}

case "head_circumference_for_age": {
  if (value < p3)  return { classification: "Microcefalia",               color: "red"    };
  if (value < p97) return { classification: "PC adequado para a idade",   color: "green"  };
  return              { classification: "Macrocefalia",               color: "yellow" };
}
```

> Nota: `Microcefalia` usa `color: "red"` por ser uma condição de maior gravidade clínica.

---

### Etapa 5 — Orquestrador (`assess.ts`)

**Arquivo:** `lib/nutrition/child/assess.ts`

Adicionar os novos indicadores ao orquestrador com verificação de faixa etária. Os indicadores CB, PCT e SE só têm dados da tabela a partir do mês 3; PC tem dados a partir do mês 0.

```ts
// Novos indicadores baseados em medida por idade
// A tabela de referência já limita por cobertura (ageMonths < 3 → row = null → outOfRange)
const skinfoldAndCircumferenceInputs: Array<{
  indicator: ChildIndicator;
  value: number | null;
}> = [
  { indicator: "arm_circumference_for_age",    value: armCircumferenceCm },
  { indicator: "triceps_skinfold_for_age",     value: tricepsSkinfoldMm },
  { indicator: "subscapular_skinfold_for_age", value: subscapularSkinfoldMm },
  { indicator: "head_circumference_for_age",   value: headCircumferenceCm },
];

for (const { indicator, value } of skinfoldAndCircumferenceInputs) {
  const row = getReference(indicator, sex, ageMonths, method);
  indicators.push(buildResult(indicator, ageMonths, value, row));
}
```

A função `buildResult` já lida com `row = null` (produz `outOfRange: true`) e `value = null` (produz `classification: null`), portanto nenhuma lógica especial de guarda é necessária além do lookup na tabela.

**Assinatura do `assessChild` passa a receber os novos campos:**

```ts
export type ChildAssessmentInput = {
  sex: ChildSex;
  ageMonths: number;
  weightKg: number | null;
  heightCm: number | null;
  method: ClassificationMethod;
  // Novos (opcionais — null quando não informados)
  armCircumferenceCm: number | null;
  tricepsSkinfoldMm: number | null;
  subscapularSkinfoldMm: number | null;
  headCircumferenceCm: number | null;
};
```

---

### Etapa 6 — Migração do banco de dados

**Arquivo novo:** `supabase/migrations/20260616100000_patient_child_assessments_new_measures.sql`

```sql
-- Adiciona medidas antropométricas para avaliação infantil 3–60 meses
-- (WHO Child Growth Standards: CB, PCT, SE) e 0–60 meses (PC).
-- Colunas nullable: a maioria das avaliações não coletará todos os parâmetros.

alter table patient_child_assessments
  add column arm_circumference_cm   numeric(5,2) check (arm_circumference_cm > 0),
  add column triceps_skinfold_mm    numeric(5,2) check (triceps_skinfold_mm > 0),
  add column subscapular_skinfold_mm numeric(5,2) check (subscapular_skinfold_mm > 0),
  add column head_circumference_cm  numeric(5,2) check (head_circumference_cm > 0);

comment on column patient_child_assessments.arm_circumference_cm    is 'Circunferência do braço (cm). Tabela WHO: 3–60 meses.';
comment on column patient_child_assessments.triceps_skinfold_mm     is 'Prega cutânea tricipital (mm). Tabela WHO: 3–60 meses.';
comment on column patient_child_assessments.subscapular_skinfold_mm is 'Prega subescapular (mm). Tabela WHO: 3–60 meses.';
comment on column patient_child_assessments.head_circumference_cm   is 'Perímetro cefálico (cm). Tabela WHO: 0–60 meses.';
```

---

### Etapa 7 — Tipos da row (`lib/types/child-assessments.ts`)

```ts
export type ChildAssessmentRow = {
  // ... campos existentes ...
  arm_circumference_cm: number | string | null;
  triceps_skinfold_mm: number | string | null;
  subscapular_skinfold_mm: number | string | null;
  head_circumference_cm: number | string | null;
};
```

---

### Etapa 8 — Server action (`lib/actions/child-assessments.ts`)

Na função `createChildAssessmentAction`, adicionar o parse dos 4 novos campos do FormData e passá-los ao `assessChild` e ao insert do Supabase:

```ts
const armCircumferenceCm    = parseDec(formData.get("arm_circumference_cm"));
const tricepsSkinfoldMm     = parseDec(formData.get("triceps_skinfold_mm"));
const subscapularSkinfoldMm = parseDec(formData.get("subscapular_skinfold_mm"));
const headCircumferenceCm   = parseDec(formData.get("head_circumference_cm"));

const assessment = assessChild({
  sex, ageMonths, weightKg, heightCm, method,
  armCircumferenceCm,
  tricepsSkinfoldMm,
  subscapularSkinfoldMm,
  headCircumferenceCm,
});

// No insert:
{
  // ... campos existentes ...
  arm_circumference_cm:    armCircumferenceCm,
  triceps_skinfold_mm:     tricepsSkinfoldMm,
  subscapular_skinfold_mm: subscapularSkinfoldMm,
  head_circumference_cm:   headCircumferenceCm,
}
```

---

### Etapa 9 — Formulário (`child-assessment-form.tsx`)

Adicionar 4 novos estados locais e 4 novos campos de input, condicionados à faixa etária.

#### 9a. Estados adicionais

```ts
const [armCircumference, setArmCircumference] = useState<string>("");
const [tricepsSkinfold,  setTricepsSkinfold]  = useState<string>("");
const [subscapularSkinfold, setSubscapularSkinfold] = useState<string>("");
const [headCircumference, setHeadCircumference] = useState<string>("");
```

#### 9b. Lógica de visibilidade

```ts
// Faixas de exibição conforme as tabelas WHO disponíveis
const showSkinfoldAndCB = ageMonths != null && ageMonths >= 3 && ageMonths <= 60;
const showHeadCirc      = ageMonths != null && ageMonths >= 0 && ageMonths <= 60;
```

#### 9c. Campos condicionais no JSX (dentro do fieldset de Medidas)

```tsx
{showHeadCirc && (
  <div className="space-y-2">
    <Label htmlFor="ca-head-circ">Perímetro cefálico (cm)</Label>
    <Input
      id="ca-head-circ"
      name="head_circumference_cm"
      type="number"
      step="0.1"
      min={0}
      inputMode="decimal"
      placeholder="Ex.: 39,5"
      className="tabular-nums"
      value={headCircumference}
      onChange={(e) => setHeadCircumference(e.target.value)}
    />
  </div>
)}

{showSkinfoldAndCB && (
  <>
    <div className="space-y-2">
      <Label htmlFor="ca-arm-circ">Circunferência do braço (cm)</Label>
      <Input
        id="ca-arm-circ"
        name="arm_circumference_cm"
        type="number"
        step="0.1"
        min={0}
        inputMode="decimal"
        placeholder="Ex.: 14,5"
        className="tabular-nums"
        value={armCircumference}
        onChange={(e) => setArmCircumference(e.target.value)}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="ca-triceps">Prega cutânea tricipital (mm)</Label>
      <Input
        id="ca-triceps"
        name="triceps_skinfold_mm"
        type="number"
        step="0.1"
        min={0}
        inputMode="decimal"
        placeholder="Ex.: 8,5"
        className="tabular-nums"
        value={tricepsSkinfold}
        onChange={(e) => setTricepsSkinfold(e.target.value)}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="ca-subscapular">Prega subescapular (mm)</Label>
      <Input
        id="ca-subscapular"
        name="subscapular_skinfold_mm"
        type="number"
        step="0.1"
        min={0}
        inputMode="decimal"
        placeholder="Ex.: 6,1"
        className="tabular-nums"
        value={subscapularSkinfold}
        onChange={(e) => setSubscapularSkinfold(e.target.value)}
      />
    </div>
  </>
)}
```

#### 9d. Inputs hidden para o FormData (dentro do `<form>`)

```tsx
<input type="hidden" name="arm_circumference_cm"    value={toNum(armCircumference) ?? ""} />
<input type="hidden" name="triceps_skinfold_mm"     value={toNum(tricepsSkinfold) ?? ""}  />
<input type="hidden" name="subscapular_skinfold_mm" value={toNum(subscapularSkinfold) ?? ""} />
<input type="hidden" name="head_circumference_cm"   value={toNum(headCircumference) ?? ""}   />
```

---

## 5. Testes unitários

### 5.1 Testes de lógica de visibilidade por faixa etária

**Arquivo:** `lib/nutrition/child/age-range.test.ts` *(novo)*

```ts
import { describe, expect, it } from "vitest";

// Regras: CB/PCT/SE visíveis para ageMonths >= 3 e <= 60
//         PC visível para ageMonths >= 0 e <= 60
// Essas funções serão exportadas de assess.ts ou de um helper de visibilidade

describe("visibilidade dos novos indicadores por faixa etária", () => {
  it("CB/I, PCT/I, SE/I: visíveis a partir dos 3 meses", () => {
    expect(showsSkinfoldAndCB(3)).toBe(true);
    expect(showsSkinfoldAndCB(60)).toBe(true);
  });

  it("CB/I, PCT/I, SE/I: NÃO visíveis antes dos 3 meses", () => {
    expect(showsSkinfoldAndCB(0)).toBe(false);
    expect(showsSkinfoldAndCB(1)).toBe(false);
    expect(showsSkinfoldAndCB(2)).toBe(false);
  });

  it("CB/I, PCT/I, SE/I: NÃO visíveis após os 60 meses", () => {
    expect(showsSkinfoldAndCB(61)).toBe(false);
    expect(showsSkinfoldAndCB(72)).toBe(false);
  });

  it("PC/I: visível desde o nascimento (0 meses)", () => {
    expect(showsHeadCircumference(0)).toBe(true);
    expect(showsHeadCircumference(60)).toBe(true);
  });

  it("PC/I: NÃO visível após os 60 meses", () => {
    expect(showsHeadCircumference(61)).toBe(false);
  });
});
```

### 5.2 Testes de lookup da tabela de referência

**Arquivo:** `lib/nutrition/child/reference.test.ts` *(ampliar o existente)*

```ts
describe("getReference — novos indicadores", () => {
  it("arm_circumference_for_age: retorna linha para mês 3 (início da tabela)", () => {
    const row = getReference("arm_circumference_for_age", "female", 3, "percentile");
    expect(row).not.toBeNull();
    expect(row).toHaveLength(11); // 11 percentis
  });

  it("arm_circumference_for_age: retorna linha para mês 60 (fim da tabela)", () => {
    const row = getReference("arm_circumference_for_age", "female", 60, "percentile");
    expect(row).not.toBeNull();
  });

  it("arm_circumference_for_age: retorna null para mês 2 (fora da tabela)", () => {
    const row = getReference("arm_circumference_for_age", "female", 2, "percentile");
    expect(row).toBeNull();
  });

  it("arm_circumference_for_age: retorna null para mês 61 (fora da tabela)", () => {
    const row = getReference("arm_circumference_for_age", "female", 61, "percentile");
    expect(row).toBeNull();
  });

  it("head_circumference_for_age: retorna linha para mês 0 (nascimento)", () => {
    const row = getReference("head_circumference_for_age", "female", 0, "percentile");
    expect(row).not.toBeNull();
  });

  it("head_circumference_for_age: retorna null para mês 61", () => {
    const row = getReference("head_circumference_for_age", "female", 61, "percentile");
    expect(row).toBeNull();
  });

  it("datasets de meninos e meninas são diferentes (CB mês 30)", () => {
    const female = getReference("arm_circumference_for_age", "female", 30, "percentile");
    const male   = getReference("arm_circumference_for_age", "male",   30, "percentile");
    expect(female).not.toEqual(male);
  });
});
```

### 5.3 Testes de classificação dos novos indicadores

**Arquivo:** `lib/nutrition/child/classify.test.ts` *(ampliar o existente)*

```ts
// CB meninas mês 30: p3=12.7, p97=18.6 (valores reais da tabela)
const cbRow30Female = [12.0, 12.7, 13.0, 13.7, 14.1, 14.9, 15.9, 16.4, 17.3, 17.7, 18.4];

describe("classifyByPercentile — CB/I", () => {
  it("abaixo de P3 → CB baixa para a idade", () => {
    const r = classifyByPercentile("arm_circumference_for_age", 30, 12.5, cbRow30Female);
    expect(r.classification).toBe("CB baixa para a idade");
    expect(r.color).toBe("yellow");
  });
  it("entre P3 e P97 → CB adequada para a idade", () => {
    const r = classifyByPercentile("arm_circumference_for_age", 30, 14.9, cbRow30Female);
    expect(r.classification).toBe("CB adequada para a idade");
    expect(r.color).toBe("green");
  });
  it("em P97 ou acima → CB elevada para a idade", () => {
    const r = classifyByPercentile("arm_circumference_for_age", 30, 17.7, cbRow30Female);
    expect(r.classification).toBe("CB elevada para a idade");
    expect(r.color).toBe("yellow");
  });
});

// PC meninas mês 3: p3=37.2, p97=41.9 (valores reais da tabela)
const pcRow3Female = [36.6, 37.2, 37.5, 38.2, 38.7, 39.5, 40.4, 40.8, 41.6, 41.9, 42.4];

describe("classifyByPercentile — PC/I", () => {
  it("abaixo de P3 → Microcefalia (red)", () => {
    const r = classifyByPercentile("head_circumference_for_age", 3, 37.0, pcRow3Female);
    expect(r.classification).toBe("Microcefalia");
    expect(r.color).toBe("red");
  });
  it("entre P3 e P97 → PC adequado para a idade (green)", () => {
    const r = classifyByPercentile("head_circumference_for_age", 3, 39.5, pcRow3Female);
    expect(r.classification).toBe("PC adequado para a idade");
    expect(r.color).toBe("green");
  });
  it("em P97 ou acima → Macrocefalia (yellow)", () => {
    const r = classifyByPercentile("head_circumference_for_age", 3, 42.0, pcRow3Female);
    expect(r.classification).toBe("Macrocefalia");
    expect(r.color).toBe("yellow");
  });
});
```

### 5.4 Testes do orquestrador completo

**Arquivo:** `lib/nutrition/child/assess.test.ts` *(ampliar o existente)*

```ts
describe("assessChild — novos indicadores (3 meses, menina)", () => {
  const base = {
    sex: "female" as const,
    ageMonths: 3,
    weightKg: 5.8,
    heightCm: 60.0,
    method: "percentile" as const,
    armCircumferenceCm:    13.0,
    tricepsSkinfoldMm:      7.8,
    subscapularSkinfoldMm:  6.5,
    headCircumferenceCm:   39.5,
  };

  it("inclui os 4 novos indicadores no resultado", () => {
    const result = assessChild(base);
    const names = result.indicators.map((i) => i.indicator);
    expect(names).toContain("arm_circumference_for_age");
    expect(names).toContain("triceps_skinfold_for_age");
    expect(names).toContain("subscapular_skinfold_for_age");
    expect(names).toContain("head_circumference_for_age");
  });

  it("CB de 13,0 cm não fica outOfRange para mês 3", () => {
    const r = assessChild(base);
    const cb = r.indicators.find((i) => i.indicator === "arm_circumference_for_age");
    expect(cb?.outOfRange).toBe(false);
    expect(cb?.classification).not.toBeNull();
  });

  it("PC de 39,5 cm é classificado no mês 3", () => {
    const r = assessChild(base);
    const pc = r.indicators.find((i) => i.indicator === "head_circumference_for_age");
    expect(pc?.outOfRange).toBe(false);
    expect(pc?.classification).toBe("PC adequado para a idade");
  });
});

describe("assessChild — novos indicadores fora da faixa (2 meses)", () => {
  const base2months = {
    sex: "female" as const,
    ageMonths: 2,
    weightKg: 5.0,
    heightCm: 57.0,
    method: "percentile" as const,
    armCircumferenceCm:    12.5,   // tabela CB começa no mês 3
    tricepsSkinfoldMm:      7.0,
    subscapularSkinfoldMm:  6.0,
    headCircumferenceCm:   38.3,   // tabela PC cobre mês 2
  };

  it("CB/PCT/SE ficam outOfRange com ageMonths=2 (tabela começa em 3)", () => {
    const r = assessChild(base2months);
    const cb  = r.indicators.find((i) => i.indicator === "arm_circumference_for_age");
    const pct = r.indicators.find((i) => i.indicator === "triceps_skinfold_for_age");
    const se  = r.indicators.find((i) => i.indicator === "subscapular_skinfold_for_age");
    expect(cb?.outOfRange).toBe(true);
    expect(pct?.outOfRange).toBe(true);
    expect(se?.outOfRange).toBe(true);
  });

  it("PC cobre mês 2 (tabela começa em 0)", () => {
    const r = assessChild(base2months);
    const pc = r.indicators.find((i) => i.indicator === "head_circumference_for_age");
    expect(pc?.outOfRange).toBe(false);
  });
});

describe("assessChild — novos indicadores fora da faixa (61 meses)", () => {
  const base61 = {
    sex: "female" as const,
    ageMonths: 61,
    weightKg: 20.0,
    heightCm: 108.0,
    method: "percentile" as const,
    armCircumferenceCm:    16.0,
    tricepsSkinfoldMm:      8.5,
    subscapularSkinfoldMm:  6.1,
    headCircumferenceCm:   49.0,
  };

  it("todos os novos indicadores ficam outOfRange com ageMonths=61", () => {
    const r = assessChild(base61);
    ["arm_circumference_for_age","triceps_skinfold_for_age",
     "subscapular_skinfold_for_age","head_circumference_for_age"].forEach((ind) => {
      const item = r.indicators.find((i) => i.indicator === ind);
      expect(item?.outOfRange).toBe(true);
    });
  });
});

describe("assessChild — novos campos null (não informados)", () => {
  it("campos null → indicadores sem dados mas sem outOfRange", () => {
    const r = assessChild({
      sex: "female",
      ageMonths: 12,
      weightKg: 9.0,
      heightCm: 74.0,
      method: "percentile",
      armCircumferenceCm: null,
      tricepsSkinfoldMm: null,
      subscapularSkinfoldMm: null,
      headCircumferenceCm: null,
    });
    const cb = r.indicators.find((i) => i.indicator === "arm_circumference_for_age");
    expect(cb?.classification).toBeNull();
    expect(cb?.outOfRange).toBe(false);
  });
});
```

### 5.5 Testes de integridade dos dados de referência

**Arquivo:** `lib/nutrition/child/reference-data-integrity.test.ts` *(novo)*

Valida que os dados extraídos dos PDFs têm a estrutura correta (sem valores faltando, sem NaN, em ordem crescente por percentil).

```ts
import { describe, expect, it } from "vitest";
import { PERCENTILE_TABLES } from "./reference-data/percentile/index";

const NEW_INDICATORS = [
  "arm_circumference_for_age",
  "triceps_skinfold_for_age",
  "subscapular_skinfold_for_age",
  "head_circumference_for_age",
];

describe("integridade dos dados de referência — novos indicadores", () => {
  for (const indicator of NEW_INDICATORS) {
    for (const sex of ["female", "male"]) {
      const key = `${indicator}:${sex}`;
      const table = PERCENTILE_TABLES[key];

      it(`${key}: tabela existe e não está vazia`, () => {
        expect(table).toBeDefined();
        expect(Object.keys(table).length).toBeGreaterThan(0);
      });

      it(`${key}: cada linha tem exatamente 11 percentis`, () => {
        for (const [month, row] of Object.entries(table)) {
          expect(row).toHaveLength(11), `mês ${month}`;
        }
      });

      it(`${key}: nenhum valor é NaN ou null`, () => {
        for (const [month, row] of Object.entries(table)) {
          for (const val of row) {
            expect(typeof val).toBe("number"), `mês ${month}`;
            expect(Number.isFinite(val)).toBe(true), `mês ${month}`;
          }
        }
      });

      it(`${key}: valores de percentil em ordem crescente (p1 < p3 < ... < p99)`, () => {
        for (const [month, row] of Object.entries(table)) {
          for (let i = 1; i < row.length; i++) {
            expect(row[i]).toBeGreaterThanOrEqual(row[i - 1]),
              `mês ${month}, col ${i}`;
          }
        }
      });

      it(`${key}: faixa de meses coberta corretamente`, () => {
        const months = Object.keys(table).map(Number);
        const minMonth = indicator === "head_circumference_for_age" ? 0 : 3;
        expect(Math.min(...months)).toBe(minMonth);
        expect(Math.max(...months)).toBe(60);
      });
    }
  }
});
```

---

## 6. Ordem de execução recomendada

```
1. [ ] Etapa 1  — Estender ChildIndicator em types.ts
2. [ ] Etapa 2  — Criar script de extração dos PDFs (Python) + gerar 16 arquivos .ts
3. [ ] Etapa 2d — Registrar novos datasets nos índices percentile/index.ts e zscore/index.ts
4. [ ] Etapa 3  — Atualizar labels.ts
5. [ ] Etapa 4  — Atualizar classify.ts (aguardar validação clínica dos rótulos)
6. [ ] Etapa 5  — Atualizar assess.ts (nova assinatura + loop de novos indicadores)
7. [ ] Etapa 6  — Criar migração SQL
8. [ ] Etapa 7  — Atualizar ChildAssessmentRow em lib/types/child-assessments.ts
9. [ ] Etapa 8  — Atualizar server action
10.[ ] Etapa 9  — Atualizar formulário (campos condicionais)
11.[ ] Testes   — Implementar todos os suites de teste descritos na Seção 5
12.[ ] Review   — Validação clínica dos rótulos de classificação (Etapa 4)
13.[ ] Deploy   — Migração + nova build
```

---

## 7. Pontos de atenção

| # | Ponto | Ação |
|---|---|---|
| 1 | Rótulos de classificação para CB, PCT, SE, PC | Validar com equipe clínica antes do deploy (propostas na Etapa 4) |
| 2 | Tabelas de escore-Z | PDFs já disponíveis — podem ser extraídos junto com percentil |
| 3 | PC tem tabela 0–13 semanas (semanal) | Não escopo desta story; tabela 0–5 anos cobre mensalmente |
| 4 | Histórico de avaliações anteriores | Sem impacto — JSONB `results` já congela dados; UI de histórico deve sempre exibir todos os indicadores armazenados |
| 5 | `canSubmit` no formulário | Manter lógica atual: pelo menos peso OU altura. Os novos campos são opcionais |
| 6 | `child-assessment-result-cards.tsx` | Nenhuma mudança necessária — o componente já é genérico sobre `ChildIndicatorResult[]` |
| 7 | `child-growth-curve.tsx` | Não escopo desta story — curvas gráficas para novos indicadores são trabalho futuro |

---

## 8. Critérios de aceite

- [ ] Criança com 2 meses: formulário **não** exibe campos CB, PCT, SE; **exibe** PC
- [ ] Criança com 3 meses: formulário **exibe** todos os 4 novos campos
- [ ] Criança com 60 meses: formulário **exibe** todos os 4 novos campos
- [ ] Criança com 61 meses: formulário **não** exibe nenhum dos 4 novos campos
- [ ] Avaliação salva com CB/PCT/SE/PC aparece no histórico, mesmo após criança superar 60 meses
- [ ] Campos não preenchidos (null) não causam erro — avaliação salva normalmente
- [ ] Todos os testes unitários da Seção 5 passam com `vitest`
- [ ] TypeScript compila sem erros (`tsc --noEmit`)
- [ ] Migração SQL aplica sem erros em banco limpo e em banco com dados existentes
