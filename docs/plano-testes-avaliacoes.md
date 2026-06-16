# Plano de Testes — Avaliações Nutricionais

> Última atualização: 2026-06-14

Este documento descreve os testes unitários (Vitest) e funcionais E2E (Playwright)
a implementar para cobrir o fluxo completo de preenchimento e submissão das três
fichas de avaliação nutricional: **Infantil**, **Adulto** e **Idoso**.

---

## Contexto e estado atual

### O que já existe

| Arquivo de teste | O que cobre |
|---|---|
| `lib/nutrition/child/assess.test.ts` | `assessChild` — classificação percentil/z-score, casos de borda |
| `lib/nutrition/child/percentile.test.ts` | Lookup de tabelas de percentil |
| `lib/nutrition/child/classify.test.ts` | Classificação por faixa (cor, label) |
| `lib/nutrition/child/age.test.ts` | `ageInMonths` |
| `lib/nutrition/child/reference.test.ts` | Disponibilidade de tabelas de referência |
| `lib/nutrition/adult-anthropometry.test.ts` | `calcAdultEstimatedWeightKg`, `calcAdultEstimatedHeightM` |
| `e2e/smoke.spec.ts` | Páginas públicas + guard de autenticação (sem credenciais) |
| `e2e/auth-checklist-dossie.spec.ts` | Fluxo completo de checklist autenticado |
| `e2e/auth-perfil-foto.spec.ts` | Upload de foto de perfil autenticado |

### Lacunas identificadas

- **Fórmulas geriátricas** (`calcPeBase`, `calcAlturaBase` dentro de `geriatric-assessment-form.tsx`) — sem nenhum teste unitário.
- **Correção de amputação** (PE × 100 / (100 − %)) — sem teste unitário isolado.
- **CMB** (CB − DCT × 0,314) — sem teste unitário isolado.
- **`assessmentVisibilityForCategory`** e **`patientAgeCategory`** — sem testes.
- **Zero testes funcionais E2E** para os três formulários de avaliação.

---

## Parte 1 — Testes Unitários (Vitest)

Rodar com: `npm run test` ou `npx vitest`.

### 1.1 Fórmulas geriátricas

**Arquivo a criar:** `lib/nutrition/geriatric-anthropometry.ts`  
*(extrair as funções `calcPeBase` e `calcAlturaBase` do componente para facilitar teste)*

**Arquivo de teste:** `lib/nutrition/geriatric-anthropometry.test.ts`

```ts
describe("calcPeBase — Chumlea et al. 1988", () => {
  // mulher_branca: AJ×1,09 + CB×2,68 − 65,51
  it("mulher branca: AJ=50, CB=25 → PE correto", () => { ... });
  it("mulher negra:  AJ=50, CB=25 → PE correto", () => { ... });
  it("homem branco: AJ=50, CB=25 → PE correto", () => { ... });
  it("homem negro:  AJ=50, CB=25 → PE correto", () => { ... });
});

describe("calcAlturaBase — Chumlea et al. 1985", () => {
  // homem:  (64,19 + 2,04×AJ − 0,04×Idade) / 100
  it("homem branco: AJ=50, Idade=70 → altura correta", () => { ... });
  // mulher: (84,88 + 1,83×AJ − 0,24×Idade) / 100
  it("mulher branca: AJ=50, Idade=70 → altura correta", () => { ... });
  // Simetria: homem_branco == homem_negro (mesma fórmula)
  it("homem negro produz o mesmo resultado que homem branco", () => { ... });
  // Simetria: mulher_branca == mulher_negra (mesma fórmula)
  it("mulher negra produz o mesmo resultado que mulher branca", () => { ... });
});
```

### 1.2 Correção de amputação

**Arquivo de teste:** `lib/nutrition/amputation.test.ts`

```ts
describe("correcaoAmputacao(peBase, ampPct)", () => {
  // peBase × 100 / (100 − ampPct)
  it("sem amputação (0%) não altera o PE", () => {
    expect(correcaoAmputacao(60, 0)).toBe(60);
  });
  it("amputação de membro inferior — perna+pé (5,9%)", () => {
    // 60 × 100 / 94.1 ≈ 63.76
    expect(correcaoAmputacao(60, 5.9)).toBeCloseTo(63.76, 1);
  });
  it("amputação de coxa (10%)", () => {
    expect(correcaoAmputacao(60, 10)).toBeCloseTo(66.67, 1);
  });
  it("amputação de pé (1,8%)", () => {
    expect(correcaoAmputacao(60, 1.8)).toBeCloseTo(61.11, 1);
  });
});
```

