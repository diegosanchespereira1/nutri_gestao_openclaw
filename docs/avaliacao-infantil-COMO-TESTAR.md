# Como testar a Avaliação Nutricional Infantil

Tudo o que foi implementado e como validar. Plano completo em
`docs/avaliacao-infantil-plano.md`.

## 1. Testes unitários (não precisa de banco)

```bash
npm test lib/nutrition/child
```

Esperado: **5 arquivos / 50 testes verdes**. Cobrem cálculo de idade,
interpolação de percentil, resolução de tabela, classificação (fronteiras
P3/P85/P97) e o orquestrador `assessChild`.

Suíte completa do projeto (confirma que nada quebrou):

```bash
npm test            # 34 arquivos / 198 testes
```

## 2. Aplicar a migração do banco

Arquivo: `supabase/migrations/20260613150000_patient_child_assessments.sql`
(cria a tabela `patient_child_assessments` com RLS multi-tenant).

```bash
# ambiente local Supabase
supabase migration up
# ou, conforme o fluxo do projeto
supabase db push
```

> A política de RLS usa `workspace_account_owner_id()` (mesma das demais
> avaliações), garantindo isolamento por tenant e suporte a paciente
> independente (sem cliente).

## 3. Testar na interface

```bash
npm run dev
```

1. Abra um paciente que tenha **data de nascimento de criança/adolescente**
   (< 19 anos) e **sexo** preenchido. Se não tiver, edite o paciente primeiro.
2. Clique em **Realizar avaliação** → aba **Avaliação Infantil**
   (a aba aparece automaticamente para menores).
3. Sexo e data de nascimento já vêm preenchidos; ajuste peso e estatura.
4. O **resultado aparece em tempo real**: cartões de semáforo (verde/amarelo/
   vermelho) por indicador + curva de crescimento com o ponto da criança.
5. Clique em **Registar avaliação**. Volte ao prontuário → aba **Avaliação
   Infantil**: a avaliação aparece no histórico e, a partir de 2 registos, no
   gráfico de **evolução** (percentil por indicador ao longo do tempo).

### Caso de teste de referência (confere os números do documento)

Menina, **7 anos** (nascida há 7 anos), **22 kg**, **120 cm**:

| Indicador | Esperado |
|---|---|
| IMC para idade | IMC ≈ 15,3 kg/m² → **IMC adequado ou eutrófico** (verde), ≈ P52 |
| Peso para idade | **Peso adequado ou eutrófico** (verde), ≈ P88 |
| Estatura para idade | **Estatura adequada para a idade** (verde), ≈ P98 |

> Rótulos e pontos de corte seguem o "Procedimento de Avaliação Nutricional"
> (Saber Nutrir): IMC → Baixo IMC para idade / IMC adequado ou eutrófico /
> Sobrepeso (≥P85) / Obesidade (≥P97).

### Recursos adicionais do procedimento

- **Dicas de medição**: ícone de informação (ⓘ) ao lado de Peso e Estatura, com
  o passo a passo de como aferir (balança, posição na parede, etc.).
- **Lembrete semestral**: o prontuário mostra a próxima coleta recomendada
  (6 meses após a última) e sinaliza atraso.
- **Peso/Estatura (P/E)**: indicador previsto no procedimento, **pronto como
  encaixe** — aparece automaticamente quando a tabela OMS de peso-por-estatura
  for carregada em `lib/nutrition/child/reference-data/weight-for-height/`.

Outros para experimentar os semáforos:
- Peso alto para a idade → IMC acima de P97 → **Obesidade** (vermelho).
- Peso baixo → abaixo de P3 → **Magreza** (amarelo).

## 4. Critério percentil x escore-Z

O seletor "Critério de classificação" oferece **Percentil** (ativo) e
**Escore-Z** (desabilitado, "referência ainda não carregada"). Para ativar o
escore-Z no futuro, basta popular `lib/nutrition/child/reference-data/zscore/`
(ver README nesse diretório) — nenhuma outra mudança é necessária.

## 5. Regenerar os datasets de referência (se trocar os PDFs)

```bash
pip install pdfplumber
python3 scripts/reference/build_child_growth_tables.py
```

Regenera os arquivos em `lib/nutrition/child/reference-data/percentile/` a
partir dos PDFs em `docs/referencias_avaliacao/` e atualiza o `SOURCES.md`
(checksum + contagem de linhas).

## Arquivos principais criados

- Dados: `scripts/reference/build_child_growth_tables.py`,
  `lib/nutrition/child/reference-data/`
- Motor (puro, testado): `lib/nutrition/child/{percentile,age,reference,classify,assess}.ts`
- Persistência: migração + `lib/types/child-assessments.ts` +
  `lib/actions/child-assessments.ts`
- UI: `components/pacientes/child-assessment-*.tsx` +
  integração na aba "Avaliação Infantil"