### 1.3 CMB — Circunferência Muscular do Braço

**Arquivo de teste:** `lib/nutrition/cmb.test.ts`

```ts
// CMB = CB − (DCT × 0,314)
describe("calcCMB(cb, dct)", () => {
  it("valores típicos: CB=25, DCT=8 → CMB=22,49", () => {
    expect(calcCMB(25, 8)).toBeCloseTo(22.49, 2);
  });
  it("DCT zero → CMB == CB", () => {
    expect(calcCMB(25, 0)).toBe(25);
  });
  it("inputs nulos → retorna null", () => {
    expect(calcCMB(null, 8)).toBeNull();
    expect(calcCMB(25, null)).toBeNull();
  });
});
```

### 1.4 Categorização etária e visibilidade de avaliações

**Arquivo de teste:** `lib/pacientes/age-category.test.ts`

```ts
describe("patientAgeCategory", () => {
  it("< 18 anos → crianca", () => { ... });
  it("18 anos → adulto", () => { ... });
  it("59 anos → adulto", () => { ... });
  it("60 anos → idoso", () => { ... });
  it("data nula → null", () => { ... });
  it("data futura → null", () => { ... });
});

describe("assessmentVisibilityForCategory", () => {
  it("crianca → showChild true, adulto/idoso false", () => {
    expect(assessmentVisibilityForCategory("crianca")).toEqual({
      showChild: true, showAdult: false, showGeriatric: false
    });
  });
  it("adulto → showAdult true, crianca/idoso false", () => { ... });
  it("idoso → showGeriatric true, crianca/adulto false", () => { ... });
  it("null (sem data) → todas as abas visíveis", () => {
    expect(assessmentVisibilityForCategory(null)).toEqual({
      showChild: true, showAdult: true, showGeriatric: true
    });
  });
});
```

### 1.5 Testes adicionais para `assessChild` (adulto infantil — casos não cobertos)

**Arquivo existente:** `lib/nutrition/child/assess.test.ts` *(adicionar casos)*

```ts
describe("assessChild — bebê (0–23 meses)", () => {
  // Medida deitada; indicador P/E disponível nesta faixa
  it("menino 12m, 10kg, 76cm → classifica P/E", () => { ... });
  it("menina 6m, 7kg, 66cm → classifica corretamente", () => { ... });
});

describe("assessChild — adolescente (120–228 meses)", () => {
  it("peso fora da tabela (>120m) → outOfRange no P/I", () => { ... });
  it("IMC e estatura ainda classificam corretamente", () => { ... });
});
```

---

## Parte 2 — Testes Funcionais E2E (Playwright)

Rodar com: `npm run test:e2e`.  
Requer variáveis: `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_PATIENT_CHILD_ID`, `E2E_PATIENT_ADULT_ID`, `E2E_PATIENT_GERIATRIC_ID`.

> **Padrão de skip:** todos os testes autenticados usam  
> `test.skip(!E2E_EMAIL || !E2E_PASSWORD, "...")` — igual ao padrão dos specs existentes.

### 2.1 Avaliação Infantil

**Arquivo:** `e2e/auth-avaliacao-infantil.spec.ts`

#### Helpers reutilizáveis
```ts
async function login(page)       // mesmo helper dos outros specs
async function shot(page, name)  // screenshot numerado
```

#### Suite: `Avaliação Infantil — preenchimento completo`

| # | Teste | O que valida |
|---|---|---|
| 1 | **Navega até o formulário** | URL `/pacientes/{id}/avaliacao/nova`, tab "Infantil" visível |
| 2 | **Seleciona sexo e preenche datas** | Sexo "Feminino", data de nascimento, data de avaliação → campo "Idade na avaliação" exibe `Xa Ym (Z meses)` |
| 3 | **Preenche peso e estatura** | 22 kg, 120 cm → IMC calculado `15,3 kg/m²` visível em tempo real |
| 4 | **Altera critério para Z-score** | Se indisponível: opção desabilitada e label `— referência ainda não carregada`; se disponível: cards de resultado atualizam |
| 5 | **Label de comprimento vs estatura** | Bebê (< 24 meses) → label "Comprimento (cm) — deitado"; criança maior → "Estatura (cm) — em pé" |
| 6 | **Cards de resultado visíveis** | Ao preencher peso+altura, pelo menos 3 cards (P/I, E/I, IMC/I) aparecem com cor de fundo |
| 7 | **Campo de notas clínicas** | Texto preenchido, aceita caracteres especiais |
| 8 | **Submissão com dados válidos** | Clica "Registar avaliação" → redireciona para prontuário do paciente sem `role="alert"` de erro |
| 9 | **Bloqueia submissão incompleta** | Sem sexo selecionado → botão desabilitado (`disabled` attribute) |
| 10 | **Avaliação aparece no histórico** | Após submissão, seção de histórico infantil exibe o registo recém criado |

#### Suite: `Avaliação Infantil — validações de borda`

| # | Teste |
|---|---|
| 11 | Peso 0 → classificação de peso ausente mas formulário não bloqueia (peso não obrigatório) |
| 12 | Só peso sem estatura → IMC não exibe; card peso visível |
| 13 | Só estatura sem peso → card estatura visível; sem IMC |
| 14 | Data de nascimento no futuro → idade negativa/inválida, botão desabilitado |

---

### 2.2 Avaliação do Adulto

**Arquivo:** `e2e/auth-avaliacao-adulto.spec.ts`

#### Suite: `Avaliação Adulto — preenchimento e cálculos em tempo real`

| # | Teste | O que valida |
|---|---|---|
| 1 | **Navega até o formulário** | Tab "Adulto" visível; paciente com idade 18–59 anos |
| 2 | **Seleciona grupo e idade** | "Mulher Branca", 42 anos → altura estimada exige CB+AJ+Idade |
| 3 | **Preenche CB + DCT → CMB calculado** | CB=25, DCT=8 → CalcBox CMB exibe `22,49 cm` |
| 4 | **Preenche AJ + CB → PE calculado** | AJ=48,5, CB=25 → CalcBox Peso Estimado exibe valor numérico (≠ "–") |
| 5 | **Altura estimada com mulher (exige idade)** | Sem idade → "–"; com idade → valor em metros |
| 6 | **Altura estimada com homem (sem exigir idade)** | Grupo "Homem Branco", sem preencher idade → CalcBox Altura exibe valor |
| 7 | **IMC calculado automaticamente** | Com PE e Altura preenchidos → CalcBox IMC ≠ "–" |
| 8 | **Checkbox amputação** | Marcar → campo "% segmento amputado" aparece com valor `5,9`; PE e IMC recalculam |
| 9 | **Prescrição energético-proteica** | Kcal=30, PTN=1,2 → CalcBox NE e NP exibem valores calculados |
| 10 | **Risco nutricional e diagnóstico** | Select risco, input diagnóstico preenchidos |
| 11 | **Submissão com dados mínimos** | AJ + CB preenchidos → "Registar avaliação (adultos)" → redireciona sem erro |
| 12 | **Campos ocultos enviados** | Após submissão, registo no histórico contém PE, Altura, IMC (verificar via UI do prontuário) |

#### Suite: `Avaliação Adulto — validações de borda`

| # | Teste |
|---|---|
| 13 | % amputação 0 → mesmo resultado que sem amputação |
| 14 | Peso real preenchido (opcional) → campo aceita valor e não bloqueia |
| 15 | Campos CP e notas clínicas preenchidos → submetem sem erro |

---

### 2.3 Avaliação do Idoso (Geriátrica)

**Arquivo:** `e2e/auth-avaliacao-idoso.spec.ts`

#### Suite: `Avaliação Idoso — preenchimento e cálculos`

| # | Teste | O que valida |
|---|---|---|
| 1 | **Navega até o formulário** | Tab "Idoso" visível; paciente ≥ 60 anos |
| 2 | **Grupo e idade obrigatórios para altura** | AJ=50 sem idade → Altura "–"; com Idade=80 → valor |
| 3 | **Fórmula de PE geriátrica difere da adulta** | Mesmo AJ+CB → PE diferente do adulto (Chumlea 1988 vs 1985) |
| 4 | **CMB calculado** | CB=25, DCT=8 → `22,49 cm` (mesma fórmula) |
| 5 | **IMC calculado** | PE + Altura → CalcBox IMC ≠ "–" |
| 6 | **Amputação em idoso** | Checkbox + % → PE e IMC corrigidos corretamente |
| 7 | **Prescrição energético-proteica** | Kcal=30, PTN=1,2 → NE e NP calculados |
| 8 | **Risco nutricional e diagnóstico nutricional** | Select + input preenchidos |
| 9 | **Submissão com dados mínimos** | AJ + CB + Idade → "Registar avaliação" → redireciona sem erro |
| 10 | **Avaliação aparece no histórico** | Seção geriátrica do prontuário exibe o registo criado |

#### Suite: `Avaliação Idoso — diferenciação de fórmulas por grupo`

| # | Teste |
|---|---|
| 11 | Trocar grupo de "Mulher Branca" para "Homem Branco" → PE e Altura mudam |
| 12 | Grupo "Mulher Negra" → fórmula de PE correta (`AJ×1,50 + CB×2,58 − 84,22`) |
| 13 | Grupo "Homem Negro" → fórmula de PE correta (`AJ×0,44 + CB×2,86 − 39,21`) |

---

## Parte 3 — Testes de Visibilidade de Abas (Playwright)

**Arquivo:** `e2e/auth-avaliacao-tabs.spec.ts`

| # | Teste | Pré-condição |
|---|---|---|
| 1 | Paciente criança (< 18a) → só aba "Infantil" visível | Paciente com `birth_date` < 18a |
| 2 | Paciente adulto (18–59a) → só aba "Adulto" visível | Paciente com `birth_date` 18–59a |
| 3 | Paciente idoso (≥ 60a) → só aba "Idoso" visível | Paciente com `birth_date` ≥ 60a |
| 4 | Paciente sem data de nascimento → todas as abas visíveis | Paciente sem `birth_date` |

---

## Parte 4 — Page Objects recomendados

Para evitar repetição de seletores nos specs E2E, criar helpers em `e2e/helpers/`:

```
e2e/
  helpers/
    auth.ts          — login(), logout()
    screenshot.ts    — shot()
    assessment/
      child.ts       — ChildAssessmentPage (fillProfile, fillMeasurements, submit…)
      adult.ts       — AdultAssessmentPage
      geriatric.ts   — GeriatricAssessmentPage
```

Exemplo de uso:
```ts
const form = new ChildAssessmentPage(page);
await form.fillProfile({ sex: "female", birthDate: "2019-03-15" });
await form.fillMeasurements({ weight: "22", height: "120" });
await form.expectIMC("15,3");
await form.submit();
```

---

## Parte 5 — Variáveis de ambiente necessárias

Adicionar ao `.env.test.local` (não commitar):

```env
E2E_EMAIL=nutricionista@teste.com
E2E_PASSWORD=senha_segura

# IDs de pacientes de teste existentes no banco
E2E_PATIENT_CHILD_ID=uuid-do-paciente-crianca
E2E_PATIENT_ADULT_ID=uuid-do-paciente-adulto
E2E_PATIENT_GERIATRIC_ID=uuid-do-paciente-idoso
E2E_PATIENT_NO_DOB_ID=uuid-do-paciente-sem-data-nascimento
```

---

## Ordem de implementação sugerida

```
1. [Unit]  lib/nutrition/geriatric-anthropometry.ts + .test.ts
2. [Unit]  lib/nutrition/amputation.test.ts
3. [Unit]  lib/nutrition/cmb.test.ts
4. [Unit]  lib/pacientes/age-category.test.ts
5. [Unit]  Casos adicionais em child/assess.test.ts
6. [E2E]   e2e/helpers/ (auth, screenshot, page objects)
7. [E2E]   e2e/auth-avaliacao-infantil.spec.ts
8. [E2E]   e2e/auth-avaliacao-adulto.spec.ts
9. [E2E]   e2e/auth-avaliacao-idoso.spec.ts
10. [E2E]  e2e/auth-avaliacao-tabs.spec.ts
```

---

## Critérios de aceite globais

- Todos os testes unitários passam em `npm run test` sem variáveis de ambiente.
- Os testes E2E passam com `E2E_EMAIL`/`E2E_PASSWORD` definidos; são **skipped** automaticamente quando ausentes.
- Nenhum teste falha em CI na branch `main` após merge.
- Screenshots de falha são salvas em `test-results/`.
- Cobertura unitária das fórmulas de cálculo: 100% de branches nas funções `calcPeBase`, `calcAlturaBase`, `correcaoAmputacao`, `calcCMB`.
